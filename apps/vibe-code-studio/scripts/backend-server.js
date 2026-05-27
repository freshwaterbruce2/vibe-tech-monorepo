import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';

// Load env variables from .env files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eq = trimmed.indexOf('=');
          const key = trimmed.slice(0, eq).trim();
          const val = trimmed.slice(eq + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    } catch (e) {
      console.error(`[Backend] Error loading ${envPath}:`, e);
    }
  }
}

// Fallback AUTH_SECRET if still missing or too short
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  process.env.AUTH_SECRET = 'default_vibe_studio_secret_32_chars_long';
}
import {
  getUserById,
  verifyPassword,
  hashPassword,
  createSessionToken,
  parseSessionToken,
  getSessionCookieName,
} from '@vibetech/auth';
import {
  createStripeWebhookBus,
  buildCheckoutSession,
  resolveStripeWebhookEvent,
  readStripeObjectId,
  deriveStripeSubscriptionMrr,
  getStripeClient,
} from '@vibetech/billing';

const PORT = 5004;
const DB_PATH = 'D:\\databases\\vibe_studio.db';

// -----------------------------------------------------------------------------
// Database Initialization (Safe, WAL mode, non-destructive)
// -----------------------------------------------------------------------------
let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Safely seed custom tables for Stripe billing integration
  db.exec(`
    CREATE TABLE IF NOT EXISTS stripe_customers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stripe_subscriptions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES stripe_customers(id),
      user_id TEXT,
      status TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'pro',
      currency TEXT NOT NULL DEFAULT 'usd',
      monthly_mrr_cents INTEGER NOT NULL DEFAULT 0,
      current_period_end TEXT,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS stripe_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      processed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  console.log(`[Backend] Connected to state database at ${DB_PATH} (WAL mode).`);
} catch (err) {
  console.error('[Backend] Fatal error initializing database:', err);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Cookie Helper Primitives
// -----------------------------------------------------------------------------
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

function serializeCookie(name, val, options = {}) {
  let str = `${name}=${encodeURIComponent(val)}`;
  if (options.maxAge != null) {
    str += `; Max-Age=${options.maxAge}`;
  }
  if (options.domain) str += `; Domain=${options.domain}`;
  if (options.path) str += `; Path=${options.path}`;
  if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
  if (options.httpOnly) str += '; HttpOnly';
  if (options.secure) str += '; Secure';
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}

// -----------------------------------------------------------------------------
// Stripe Webhook Bus Setup
// -----------------------------------------------------------------------------
const stripeWebhookBus = createStripeWebhookBus({
  hasProcessedEvent: (eventId) => {
    const row = db.prepare('SELECT 1 FROM stripe_events WHERE id = ? LIMIT 1').get(eventId);
    return !!row;
  },
  markEventProcessed: (event) => {
    db.prepare('INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)').run(event.id, event.type);
  },
  handlers: {
    'checkout.session.completed': async (event) => {
      const session = event.data.object;
      if (session.mode !== 'subscription' || !session.customer || !session.subscription) {
        return;
      }

      const customerId = readStripeObjectId(session.customer);
      const subscriptionId = readStripeObjectId(session.subscription);
      const email = session.customer_email || (session.customer_details && session.customer_details.email) || '';
      const userId = session.metadata ? session.metadata.userId : null;

      if (customerId && email) {
        db.prepare(`
          INSERT INTO stripe_customers (id, user_id, email)
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            user_id = COALESCE(excluded.user_id, stripe_customers.user_id),
            email = excluded.email
        `).run(customerId, userId, email.trim().toLowerCase());
      }

      if (subscriptionId) {
        try {
          const stripe = getStripeClient();
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          mirrorStripeSubscription(sub, customerId, userId, email);
        } catch (err) {
          console.error('[Backend] Failed to retrieve subscription details:', err);
        }
      }
    },
    'customer.subscription.created': (event) => {
      mirrorStripeSubscription(event.data.object);
    },
    'customer.subscription.updated': (event) => {
      mirrorStripeSubscription(event.data.object);
    },
    'customer.subscription.deleted': (event) => {
      const sub = event.data.object;
      db.prepare(`
        UPDATE stripe_subscriptions
        SET status = ?, current_period_end = ?, cancel_at_period_end = ?, monthly_mrr_cents = 0, updated_at = datetime('now')
        WHERE id = ?
      `).run('canceled', null, 0, sub.id);
    },
  },
});

function mirrorStripeSubscription(sub, fallbackCustomerId, fallbackUserId, fallbackEmail) {
  const customerId = readStripeObjectId(sub.customer) || fallbackCustomerId;
  const userId = (sub.metadata && sub.metadata.userId) || fallbackUserId || null;
  const email = (sub.metadata && sub.metadata.userEmail) || fallbackEmail || null;

  if (!customerId) return;

  if (email) {
    db.prepare(`
      INSERT INTO stripe_customers (id, user_id, email)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = COALESCE(excluded.user_id, stripe_customers.user_id),
        email = excluded.email
    `).run(customerId, userId, email.trim().toLowerCase());
  }

  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;
  const mrr = deriveStripeSubscriptionMrr(sub);

  db.prepare(`
    INSERT OR REPLACE INTO stripe_subscriptions
      (id, customer_id, user_id, status, plan, currency, monthly_mrr_cents, current_period_end, cancel_at_period_end, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    sub.id,
    customerId,
    userId,
    sub.status,
    (sub.metadata && sub.metadata.plan) || 'pro',
    mrr.currency,
    mrr.monthlyMrrCents,
    periodEnd,
    sub.cancel_at_period_end ? 1 : 0
  );
}

