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

import { spawn } from 'node:child_process';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { readJsonBody } from '../lib/http-helpers.js';

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

// Runtime key custody: keys pushed by the renderer (Settings -> save) live here,
// in memory only — never written to disk by the server. Restarts are re-synced
// by the app on boot. Takes precedence over env vars so the UI stays in control.
const runtimeKeys = Object.create(null);

/** Runtime-pushed key first, then the first non-empty candidate env var. */
function resolveUpstreamKey(cfg, providerName) {
  const pushed = providerName ? runtimeKeys[providerName] : undefined;
  if (pushed && pushed.trim()) return pushed.trim();
  for (const name of cfg.envKeys) {
    const val = process.env[name];
    if (val && val.trim()) return val.trim();
  }
  return undefined;
}

/** True when the request originates from this machine (the app's own webview). */
function isLoopbackRequest(req) {
  const addr = req.socket?.remoteAddress || '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
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
  if (!token) {
    console.log('[AIProxy] auth reject: no session cookie on request');
    return null;
  }
  try {
    const parsed = ctx.parseSessionToken(token);
    if (!parsed || !parsed.sub) {
      console.log(
        '[AIProxy] auth reject: session token invalid (bad signature or expired — sign out/in to mint a fresh one)'
      );
      return null;
    }
    // Confirm the user still exists before authorizing AI spend (mirrors the
    // sibling /api routes). A signed-but-stale token for a deleted user is rejected.
    const row = ctx.db.prepare('SELECT id FROM users WHERE id = ?').get(parsed.sub);
    if (!row) {
      console.log(`[AIProxy] auth reject: user ${parsed.sub} not found in DB`);
      return null;
    }
    return parsed;
  } catch (err) {
    console.log(`[AIProxy] auth reject: token parse threw: ${String(err)}`);
    return null;
  }
}

// --- Telemetry: persist model + token usage per AI call (best-effort) --------
// Strictly fire-and-forget. Telemetry can NEVER delay, alter, or break a response.

/** Resolve how to launch the Python telemetry entrypoint on this platform. */
function resolveTelemetryRunner() {
  const base = process.env.LEARNING_SYSTEM_PATH || 'D:\\learning-system';
  const scriptPath = path.join(base, 'record_ai_telemetry.py');
  const isWin = process.platform === 'win32';
  return { pythonCmd: isWin ? 'py' : 'python3', pythonArgs: isWin ? ['-3'] : [], scriptPath };
}

/** Spawn the Python telemetry recorder detached; swallow every failure. */
function recordAiTelemetry({ provider, model, tokensUsed, userSub }) {
  if (tokensUsed == null && !model) return; // nothing useful to record
  try {
    const { pythonCmd, pythonArgs, scriptPath } = resolveTelemetryRunner();
    const payload = JSON.stringify({
      provider: provider || 'unknown',
      model: model || null,
      tokensUsed: typeof tokensUsed === 'number' ? tokensUsed : null,
      userSub: userSub || null,
      success: true,
    });
    const child = spawn(pythonCmd, [...pythonArgs, scriptPath, payload], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.on('error', () => {}); // ENOENT (no python) etc. — never surface
    child.unref();
  } catch {
    /* telemetry must never affect the request */
  }
}

/** model id from the client request body (guarded; undefined on any failure). */
function parseRequestModel(body) {
  if (!body) return undefined;
  try {
    const obj = JSON.parse(typeof body === 'string' ? body : body.toString('utf8'));
    return obj && typeof obj.model === 'string' ? obj.model : undefined;
  } catch {
    return undefined;
  }
}

/** total token usage from a parsed completion/chunk object, or null. */
function extractUsage(obj) {
  const u = obj && obj.usage;
  if (!u || typeof u !== 'object') return null;
  if (typeof u.total_tokens === 'number') return u.total_tokens;
  const prompt = typeof u.prompt_tokens === 'number' ? u.prompt_tokens : 0;
  const completion = typeof u.completion_tokens === 'number' ? u.completion_tokens : 0;
  const sum = prompt + completion;
  return sum > 0 ? sum : null;
}

/** Fire telemetry from a non-streaming JSON response body (guarded). */
function recordFromNonStreaming(text, { provider, reqModel, userSub }) {
  let model = reqModel;
  let tokens = null;
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj.model === 'string') model = obj.model;
    tokens = extractUsage(obj);
  } catch {
    /* malformed/non-JSON body — degrade to model-only (or skip) */
  }
  recordAiTelemetry({ provider, model, tokensUsed: tokens, userSub });
}

