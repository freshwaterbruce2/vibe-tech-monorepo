import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface FakeDbSnapshot {
  journalMode: string;
  pageCount: number;
  pageSize: number;
  tables: Record<string, number>;
}

const { fakeDatabases } = vi.hoisted(() => ({
  fakeDatabases: new Map<string, FakeDbSnapshot>(),
}));

vi.mock('better-sqlite3', () => ({
  default: class MockDatabase {
    private readonly snapshot: FakeDbSnapshot;

    constructor(path: string) {
      const snapshot = fakeDatabases.get(path);
      if (!snapshot) {
        throw new Error(`no fake database seeded for ${path}`);
      }
      this.snapshot = snapshot;
    }

    pragma(query: string, options?: { simple?: boolean }): number | string | undefined {
      if (query === 'query_only = ON') {
        return undefined;
      }
      if (query === 'page_count' && options?.simple) {
        return this.snapshot.pageCount;
      }
      if (query === 'page_size' && options?.simple) {
        return this.snapshot.pageSize;
      }
      if (query === 'journal_mode' && options?.simple) {
        return this.snapshot.journalMode;
      }
      return undefined;
    }

    prepare(sql: string): { all: () => Array<{ name: string }>; get: () => { c: number } } {
      if (sql.includes("FROM sqlite_master")) {
        return {
          all: () => Object.keys(this.snapshot.tables).map((name) => ({ name })),
          get: () => ({ c: 0 }),
        };
      }

      const match = sql.match(/FROM "((?:[^"]|"")+)"/);
      const rawName = match?.[1]?.replace(/""/g, '"');
      const rowCount = rawName ? this.snapshot.tables[rawName] : undefined;
      if (rowCount === undefined) {
        throw new Error(`unknown fake table for query: ${sql}`);
      }

      return {
        all: () => [],
        get: () => ({ c: rowCount }),
      };
    }

    close(): void {}
  },
}));

import { DbMetricsService } from './db-metrics';

function seedFakeDb(path: string, snapshot: FakeDbSnapshot): void {
  fakeDatabases.set(path, snapshot);
  writeFileSync(path, 'fake-db');
}

describe('DbMetricsService', () => {
  let tmpRoot: string;
  let dbPath: string;

  beforeEach(() => {
    fakeDatabases.clear();
    tmpRoot = mkdtempSync(join(tmpdir(), 'cc-dbm-'));
    dbPath = join(tmpRoot, 'test.db');
    seedFakeDb(dbPath, {
      journalMode: 'wal',
      pageCount: 7,
      pageSize: 4096,
      tables: {
        users: 3,
        logs: 2,
      },
    });
  });

  afterEach(() => {
    fakeDatabases.clear();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('collects size, page info, and per-table row counts', async () => {
    const svc = new DbMetricsService({ targets: [{ name: 'test', path: dbPath }] });
    const [metric] = await svc.collectAll();

    expect(metric?.error).toBeUndefined();
    expect(metric?.sizeBytes).toBeGreaterThan(0);
    expect(metric?.pageCount).toBe(7);
    expect(metric?.pageSize).toBe(4096);
    expect(metric?.journalMode.toLowerCase()).toBe('wal');

    const users = metric?.tables.find((t) => t.name === 'users');
    const logs = metric?.tables.find((t) => t.name === 'logs');
    expect(users?.rowCount).toBe(3);
    expect(logs?.rowCount).toBe(2);
  });

  it('returns error metric for missing file', async () => {
    const svc = new DbMetricsService({
      targets: [{ name: 'ghost', path: join(tmpRoot, 'does-not-exist.db') }],
    });
    const [metric] = await svc.collectAll();
    expect(metric?.error).toBe('file not found');
    expect(metric?.sizeBytes).toBe(0);
  });

  it('does not write to the database (read-only enforcement)', async () => {
    const before = JSON.stringify(fakeDatabases.get(dbPath));
    const svc = new DbMetricsService({ targets: [{ name: 'test', path: dbPath }] });
    await svc.collectAll();
    const after = JSON.stringify(fakeDatabases.get(dbPath));

    expect(after).toBe(before);
  });

  it('handles a table with a quoted identifier', async () => {
    const weirdPath = join(tmpRoot, 'weird.db');
    seedFakeDb(weirdPath, {
      journalMode: 'delete',
      pageCount: 3,
      pageSize: 4096,
      tables: {
        'odd name': 2,
      },
    });

    const svc = new DbMetricsService({ targets: [{ name: 'weird', path: weirdPath }] });
    const [metric] = await svc.collectAll();
    const odd = metric?.tables.find((t) => t.name === 'odd name');
    expect(odd?.rowCount).toBe(2);
  });
});
