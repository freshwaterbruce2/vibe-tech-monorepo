import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { DbMetricsService } from './db-metrics';

describe('DbMetricsService', () => {
  let tmpRoot: string;
  let dbPath: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-dbm-'));
    dbPath = join(tmpRoot, 'test.db');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
      CREATE TABLE logs (id INTEGER PRIMARY KEY, msg TEXT);
      INSERT INTO users (name) VALUES ('alice'), ('bob'), ('carol');
      INSERT INTO logs (msg) VALUES ('a'), ('b');
    `);
    db.close();
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('collects size, page info, and per-table row counts', async () => {
    const svc = new DbMetricsService({ targets: [{ name: 'test', path: dbPath }] });
    const [metric] = await svc.collectAll();

    expect(metric?.error).toBeUndefined();
    expect(metric?.sizeBytes).toBeGreaterThan(0);
    expect(metric?.pageCount).toBeGreaterThan(0);
    expect(metric?.pageSize).toBeGreaterThan(0);
    expect(metric?.journalMode.toLowerCase()).toBe('wal');

    const users = metric?.tables.find((t) => t.name === 'users');
    const logs = metric?.tables.find((t) => t.name === 'logs');
    expect(users?.rowCount).toBe(3);
    expect(logs?.rowCount).toBe(2);
  });

  it('returns error metric for missing file', async () => {
    const svc = new DbMetricsService({
      targets: [{ name: 'ghost', path: join(tmpRoot, 'does-not-exist.db') }]
    });
    const [metric] = await svc.collectAll();
    expect(metric?.error).toBe('file not found');
    expect(metric?.sizeBytes).toBe(0);
  });

  it('does not write to the database (read-only enforcement)', async () => {
    const svc = new DbMetricsService({ targets: [{ name: 'test', path: dbPath }] });
    await svc.collectAll();

    // Verify nothing changed
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
    db.close();
    expect(row.c).toBe(3);
  });

  it('handles a table with a quoted identifier', async () => {
    const weirdPath = join(tmpRoot, 'weird.db');
    const db = new Database(weirdPath);
    db.exec(`CREATE TABLE "odd name" (id INTEGER); INSERT INTO "odd name" VALUES (1),(2);`);
    db.close();

    const svc = new DbMetricsService({ targets: [{ name: 'weird', path: weirdPath }] });
    const [metric] = await svc.collectAll();
    const odd = metric?.tables.find((t) => t.name === 'odd name');
    expect(odd?.rowCount).toBe(2);
  });
});
