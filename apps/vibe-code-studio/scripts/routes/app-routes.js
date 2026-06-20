/**
 * Auth + billing HTTP routes for the Vibe Code Studio companion backend.
 *
 * Extracted from backend-server.js (size cap) with NO behavior change. Each
 * handler matches a single route; `routeAppRequest` dispatches and returns true
 * when it handled the request so the server can fall through to other routes.
 */
import bcryptjs from 'bcryptjs';
import {
  verifyPassword,
  hashPassword,
  createSessionToken,
  parseSessionToken,
  getSessionCookieName,
} from '@vibetech/auth';
import {
  buildCheckoutSession,
  resolveStripeWebhookEvent,
  getStripeClient,
} from '@vibetech/billing';
import { parseCookies, serializeCookie, readJsonBody } from '../lib/http-helpers.js';

const WEEK_SECONDS = 60 * 60 * 24 * 7;

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

/** Attach a fresh week-long session cookie for the given user. */
function setSessionCookie(res, authUser) {
  const token = createSessionToken(authUser);
  res.setHeader(
    'Set-Cookie',
    serializeCookie(getSessionCookieName(), token, {
      path: '/',
      httpOnly: true,
      maxAge: WEEK_SECONDS,
      sameSite: 'lax',
    })
  );
}

/** Resolve the active plan from Stripe state, falling back to the user's tier. */
function resolvePlan(db, email, fallbackTier) {
  const subRow = db
    .prepare(
      `SELECT s.plan FROM stripe_subscriptions s
       JOIN stripe_customers c ON s.customer_id = c.id
       WHERE c.email = ? AND s.status IN ('active', 'trialing')
       ORDER BY s.updated_at DESC LIMIT 1`
    )
    .get(email);
  return subRow ? subRow.plan : (fallbackTier || 'free');
}

/** Verify a password against either legacy bcrypt or scrypt storage. */
async function verifyUserPassword(userRow, password) {
  const isBuffer = Buffer.isBuffer(userRow.password_hash);
  const isBcrypt =
    !isBuffer &&
    typeof userRow.password_hash === 'string' &&
    userRow.password_hash.startsWith('$2b$');

  if (isBcrypt) {
    return bcryptjs.compareSync(password, userRow.password_hash);
  }
  if (userRow.password_salt) {
    return verifyPassword(
      password,
      Buffer.from(userRow.password_salt),
      Buffer.from(userRow.password_hash)
    );
  }
  return false;
}

