import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import Database from 'better-sqlite3';

import { handleLspUpgrade } from './routes/lsp-relay.js';
import { resolveServer } from './lib/lsp-servers.js';

// Load env variables from .env files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPaths = [
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env'),
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

// A packaged desktop app must never fall back to a source-known signing key.
// Generate a process-local secret when none was supplied. Existing sessions
// intentionally expire when the sidecar restarts; users can sign in again.
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
  process.env.AUTH_SECRET = crypto.randomBytes(48).toString('base64url');
  console.warn('[Backend] AUTH_SECRET was not configured; generated an ephemeral local secret.');
}
import { parseSessionToken, getSessionCookieName } from '@vibetech/auth';
import { parseCookies } from './lib/http-helpers.js';
import { createWebhookBus } from './lib/stripe-bus.js';
import { routeAppRequest } from './routes/app-routes.js';
import { registerAiProxyRoutes } from './routes/ai-proxy.js';

const PORT = 5004;
// App-specific override ONLY — deliberately NOT the generic DATABASE_PATH, which other
// monorepo apps set (a stray value would split state from the Tauri side, src-tauri/src/db.rs).
// Unset => canonical default. Mirrors get_db_path() in db.rs.
const DB_PATH = process.env.VCS_DATABASE_PATH || 'D:\\databases\\vibe_studio.db';

// -----------------------------------------------------------------------------
// Database Initialization (Safe, WAL mode, non-destructive)
// -----------------------------------------------------------------------------
let db;
try {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  // Safely seed custom tables. The `users` table backs auth/register/auto-login
  // and is owned by this app (integer id + subscription_tier). Historically it
  // was assumed to pre-exist; create it here so a fresh D:\databases DB works on
  // first launch. password_hash/salt are scrypt BLOBs (see @vibetech/auth).
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      email             TEXT NOT NULL UNIQUE,
      password_hash     BLOB NOT NULL,
      password_salt     BLOB NOT NULL,
      full_name         TEXT,
      company_name      TEXT,
      subscription_tier TEXT NOT NULL DEFAULT 'free',
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

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

const stripeWebhookBus = createWebhookBus(db);

// -----------------------------------------------------------------------------
// CORS (credentialed; restricted to local origins)
// -----------------------------------------------------------------------------
// The /api/ai/* proxy is auth-gated by a session cookie, so reflecting an
// arbitrary Origin while allowing credentials would let any website a signed-in
// user visits drive key-injected AI calls (CSRF that bills the operator's keys).
// Allow only the Tauri webview + localhost dev origins; external sites are denied.
function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (url.protocol === 'tauri:') return true;
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === 'tauri.localhost'
    );
  } catch {
    return false;
  }
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowOrigin = isAllowedOrigin(origin) ? origin : 'http://localhost:5174';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-plan');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

// -----------------------------------------------------------------------------
// Combined HTTP + WS Server
// -----------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const getBody = () =>
    new Promise(resolve => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => resolve(body));
    });

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Auth / billing / webhook routes (register, login, me, logout, checkout, stripe).
  if (await routeAppRequest(req, res, pathname, { db, getBody, stripeWebhookBus })) {
    return;
  }

  // AI proxy (server-side key custody; auth-gated). Keys live in backend .env,
  // never in the client bundle. See scripts/routes/ai-proxy.js.
  if (pathname.startsWith('/api/ai/')) {
    try {
      await registerAiProxyRoutes(req, res, {
        db,
        parseCookies,
        getSessionCookieName,
        parseSessionToken,
        getBody,
      });
    } catch (err) {
      console.error('[ai-proxy] request failed:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AI proxy internal error' }));
      } else if (!res.writableEnded) {
        res.destroy();
      }
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

wss.on('connection', ws => {
  console.log('[Backend] ✅ Client connected');

  ws.on('message', message => {
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

  ws.on('error', err => {
    console.error('[Backend] Client connection error:', err);
  });
});

// Resolve LSP server commands to absolute paths on PATH so Windows `.cmd`
// shims (pnpm/npm global installs) become spawnable (spec 07 gotcha).
const lspResolveOpts = {
  paths: (process.env.PATH || '').split(path.delimiter).filter(Boolean),
  exts: process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''],
  exists: p => fs.existsSync(p),
  // Installed builds must never optimistically spawn a command that PATH
  // scanning already proved absent. The editor then falls back to Monaco.
  requireResolved: true,
  sep: path.sep,
};

server.on('upgrade', (request, socket, head) => {
  const pathname = (request.url || '').split('?')[0];
  if (!isAllowedOrigin(request.headers.origin)) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  if (pathname.startsWith('/lsp/')) {
    handleLspUpgrade(request, socket, head, {
      wss,
      spawn,
      resolveServer: languageId => resolveServer(languageId, lspResolveOpts),
      isAllowedOrigin,
    });
    return;
  }
  if (pathname !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n[Backend] 🚀 Local Backend Server running on 127.0.0.1:${PORT}`);
  console.log('[Backend] Waiting for Vibe Code Studio to connect...\n');
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[Backend] ⚠️ Error: Port ${PORT} is already in use.`);
    console.error('[Backend] Is another instance or the real Nova Agent already running?');
  } else {
    console.error('[Backend] Server error:', error);
  }
});
