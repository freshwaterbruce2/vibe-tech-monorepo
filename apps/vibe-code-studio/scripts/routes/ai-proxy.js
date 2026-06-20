/**
 * AI proxy routes - server-side key custody for Vibe Code Studio.
 *
 * Keeps provider API keys on the SERVER (never in the client bundle) and gates
 * every call behind an authenticated session. The renderer points each provider
 * at /api/ai/<provider>/... with NO Authorization header; this proxy injects the
 * server key and forwards the request verbatim (transparent passthrough), so the
 * renderer keeps full control of model ids and request format.
 *
 * Admin use works today via the operator's keys in the backend .env. Per-user /
 * paid access plugs in at the subscription gate marked below (the backend already
 * tracks Stripe subscriptions in stripe_subscriptions).
 */

import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

// Each upstream resolves its key from the first matching env var. Operators set
// keys under different names (e.g. Kimi/Moonshot ships as KIMI_API_KEY), so we
// accept the common aliases instead of a single hard-coded name.
const UPSTREAM = {
  moonshot: {
    base: 'https://api.moonshot.ai',
    envKeys: ['MOONSHOT_API_KEY', 'KIMI_API_KEY', 'VITE_MOONSHOT_API_KEY', 'VITE_KIMI_API_KEY'],
  },
  google: {
    base: 'https://generativelanguage.googleapis.com',
    envKeys: ['GOOGLE_API_KEY', 'GEMINI_API_KEY', 'VITE_GOOGLE_API_KEY'],
  },
  openrouter: {
    base: 'https://openrouter.ai',
    envKeys: ['OPENROUTER_API_KEY', 'VITE_OPENROUTER_API_KEY'],
  },
};

/** First non-empty value among an upstream's candidate env var names. */
function resolveUpstreamKey(cfg) {
  for (const name of cfg.envKeys) {
    const val = process.env[name];
    if (val && val.trim()) return val.trim();
  }
  return undefined;
}

function sendJson(res, status, payload) {
  // Never write a second time after a streamed/early response already flushed —
  // a double writeHead throws ERR_HTTP_HEADERS_SENT inside the request handler.
  if (res.headersSent || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function getSessionUser(req, ctx) {
  const token = ctx.parseCookies(req.headers.cookie)[ctx.getSessionCookieName()];
  if (!token) return null;
  try {
    const parsed = ctx.parseSessionToken(token);
    if (!parsed || !parsed.sub) return null;
    // Confirm the user still exists before authorizing AI spend (mirrors the
    // sibling /api routes). A signed-but-stale token for a deleted user is rejected.
    const row = ctx.db.prepare('SELECT id FROM users WHERE id = ?').get(parsed.sub);
    return row ? parsed : null;
  } catch {
    return null;
  }
}

/** Pipe an SSE upstream response to the client with backpressure + abort. */
async function pipeEventStream(res, upstreamRes, signal) {
  res.writeHead(upstreamRes.status, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  // pipeline() honors backpressure (awaits 'drain' instead of buffering the
  // whole upstream in memory) and tears the upstream down if the client closes.
  await pipeline(Readable.fromWeb(upstreamRes.body), res, { signal });
}

/**
 * Inject the server key and forward the request to the upstream provider,
 * streaming SSE responses through unchanged. Keeps registerAiProxyRoutes small.
 */
async function forwardToUpstream(req, res, { targetUrl, provider, apiKey, getBody }) {
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await getBody();
  }

  // Abort the upstream request when the client hangs up mid-flight (e.g. the user
  // cancels a generation). Otherwise the upstream keeps streaming — and billing —
  // tokens to a dead socket, and the next write throws.
  const ac = new AbortController();
  const onClientClose = () => {
    if (!res.writableEnded) ac.abort();
  };
  if (typeof res.on === 'function') res.on('close', onClientClose);

  try {
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(provider === 'openrouter'
          ? { 'HTTP-Referer': 'https://vibetech.app', 'X-Title': 'Vibe Code Studio' }
          : {}),
      },
      body: body || undefined,
      signal: ac.signal,
    });

    const contentType = upstreamRes.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream') && upstreamRes.body) {
      await pipeEventStream(res, upstreamRes, ac.signal);
      return;
    }

    const text = await upstreamRes.text();
    if (!res.headersSent) {
      res.writeHead(upstreamRes.status, { 'Content-Type': contentType || 'application/json' });
    }
    res.end(text);
  } catch (err) {
    // Client disconnect / abort: the socket is already gone — don't try to write
    // a JSON error on top of flushed stream headers (that would throw again).
    if (ac.signal.aborted || res.headersSent || res.writableEnded) {
      if (!res.writableEnded && typeof res.destroy === 'function') res.destroy();
      return;
    }
    sendJson(res, 502, {
      error: 'Upstream AI request failed',
      details: String((err && err.message) || err),
    });
  } finally {
    if (typeof res.removeListener === 'function') res.removeListener('close', onClientClose);
  }
}

/**
 * Handle any /api/ai/* request. ctx supplies { db, parseCookies,
 * getSessionCookieName, parseSessionToken, getBody } from the host server.
 */
export async function registerAiProxyRoutes(req, res, ctx) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const segments = url.pathname.split('/').filter(Boolean); // [api, ai, <provider>, ...rest]
  const provider = segments[2];

  // Health: which providers have a server key configured (no auth required).
  if (url.pathname === '/api/ai/health' && req.method === 'GET') {
    const configured = {};
    for (const [name, cfg] of Object.entries(UPSTREAM)) {
      configured[name] = Boolean(resolveUpstreamKey(cfg));
    }
    sendJson(res, 200, { ok: true, configured });
    return;
  }

  const upstream = UPSTREAM[provider];
  if (!upstream) {
    sendJson(res, 404, { error: `Unknown AI provider "${provider ?? ''}"` });
    return;
  }

  // Auth gate - every AI call requires a valid session.
  const user = getSessionUser(req, ctx);
  if (!user) {
    sendJson(res, 401, { error: 'Unauthorized. Sign in to use AI.' });
    return;
  }

  const apiKey = resolveUpstreamKey(upstream);
  if (!apiKey) {
    sendJson(res, 503, {
      error: `AI provider "${provider}" is not configured on the server.`,
      hint: `Set one of [${upstream.envKeys.join(', ')}] in the backend environment/.env.`,
    });
    return;
  }

  // --- Subscription gate seam (per-user / paid model) ----------------------
  // Admins (operator keys) pass through. Paying users get checked here:
  //   const sub = ctx.db.prepare(`SELECT s.plan FROM stripe_subscriptions s
  //     JOIN stripe_customers c ON s.customer_id = c.id
  //     WHERE c.user_id = ? AND s.status IN ('active','trialing')`).get(user.sub);
  //   if (!user.isAdmin && (!sub || sub.plan === 'free')) {
  //     sendJson(res, 402, { error: 'Subscription required for AI access.' }); return;
  //   }
  // ------------------------------------------------------------------------

  // Rebuild the upstream path: drop the '/api/ai/<provider>' prefix.
  const rest = `/${segments.slice(3).join('/')}`;
  const targetUrl = upstream.base + rest + url.search;
  await forwardToUpstream(req, res, { targetUrl, provider, apiKey, getBody: ctx.getBody });
}
