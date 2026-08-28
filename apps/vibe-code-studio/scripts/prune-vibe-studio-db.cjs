#!/usr/bin/env node
/**
 * prune-vibe-studio-db.cjs — Isolate D:\databases\vibe_studio.db to VCS-only tables.
 *
 * The shared DB was seeded from a multi-app hub: 83 tables + 11 views, only a
 * handful of which Vibe Code Studio actually owns. This drops the foreign tables
 * (agent telemetry, crypto/trading, figma/design, task/workflow orchestration,
 * system health/monitoring) and keeps the VCS-owned set (auth, billing, learning,
 * editor), then VACUUMs to reclaim the freed space.
 *
 * The KEEP set below was verified against the actual code that opens this file:
 *   - scripts/backend-server.js + scripts/routes/*  -> users, stripe_*
 *   - packages/auth (@vibetech/auth)                -> users (stateless cookie auth)
 *   - src-tauri/src/db.rs                           -> strategy_memory
 *   - src/services/* + src/migrations/*             -> strategy_memory, deepcode_*, code_snippets
 *
 * SAFETY
 *   - DRY-RUN by default; pass --apply to mutate.
 *   - --apply takes a fresh timestamped backup to D:\backups first.
 *   - foreign_keys are disabled during the drop; VACUUM reclaims space afterwards.
 *   - STOP the Node backend (port 5004) and the desktop app before --apply, or the
 *     write lock will block.
 *   - Hard-targets vibe_studio.db. It deliberately IGNORES the ambient DATABASE_PATH
 *     env var (which on this machine points at the generic shared database.db) so the
 *     prune can never hit the wrong file. Override only via the explicit --db= flag.
 *
 * Usage (PowerShell, from V:\monorepo):
 *   $env:NODE_PATH="V:\monorepo\node_modules"
 *   node apps\vibe-code-studio\scripts\prune-vibe-studio-db.cjs            # dry-run
 *   node apps\vibe-code-studio\scripts\prune-vibe-studio-db.cjs --apply    # mutate
 *   (append --db=D:\path\to\other.db to target a different file)
 */
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const dbArg = process.argv.find((a) => a.startsWith('--db='));
const DB_PATH = dbArg ? dbArg.slice('--db='.length) : 'D:\\databases\\vibe_studio.db';
const APPLY = process.argv.includes('--apply');

/** Plain stdout reporter — this is a developer CLI, so console output is the point. */
const out = (msg = '') => process.stdout.write(`${msg}\n`);

/** Tables Vibe Code Studio owns. Everything else is dropped. */
const KEEP = new Set([
  'users', // auth registry (@vibetech/auth)
  'sessions', // legacy DB-backed sessions; current auth is stateless cookies (kept for safety)
  'stripe_customers', // billing
  'stripe_subscriptions', // billing
  'stripe_events', // billing idempotency
  'strategy_memory', // active learning store (db.rs + StrategyMemory.ts + BrainScanPanel.tsx)
  'deepcode_strategy_memory', // legacy learning source (origin of the 29-row backfill)
  'deepcode_analytics', // legacy editor analytics
  'deepcode_chat_history', // legacy editor chat history
  'code_snippets', // editor snippet library (CodeSnippet type + VCS test)
]);

function rowCount(db, name) {
  try {
    return db.prepare(`SELECT COUNT(*) c FROM "${name}"`).get().c;
  } catch {
    return 'n/a';
  }
}

function timestamp() {
  // yyyymmdd_hhmmss in local time (plain Node script — Date is fine here).
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** Copy the DB (and any WAL/SHM sidecars) to a fresh timestamped backup. */
function backupDb(dbPath) {
  const backupDir = 'D:\\backups';
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `vibe_studio_prune_${timestamp()}.db`);
  fs.copyFileSync(dbPath, backup);
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(dbPath + ext)) fs.copyFileSync(dbPath + ext, backup + ext);
  }
  out(`[backup] ${backup}`);
}

