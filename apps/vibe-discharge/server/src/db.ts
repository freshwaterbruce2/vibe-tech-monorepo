import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// ─── DB path ──────────────────────────────────────────────────────────────────

const DB_PATH =
  process.env.DISCHARGE_EZ_DB_PATH ??
  path.join(process.env.DATA_DIR ?? 'D:\\databases', 'discharge_ez.db');

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    company_name TEXT,
    password_salt BLOB NOT NULL,
    password_hash BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stripe_customers (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES stripe_customers(id),
    user_id TEXT REFERENCES users(id),
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

ensureColumn('stripe_customers', 'user_id', 'TEXT REFERENCES users(id)');
ensureColumn('stripe_subscriptions', 'user_id', 'TEXT REFERENCES users(id)');
ensureColumn('stripe_subscriptions', 'currency', "TEXT NOT NULL DEFAULT 'usd'");
ensureColumn('stripe_subscriptions', 'monthly_mrr_cents', 'INTEGER NOT NULL DEFAULT 0');

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionRow {
  id: string;
  customer_id: string;
  user_id: string | null;
  status: string;
  plan: string;
  currency: string;
  monthly_mrr_cents: number;
  current_period_end: string | null;
  cancel_at_period_end: number;
  updated_at: string;
}

export interface UserCredentialsRow {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  password_salt: Buffer;
  password_hash: Buffer;
}

export interface MrrMetadata {
  mrrCents: number;
  currency: string;
  source: 'stripe-live' | 'sqlite';
  activeSubscriptions: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

const stmts = {
  countUsers: db.prepare<[], { count: number }>(`SELECT COUNT(*) AS count FROM users`),
  insertUser: db.prepare<[string, string, string | null, string | null, Buffer, Buffer]>(
    `INSERT INTO users (id, email, full_name, company_name, password_salt, password_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ),
  getUserCredentialsByEmail: db.prepare<[string]>(
    `SELECT id, email, full_name, company_name, password_salt, password_hash
     FROM users
     WHERE lower(email) = lower(?)
     LIMIT 1`,
  ),
  upsertCustomer: db.prepare<[string, string | null, string]>(
    `INSERT INTO stripe_customers (id, user_id, email)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = COALESCE(excluded.user_id, stripe_customers.user_id),
       email = excluded.email`,
  ),
  getCustomerForUser: db.prepare<[string]>(
    `SELECT id FROM stripe_customers
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
  ),
  upsertSubscription: db.prepare<
    [string, string, string | null, string, string, string, number, string | null, number]
  >(
    `INSERT OR REPLACE INTO stripe_subscriptions
       (id, customer_id, user_id, status, plan, currency, monthly_mrr_cents, current_period_end, cancel_at_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ),
  updateSubscriptionStatus: db.prepare<[string, string | null, number, string]>(
    `UPDATE stripe_subscriptions
     SET status = ?, current_period_end = ?, cancel_at_period_end = ?, monthly_mrr_cents = 0, updated_at = datetime('now')
     WHERE id = ?`,
  ),
  getSubscriptionByCustomer: db.prepare<[string]>(
    `SELECT * FROM stripe_subscriptions
     WHERE customer_id = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
  ),
  getSubscriptionByEmail: db.prepare<[string]>(
    `SELECT s.* FROM stripe_subscriptions s
     JOIN stripe_customers c ON s.customer_id = c.id
     WHERE c.email = ?
     ORDER BY s.updated_at DESC
     LIMIT 1`,
  ),
  getStoredMrrRows: db.prepare<[]>(
    `SELECT currency, COUNT(*) AS active_subscriptions, SUM(monthly_mrr_cents) AS mrr_cents
     FROM stripe_subscriptions
     WHERE status = 'active'
     GROUP BY currency
     ORDER BY mrr_cents DESC
     LIMIT 1`,
  ),
  hasProcessedEvent: db.prepare<[string]>(
    `SELECT 1 FROM stripe_events WHERE id = ? LIMIT 1`,
  ),
  markEventProcessed: db.prepare<[string, string]>(
    `INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)`,
  ),
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getDatabase(): Database.Database {
  return db;
}

export function closeDatabaseForTests(): void {
  db.close();
}

export function hasUsers(): boolean {
  const row = stmts.countUsers.get();
  return (row?.count ?? 0) > 0;
}

export function createUser(input: {
  id?: string;
  email: string;
  fullName?: string;
  companyName?: string;
  passwordSalt: Buffer;
  passwordHash: Buffer;
}): string {
  const id = input.id ?? crypto.randomUUID();
  stmts.insertUser.run(
    id,
    input.email.trim().toLowerCase(),
    input.fullName?.trim() || null,
    input.companyName?.trim() || null,
    input.passwordSalt,
    input.passwordHash,
  );
  return id;
}

export function getUserCredentialsByEmail(email: string): UserCredentialsRow | null {
  return (stmts.getUserCredentialsByEmail.get(email.trim().toLowerCase()) as
    | UserCredentialsRow
    | undefined) ?? null;
}

export function upsertCustomer(customerId: string, email: string, userId?: string | null) {
  stmts.upsertCustomer.run(customerId, userId ?? null, email.trim().toLowerCase());
}

export function getStripeCustomerIdForUser(userId: string): string | null {
  const row = stmts.getCustomerForUser.get(userId) as { id: string } | undefined;
  return row?.id ?? null;
}

export function upsertSubscription(
  subscriptionId: string,
  customerId: string,
  userId: string | null,
  status: string,
  plan: string,
  currency: string,
  monthlyMrrCents: number,
  periodEnd: string | null,
  cancelAtPeriodEnd: boolean,
) {
  stmts.upsertSubscription.run(
    subscriptionId,
    customerId,
    userId,
    status,
    plan,
    currency.toLowerCase(),
    Math.max(0, Math.round(monthlyMrrCents)),
    periodEnd,
    cancelAtPeriodEnd ? 1 : 0,
  );
}

export function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
  periodEnd: string | null,
  cancelAtPeriodEnd: boolean,
) {
  stmts.updateSubscriptionStatus.run(status, periodEnd, cancelAtPeriodEnd ? 1 : 0, subscriptionId);
}

export function getActiveSubscriptionForCustomer(customerId: string): SubscriptionRow | null {
  const row = stmts.getSubscriptionByCustomer.get(customerId) as SubscriptionRow | undefined;
  if (!row) return null;
  if (!['active', 'trialing'].includes(row.status)) return null;
  return row;
}

export function getActiveSubscriptionForEmail(email: string): SubscriptionRow | null {
  const row = stmts.getSubscriptionByEmail.get(email) as SubscriptionRow | undefined;
  if (!row) return null;
  if (!['active', 'trialing'].includes(row.status)) return null;
  return row;
}

export function hasProcessedEvent(eventId: string): boolean {
  return Boolean(stmts.hasProcessedEvent.get(eventId));
}

export function markEventProcessed(eventId: string, eventType: string) {
  stmts.markEventProcessed.run(eventId, eventType);
}

export function getStoredMrrMetadata(): MrrMetadata {
  const row = stmts.getStoredMrrRows.get() as
    | { currency: string | null; active_subscriptions: number | null; mrr_cents: number | null }
    | undefined;

  return {
    mrrCents: Math.max(0, Math.round(row?.mrr_cents ?? 0)),
    currency: row?.currency ?? 'usd',
    activeSubscriptions: Math.max(0, Math.round(row?.active_subscriptions ?? 0)),
    source: 'sqlite',
  };
}

function ensureColumn(table: string, column: string, definition: string): void {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (rows.some((row) => row.name === column)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