async function handleRegister(req, res, ctx) {
  const body = await readJsonBody(ctx.getBody, res);
  if (!body) return;

  const { email, password, fullName, companyName } = body;
  if (!email || !password) {
    sendJson(res, 400, { error: 'Email and password are required' });
    return;
  }

  try {
    const existingUser = ctx.db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
    if (existingUser) {
      sendJson(res, 400, { error: 'User with this email already exists' });
      return;
    }

    const { salt, hash } = await hashPassword(password);
    const result = ctx.db.prepare(`
      INSERT INTO users (email, password_hash, password_salt, full_name, company_name, subscription_tier)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email.trim().toLowerCase(), hash, salt, fullName || '', companyName || '', 'free');

    const authUser = {
      id: String(result.lastInsertRowid),
      email: email.trim().toLowerCase(),
      fullName: fullName || undefined,
      companyName: companyName || undefined,
    };
    setSessionCookie(res, authUser);
    sendJson(res, 200, { ok: true, user: { ...authUser, plan: 'free' } });
  } catch (err) {
    console.error('[Backend] Registration error:', err);
    sendJson(res, 500, { error: 'Internal server error', details: err.message });
  }
}

async function handleLogin(req, res, ctx) {
  const body = await readJsonBody(ctx.getBody, res);
  if (!body) return;

  const { email, password } = body;
  if (!email || !password) {
    sendJson(res, 400, { error: 'Email and password are required' });
    return;
  }

  try {
    const userRow = ctx.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!userRow || !(await verifyUserPassword(userRow, password))) {
      sendJson(res, 401, { error: 'Invalid email or password' });
      return;
    }

    const authUser = {
      id: String(userRow.id),
      email: userRow.email,
      fullName: userRow.full_name || undefined,
      companyName: userRow.company_name || undefined,
    };
    setSessionCookie(res, authUser);
    const plan = resolvePlan(ctx.db, email, userRow.subscription_tier);
    sendJson(res, 200, { ok: true, user: { ...authUser, plan } });
  } catch (err) {
    console.error('[Backend] Login error:', err);
    sendJson(res, 500, { error: 'Internal server error', details: err.message });
  }
}

function handleMe(req, res, ctx) {
  const token = parseCookies(req.headers.cookie)[getSessionCookieName()];
  const respondUnconfigured = () =>
    sendJson(res, 200, { ok: true, configured: false, user: null });

  if (!token) {
    respondUnconfigured();
    return;
  }

  try {
    const parsed = parseSessionToken(token);
    if (!parsed || !parsed.sub) {
      respondUnconfigured();
      return;
    }

    const userRow = ctx.db.prepare('SELECT * FROM users WHERE id = ?').get(parsed.sub);
    if (!userRow) {
      respondUnconfigured();
      return;
    }

    const plan = resolvePlan(ctx.db, userRow.email, userRow.subscription_tier);
    sendJson(res, 200, {
      ok: true,
      configured: true,
      user: {
        id: String(userRow.id),
        email: userRow.email,
        fullName: userRow.full_name || undefined,
        companyName: userRow.company_name || undefined,
        plan,
      },
    });
  } catch (err) {
    console.error('[Backend] Me error:', err);
    sendJson(res, 500, { error: 'Internal server error', details: err.message });
  }
}

function handleLogout(req, res) {
  res.setHeader(
    'Set-Cookie',
    serializeCookie(getSessionCookieName(), '', { path: '/', httpOnly: true, maxAge: -1 })
  );
  sendJson(res, 200, { ok: true });
}

async function handleCheckout(req, res, ctx) {
  const token = parseCookies(req.headers.cookie)[getSessionCookieName()];
  if (!token) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  try {
    const parsed = parseSessionToken(token);
    if (!parsed || !parsed.sub) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    const userRow = ctx.db.prepare('SELECT * FROM users WHERE id = ?').get(parsed.sub);
    if (!userRow) {
      sendJson(res, 401, { error: 'User not found' });
      return;
    }

    const customerRow = ctx.db
      .prepare('SELECT id FROM stripe_customers WHERE user_id = ?')
      .get(userRow.id);
    const existingCustomerId = customerRow ? customerRow.id : undefined;
    const baseUrl = req.headers.referer
      ? new URL(req.headers.referer).origin
      : 'http://localhost:5174';

    const session = await buildCheckoutSession({
      currency: 'USD',
      successUrl: `${baseUrl}/#billing/success`,
      cancelUrl: `${baseUrl}/#billing/canceled`,
      customerId: existingCustomerId,
      customerEmail: existingCustomerId ? undefined : userRow.email,
      metadata: {
        app: 'vibe-code-studio',
        plan: 'pro',
        userId: String(userRow.id),
        userEmail: userRow.email,
      },
      lineItems: [{ name: 'Vibe Code Studio Pro', unitAmount: 19, quantity: 1 }],
    });
    sendJson(res, 200, { ok: true, url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Backend] Checkout error:', err);
    sendJson(res, 500, { error: 'Stripe checkout configuration error', details: err.message });
  }
}

async function handleStripeWebhook(req, res, ctx) {
  const rawBody = await ctx.getBody();
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = resolveStripeWebhookEvent({
      rawBody: Buffer.from(rawBody),
      signature,
      secret: webhookSecret,
      stripeClient: getStripeClient(),
      allowUnsigned: !webhookSecret,
    });
  } catch (err) {
    console.error('[Backend] Webhook verification failed:', err);
    sendJson(res, 400, { error: 'Webhook signature verification failed', details: err.message });
    return;
  }

  try {
    const result = await ctx.stripeWebhookBus.dispatch(event);
    sendJson(res, 200, { ok: true, handled: result.handled, skipped: result.skipped });
  } catch (err) {
    console.error('[Backend] Webhook processing failed:', err);
    sendJson(res, 500, { error: 'Webhook processing failed', details: err.message });
  }
}

/**
 * Dispatch auth/billing/webhook routes. Returns true if the request matched a
 * route and a response was sent; false otherwise (caller tries other routes).
 * ctx supplies { db, getBody, stripeWebhookBus }.
 */
export async function routeAppRequest(req, res, pathname, ctx) {
  const post = req.method === 'POST';
  const get = req.method === 'GET';

  if (pathname === '/api/auth/register' && post) {
    await handleRegister(req, res, ctx);
    return true;
  }
  if (pathname === '/api/auth/login' && post) {
    await handleLogin(req, res, ctx);
    return true;
  }
  if (pathname === '/api/auth/me' && get) {
    handleMe(req, res, ctx);
    return true;
  }
  if (pathname === '/api/auth/logout' && post) {
    handleLogout(req, res);
    return true;
  }
  if (pathname === '/api/billing/checkout' && post) {
    await handleCheckout(req, res, ctx);
    return true;
  }
  if (pathname === '/api/webhooks/stripe' && post) {
    await handleStripeWebhook(req, res, ctx);
    return true;
  }
  return false;
}