/** Read the non-internal tables/views and split them into keep vs drop sets. */
function inspect(db) {
  const objs = db
    .prepare(
      `SELECT name, type FROM sqlite_master
       WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
       ORDER BY type, name`
    )
    .all();
  return {
    keepTables: objs.filter((o) => o.type === 'table' && KEEP.has(o.name)),
    dropTables: objs.filter((o) => o.type === 'table' && !KEEP.has(o.name)),
    dropViews: objs.filter((o) => o.type === 'view'),
    tableNames: new Set(objs.filter((o) => o.type === 'table').map((o) => o.name)),
  };
}

/** Print the keep/drop plan (shared by dry-run and apply). */
function printPlan(db, sizeMB, { keepTables, dropTables, dropViews, tableNames }) {
  out(`\nDB: ${DB_PATH}  (${sizeMB} MB)`);
  out(`mode: ${APPLY ? 'APPLY (mutating)' : 'DRY-RUN (no changes)'}`);

  out(`\nKEEP (${keepTables.length} tables):`);
  for (const t of keepTables) out(`  keep  ${t.name}  (${rowCount(db, t.name)} rows)`);

  out(`\nDROP (${dropTables.length} tables + ${dropViews.length} views):`);
  for (const t of dropTables) out(`  drop  ${t.name}  (${rowCount(db, t.name)} rows)`);
  for (const v of dropViews) out(`  drop  ${v.name}  (view)`);

  const missing = [...KEEP].filter((n) => !tableNames.has(n));
  if (missing.length) out(`\n[warn] KEEP tables not present: ${missing.join(', ')}`);
}

/** Drop the foreign objects and VACUUM to reclaim space. Mutates the DB. */
function applyPrune(db, dropTables, dropViews) {
  // PRAGMA foreign_keys must be set OUTSIDE a transaction to take effect.
  db.pragma('foreign_keys = OFF');
  const drop = db.transaction(() => {
    for (const v of dropViews) db.exec(`DROP VIEW IF EXISTS "${v.name}"`);
    for (const t of dropTables) db.exec(`DROP TABLE IF EXISTS "${t.name}"`);
  });
  drop();
  // In WAL mode VACUUM defers truncating the main .db to a checkpoint, so the file
  // stays large; switching to a rollback journal lets VACUUM truncate it directly.
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.pragma('journal_mode = DELETE');
  db.exec('VACUUM');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

/** Print the post-prune object list and size delta. */
function printResult(db, sizeBeforeMB, keepCount) {
  const after = db
    .prepare(
      `SELECT name, type FROM sqlite_master
       WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name`
    )
    .all();
  const afterMB = (fs.statSync(DB_PATH).size / 1048576).toFixed(2);
  out(`\n[done] objects remaining: ${after.length} (expected ${keepCount})`);
  for (const o of after) {
    const extra = o.type === 'table' ? `, ${rowCount(db, o.name)} rows` : '';
    out(`  - ${o.name} (${o.type}${extra})`);
  }
  out(`[done] size ${sizeBeforeMB} MB -> ${afterMB} MB`);
}

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`DB not found: ${DB_PATH}`);
    process.exit(1);
  }
  if (APPLY) backupDb(DB_PATH);

  const db = new Database(DB_PATH); // read-write
  db.pragma('busy_timeout = 5000');
  if (APPLY) db.pragma('wal_checkpoint(TRUNCATE)');

  const plan = inspect(db);
  const sizeMB = (fs.statSync(DB_PATH).size / 1048576).toFixed(2);
  printPlan(db, sizeMB, plan);

  if (!APPLY) {
    out(
      `\nDRY-RUN only — nothing changed. Re-run with --apply to drop ` +
        `${plan.dropTables.length} tables + ${plan.dropViews.length} views and VACUUM.`
    );
    db.close();
    return;
  }

  applyPrune(db, plan.dropTables, plan.dropViews);
  printResult(db, sizeMB, plan.keepTables.length);
  db.close();
}

main();
