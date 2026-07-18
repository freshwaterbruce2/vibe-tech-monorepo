import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createSessionToken, getSessionCookieName } from '@vibetech/auth';
import { routeAppRequest } from '../app-routes.js';

/**
 * Single-user desktop auto-login: GET /api/auth/me must always return a signed-in
 * user (provisioning a local account on an empty DB) so the editor opens without
 * a login screen. Regression guard for the "fresh install stuck on landing page"
 * gap.
 */
process.env.AUTH_SECRET = 'test_secret_at_least_32_chars_long_ok';

function makeUsersTable(db) {
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
    CREATE TABLE IF NOT EXISTS stripe_customers (id TEXT PRIMARY KEY, email TEXT);
    CREATE TABLE IF NOT EXISTS stripe_subscriptions (
      id TEXT PRIMARY KEY, customer_id TEXT, status TEXT, plan TEXT, updated_at TEXT
    );
  `);
}

/** Minimal mock ServerResponse capturing status/headers/body. */
function makeRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    writeHead(status) {
      this.statusCode = status;
    },
    end(payload) {
      this.body = payload ? JSON.parse(payload) : null;
    },
  };
}

function meReq(cookie) {
  return { method: 'GET', headers: cookie ? { cookie } : {} };
}

describe('GET /api/auth/me — single-user auto-login', () => {
  let db;

  beforeEach(() => {
    db = new Database(':memory:');
    makeUsersTable(db);
  });

  afterEach(() => {
    db.close();
  });

  it('provisions a local user on an empty DB and returns it configured', async () => {
    const res = makeRes();
    const handled = await routeAppRequest(meReq(), res, '/api/auth/me', { db });

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ ok: true, configured: true });
    expect(res.body.user.email).toBe('local@vibe.studio');
    expect(res.body.user.plan).toBe('free');
    // a fresh session cookie is set so subsequent calls carry the session
    expect(String(res.headers['set-cookie'])).toContain(getSessionCookieName());
    // exactly one user was created
    expect(db.prepare('SELECT COUNT(*) c FROM users').get().c).toBe(1);
  });

  it('reuses the existing user instead of creating another (idempotent)', async () => {
    await routeAppRequest(meReq(), makeRes(), '/api/auth/me', { db });
    await routeAppRequest(meReq(), makeRes(), '/api/auth/me', { db });
    expect(db.prepare('SELECT COUNT(*) c FROM users').get().c).toBe(1);
  });

  it('resolves the user from a valid session cookie', async () => {
    // seed a user directly, then present a matching session cookie
    const info = db
      .prepare(
        `INSERT INTO users (email, password_hash, password_salt, subscription_tier)
         VALUES (?, ?, ?, ?)`
      )
      .run('bruce@vibe.studio', Buffer.from('h'), Buffer.from('s'), 'free');
    const token = createSessionToken({
      id: String(info.lastInsertRowid),
      email: 'bruce@vibe.studio',
    });

    const res = makeRes();
    await routeAppRequest(meReq(`${getSessionCookieName()}=${token}`), res, '/api/auth/me', { db });

    expect(res.body.user.email).toBe('bruce@vibe.studio');
    // no new local user created — the cookie user was used
    expect(db.prepare('SELECT COUNT(*) c FROM users').get().c).toBe(1);
  });
});