/** Parse one SSE line into its JSON data object, or null (never throws). */
function parseSseData(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Pass-through Transform that re-emits bytes UNCHANGED while scanning the SSE
 * stream for the model and the final usage chunk. Any parse failure is ignored
 * so the tap can never corrupt or stall the passthrough. onDone fires at end.
 */
function makeSseUsageTap(onDone) {
  let buffer = '';
  let model;
  let tokens = null;
  return new Transform({
    transform(chunk, _enc, cb) {
      try {
        buffer += chunk.toString('utf8');
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const parsed = parseSseData(buffer.slice(0, idx));
          buffer = buffer.slice(idx + 1);
          if (parsed && typeof parsed.model === 'string') model = parsed.model;
          const usage = parsed && extractUsage(parsed);
          if (usage != null) tokens = usage;
        }
        if (buffer.length > 1_000_000) buffer = ''; // defensive: never grow unbounded
      } catch {
        /* scanning must never break the stream */
      }
      cb(null, chunk); // always forward the original bytes
    },
    flush(cb) {
      try {
        onDone(model, tokens);
      } catch {
        /* swallow */
      }
      cb();
    },
  });
}

/** Build the SSE usage tap that records telemetry once the stream ends. */
function streamTelemetryTap({ provider, reqModel, userSub }) {
  return makeSseUsageTap((model, tokens) =>
    recordAiTelemetry({ provider, model: model || reqModel, tokensUsed: tokens, userSub })
  );
}

/** Pipe an SSE upstream response to the client with backpressure + abort. */
async function pipeEventStream(res, upstreamRes, signal, tap) {
  res.writeHead(upstreamRes.status, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  // pipeline() honors backpressure (awaits 'drain' instead of buffering the
  // whole upstream in memory) and tears the upstream down if the client closes.
  const source = Readable.fromWeb(upstreamRes.body);
  if (tap) {
    await pipeline(source, tap, res, { signal });
  } else {
    await pipeline(source, res, { signal });
  }
}

/**
 * Inject the server key and forward the request to the upstream provider,
 * streaming SSE responses through unchanged. Keeps registerAiProxyRoutes small.
 */
async function forwardToUpstream(req, res, { targetUrl, provider, apiKey, getBody, userSub }) {
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await getBody();
  }
  const reqModel = parseRequestModel(body);

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
      const tap = streamTelemetryTap({ provider, reqModel, userSub });
      await pipeEventStream(res, upstreamRes, ac.signal, tap);
      return;
    }

    const text = await upstreamRes.text();
    if (!res.headersSent) {
      res.writeHead(upstreamRes.status, { 'Content-Type': contentType || 'application/json' });
    }
    res.end(text);
    if (upstreamRes.ok) recordFromNonStreaming(text, { provider, reqModel, userSub });
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
      configured[name] = Boolean(resolveUpstreamKey(cfg, name));
    }
    sendJson(res, 200, { ok: true, configured });
    return;
  }

  // Key custody: the renderer pushes provider keys saved in Settings so the
  // proxy can authenticate upstream. Loopback-only; keys stay in memory.
  // Body: { provider: 'openrouter'|'moonshot'|'google', key: string }
  // An empty key clears the runtime entry (env fallback still applies).
  if (url.pathname === '/api/ai/keys' && req.method === 'POST') {
    if (!isLoopbackRequest(req)) {
      sendJson(res, 403, { error: 'Key updates are only accepted from this machine.' });
      return;
    }
    const body = await readJsonBody(ctx.getBody, res);
    if (!body) return;
    const keyProvider = String(body?.provider ?? '').toLowerCase();
    if (!UPSTREAM[keyProvider]) {
      sendJson(res, 400, { error: `Unknown AI provider "${keyProvider}".` });
      return;
    }
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    if (key) {
      runtimeKeys[keyProvider] = key;
    } else {
      delete runtimeKeys[keyProvider];
    }
    const configured = {};
    for (const [name, cfg] of Object.entries(UPSTREAM)) {
      configured[name] = Boolean(resolveUpstreamKey(cfg, name));
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

  const apiKey = resolveUpstreamKey(upstream, provider);
  if (!apiKey) {
    sendJson(res, 503, {
      error: `AI provider "${provider}" is not configured on the server.`,
      hint: `Save an API key in Settings, or set one of [${upstream.envKeys.join(', ')}] in the backend environment/.env.`,
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
  await forwardToUpstream(req, res, {
    targetUrl,
    provider,
    apiKey,
    getBody: ctx.getBody,
    userSub: user.sub,
  });
}
