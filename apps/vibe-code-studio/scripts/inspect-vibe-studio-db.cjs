/* eslint-disable no-console */
// Inspect Vibe Code Studio SQLite database.
// Usage: node inspect-vibe-studio-db.cjs [--db PATH] [--verify] [--sessions]

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DB = 'D:\\databases\\vibe_studio.db';

function loadSqlite() {
  try {
    return require('better-sqlite3');
  } catch {
    return require('sqlite3');
  }
}

function parseArgs(argv) {
  const args = { db: DEFAULT_DB, verify: false, sessions: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--db' && i + 1 < argv.length) {
      args.db = argv[++i];
    } else if (arg === '--verify') {
      args.verify = true;
    } else if (arg === '--sessions') {
      args.sessions = true;
    } else if (arg.startsWith('--db=')) {
      args.db = arg.slice(5);
    }
  }
  return args;
}

function openDatabase(Database, dbPath) {
  if (Database.name === 'Database' || Database.prototype?.constructor?.name === 'Database') {
    return new Database(dbPath, { readonly: true, fileMustExist: true });
  }
  // sqlite3 fallback (not expected; script is read-only oriented)
  throw new Error('sqlite3 fallback is not supported by this script');
}

function fmtMB(p) {
  try {
    return (fs.statSync(p).size / (1024 * 1024)).toFixed(2);
  } catch {
    return '0.00';
  }
}

function listObjects(db) {
  return db
    .prepare(
      `SELECT name, type FROM sqlite_master
       WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
       ORDER BY type, name`
    )
    .all();
}

function countRows(db, tableName) {
  try {
    return db.prepare(`SELECT COUNT(*) c FROM "${tableName}"`).get().c;
  } catch (e) {
    return `ERR:${e.message}`;
  }
}

function printInventory(dbPath, db) {
  const sizeMB = fmtMB(dbPath);
  const walMB = fmtMB(`${dbPath}-wal`);
  const objs = listObjects(db);
  const tables = objs.filter((o) => o.type === 'table');
  const views = objs.filter((o) => o.type === 'view');

  console.log(`FILE: ${dbPath}  size=${sizeMB}MB  wal=${walMB}MB`);
  console.log(`OBJECTS: ${objs.length} (tables=${tables.length}, views=${views.length})`);
  console.log('---TABLES (name | type | rows)---');
  for (const o of objs) {
    const count = o.type === 'table' ? countRows(db, o.name) : null;
    console.log(`${o.name}\t${o.type}\t${count === null ? '' : count}`);
  }
}

function printSample(db, tableName, limit) {
  const sql = db
    .prepare(`SELECT sql FROM sqlite_master WHERE name = ?`)
    .get(tableName);
  console.log(`\n---${tableName} schema---`);
  console.log(sql ? sql.sql : `(no ${tableName} table)`);

  if (!sql) return;
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all().map((c) => c.name);
  console.log(`${tableName} columns: ${cols.join(', ')}`);
  try {
    const rows = db.prepare(`SELECT * FROM "${tableName}" LIMIT ?`).all(limit);
    console.log(`${tableName} sample (${rows.length}):`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.log(`${tableName} sample err: ${e.message}`);
  }
}

function printVerify(db) {
  console.log('\n---verify---');
  console.log(`integrity_check : ${db.pragma('integrity_check', { simple: true })}`);
  const fk = db.pragma('foreign_key_check');
  console.log(`foreign_key_check: ${JSON.stringify(fk)}`);
  console.log(`journal_mode    : ${db.pragma('journal_mode', { simple: true })}`);
}

function printSessions(db) {
  console.log('\n---sessions diagnostics---');
  const users = safeQuery(db, 'SELECT id, email, created_at FROM users ORDER BY id');
  console.log('users:');
  console.log(JSON.stringify(users, null, 2));

  const sessions = safeQuery(
    db,
    `SELECT id, user_id, substr(token,1,8) token_prefix, expires_at, created_at
     FROM sessions ORDER BY created_at DESC LIMIT 5`
  );
  console.log('recent sessions:');
  console.log(JSON.stringify(sessions, null, 2));

  const cols = safeQuery(db, 'PRAGMA table_info(sessions)').map((r) => r.name);
  console.log(`sessions columns: ${cols.join(', ')}`);
}

function safeQuery(db, sql) {
  try {
    return db.prepare(sql).all();
  } catch (e) {
    return `ERR:${e.message}`;
  }
}

function main() {
  const args = parseArgs(process.argv);
  const dbPath = path.resolve(args.db);
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    process.exit(1);
  }

  const Database = loadSqlite();
  const db = openDatabase(Database, dbPath);

  try {
    printInventory(dbPath, db);
    printSample(db, 'users', 4);
    printSample(db, 'sessions', 3);
    if (args.verify) printVerify(db);
    if (args.sessions) printSessions(db);
  } finally {
    db.close();
  }
}

main();