// -----------------------------------------------------------------------------
// Combined HTTP + WS Server
// -----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS Headers matching webview origin
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5174');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-plan');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const getBody = () =>
    new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => resolve(body));
    });

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1b. POST /api/auth/register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const bodyStr = await getBody();
    let body;
    try {
      body = JSON.parse(bodyStr);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    const { email, password, fullName, companyName } = body;
    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email and password are required' }));
      return;
    }

    try {
      const existingUser = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
      if (existingUser) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User with this email already exists' }));
        return;
      }

      // Hash the password using @vibetech/auth scrypt
      const { salt, hash } = await hashPassword(password);

      const result = db.prepare(`
        INSERT INTO users (email, password_hash, password_salt, full_name, company_name, subscription_tier)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        email.trim().toLowerCase(),
        hash,
        salt,
        fullName || '',
        companyName || '',
        'free'
      );

      const authUser = {
        id: String(result.lastInsertRowid),
        email: email.trim().toLowerCase(),
        fullName: fullName || undefined,
        companyName: companyName || undefined,
      };

      const token = createSessionToken(authUser);
      const cookieName = getSessionCookieName();

      res.setHeader(
        'Set-Cookie',
        serializeCookie(cookieName, token, {
          path: '/',
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 7, // 1 week
          sameSite: 'lax',
        })
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          user: { ...authUser, plan: 'free' },
        })
      );
    } catch (err) {
      console.error('[Backend] Registration error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', details: err.message }));
    }
    return;
  }

  // 1. POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const bodyStr = await getBody();
    let body;
    try {
      body = JSON.parse(bodyStr);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    const { email, password } = body;
    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email and password are required' }));
      return;
    }

    try {
      const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!userRow) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }

      let passwordValid = false;
      const isBuffer = Buffer.isBuffer(userRow.password_hash);
      const isBcrypt = !isBuffer && typeof userRow.password_hash === 'string' && userRow.password_hash.startsWith('$2b$');

      if (isBcrypt) {
        // Legacy bcrypt verification
        passwordValid = bcryptjs.compareSync(password, userRow.password_hash);
      } else if (userRow.password_salt) {
        // Scrypt verification
        passwordValid = await verifyPassword(
          password,
          Buffer.from(userRow.password_salt),
          Buffer.from(userRow.password_hash)
        );
      }

      if (!passwordValid) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }

      const authUser = {
        id: String(userRow.id),
        email: userRow.email,
        fullName: userRow.full_name || undefined,
        companyName: userRow.company_name || undefined,
      };

      const token = createSessionToken(authUser);
      const cookieName = getSessionCookieName();

      res.setHeader(
        'Set-Cookie',
        serializeCookie(cookieName, token, {
          path: '/',
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 7, // 1 week
          sameSite: 'lax',
        })
      );

      // Resolve plan status dynamically from active stripe subscription
      const subRow = db
        .prepare(
          `SELECT s.plan FROM stripe_subscriptions s
           JOIN stripe_customers c ON s.customer_id = c.id
           WHERE c.email = ? AND s.status IN ('active', 'trialing')
           ORDER BY s.updated_at DESC LIMIT 1`
        )
        .get(email);

      const subscriptionTier = subRow ? subRow.plan : (userRow.subscription_tier || 'free');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          user: { ...authUser, plan: subscriptionTier },
        })
      );
    } catch (err) {
      console.error('[Backend] Login error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', details: err.message }));
    }
    return;
  }

  // 2. GET /api/auth/me
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const cookieName = getSessionCookieName();
    const token = cookies[cookieName];

    if (!token) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, configured: false, user: null }));
      return;
    }

    try {
      const parsed = parseSessionToken(token);
      if (!parsed || !parsed.sub) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, configured: false, user: null }));
        return;
      }

      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(parsed.sub);
      if (!userRow) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, configured: false, user: null }));
        return;
      }

      const subRow = db
        .prepare(
          `SELECT s.plan FROM stripe_subscriptions s
           JOIN stripe_customers c ON s.customer_id = c.id
           WHERE c.email = ? AND s.status IN ('active', 'trialing')
           ORDER BY s.updated_at DESC LIMIT 1`
        )
        .get(userRow.email);

      const subscriptionTier = subRow ? subRow.plan : (userRow.subscription_tier || 'free');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          ok: true,
          configured: true,
          user: {
            id: String(userRow.id),
            email: userRow.email,
            fullName: userRow.full_name || undefined,
            companyName: userRow.company_name || undefined,
            plan: subscriptionTier,
          },
        })
      );
    } catch (err) {
      console.error('[Backend] Me error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', details: err.message }));
    }
    return;
  }

  // 3. POST /api/auth/logout
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const cookieName = getSessionCookieName();
    res.setHeader(
      'Set-Cookie',
      serializeCookie(cookieName, '', {
        path: '/',
        httpOnly: true,
        maxAge: -1,
      })
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 4. POST /api/billing/checkout
  if (pathname === '/api/billing/checkout' && req.method === 'POST') {
    const cookies = parseCookies(req.headers.cookie);
    const cookieName = getSessionCookieName();
    const token = cookies[cookieName];

    if (!token) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const parsed = parseSessionToken(token);
      if (!parsed || !parsed.sub) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(parsed.sub);
      if (!userRow) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }

      const customerRow = db.prepare('SELECT id FROM stripe_customers WHERE user_id = ?').get(userRow.id);
      const existingCustomerId = customerRow ? customerRow.id : undefined;

      const baseUrl = req.headers.referer ? new URL(req.headers.referer).origin : 'http://localhost:5174';
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
        lineItems: [
          {
            name: 'Vibe Code Studio Pro',
            unitAmount: 19, // $19.00
            quantity: 1,
          },
        ],
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, url: session.url, sessionId: session.id }));
    } catch (err) {
      console.error('[Backend] Checkout error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Stripe checkout configuration error', details: err.message }));
    }
    return;
  }

  // 5. POST /api/webhooks/stripe
  if (pathname === '/api/webhooks/stripe' && req.method === 'POST') {
    const rawBody = await getBody();
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
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Webhook signature verification failed', details: err.message }));
      return;
    }

    try {
      const result = await stripeWebhookBus.dispatch(event);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, handled: result.handled, skipped: result.skipped }));
    } catch (err) {
      console.error('[Backend] Webhook processing failed:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Webhook processing failed', details: err.message }));
    }
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// -----------------------------------------------------------------------------
// WebSocket Integration (Existing IPC logic)
// -----------------------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('[Backend] ✅ Client connected');

  ws.on('message', (message) => {
    try {
      const msgStr = message.toString();
      const parsed = JSON.parse(msgStr);
      console.log(`[Backend] 📩 Received: ${parsed.type}`);
    } catch (e) {
      console.log('[Backend] Received raw message (not JSON)');
    }
  });

  ws.on('close', () => {
    console.log('[Backend] ❌ Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[Backend] Client connection error:', err);
  });
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(PORT, () => {
  console.log(`\n[Backend] 🚀 Local Backend Server running on port ${PORT}`);
  console.log('[Backend] Waiting for Vibe Code Studio to connect...\n');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[Backend] ⚠️ Error: Port ${PORT} is already in use.`);
    console.error('[Backend] Is another instance or the real Nova Agent already running?');
  } else {
    console.error('[Backend] Server error:', error);
  }
});
