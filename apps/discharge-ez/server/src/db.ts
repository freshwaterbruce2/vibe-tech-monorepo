import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

// ─── DB path ──────────────────────────────────────────────────────────────────

const DB_PATH =
  process.env.DISCHARGE_EZ_DB_PATH ??
  path.join(process.env.DATA_DIR ?? 'D:\\databases', 'discharge_ez.db');

// Ensure the directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS stripe_customers (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES stripe_customers(id),
    status TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'pro',
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionRow {
  id: string;
  customer_id: string;
  status: string;
  plan: string;
  current_period_end: string | null;
  cancel_at_period_end: number;
  updated_at: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

const stmts = {
  upsertCustomer: db.prepare<[string, string]>(
    `INSERT OR REPLACE INTO stripe_customers (id, email) VALUES (?, ?)`,
  ),
  upsertSubscription: db.prepare<[string, string, string, string, string | null, number]>(
    `INSERT OR REPLACE INTO stripe_subscriptions
       (id, customer_id, status, plan, current_period_end, cancel_at_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
  ),
  updateSubscriptionStatus: db.prepare<[string, string | null, number, string]>(
    `UPDATE stripe_subscriptions
     SET status = ?, current_period_end = ?, cancel_at_period_end = ?, updated_at = datetime('now')
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
  hasProcessedEvent: db.prepare<[string]>(
    `SELECT 1 FROM stripe_events WHERE id = ? LIMIT 1`,
  ),
  markEventProcessed: db.prepare<[string, string]>(
    `INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)`,
  ),
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function upsertCustomer(customerId: string, email: string) {
  stmts.upsertCustomer.run(customerId, email);
}

export function upsertSubscription(
  subscriptionId: string,
  customerId: string,
  status: string,
  plan: string,
  periodEnd: string | null,
  cancelAtPeriodEnd: boolean,
) {
  stmts.upsertSubscription.run(subscriptionId, customerId, status, plan, periodEnd, cancelAtPeriodEnd ? 1 : 0);
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
