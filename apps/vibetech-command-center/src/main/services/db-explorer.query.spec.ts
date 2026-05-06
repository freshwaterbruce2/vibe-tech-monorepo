import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { loadDatabaseTargets } from './database-inventory';

vi.mock('node:fs');
vi.mock('./database-inventory');

const dbMockState = vi.hoisted(() => ({
  mockDbInstances: [] as Array<{
    pragma: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  }>,
  prepareQueue: [] as Array<{
    all?: () => unknown[];
    get?: () => unknown;
    raw?: () => { all: () => unknown[][] };
    columns?: () => Array<{ name: string }>;
  }>,
  prepareThrows: null as Error | null
}));

vi.mock('better-sqlite3', () => ({
  default: vi.fn().mockImplementation(() => {
    const instance = {
      pragma: vi.fn(),
      prepare: vi.fn().mockImplementation(() => {
        if (dbMockState.prepareThrows) throw dbMockState.prepareThrows;
        const stmt = dbMockState.prepareQueue.shift();
        if (stmt) return stmt;
        return {
          all: () => [],
          get: () => ({}),
          raw: () => ({ all: () => [] }),
          columns: () => []
        };
      }),
      close: vi.fn()
    };
    dbMockState.mockDbInstances.push(instance);
    return instance;
  })
}));

describe('DbExplorerService > runQuery', () => {
  let allowedRoots: string[];
  let existingPaths: Set<string>;
  let pathStats: Map<string, { size: number; mtimeMs: number }>;

  beforeEach(() => {
    vi.clearAllMocks();
    dbMockState.mockDbInstances.length = 0;
    dbMockState.prepareQueue.length = 0;
    dbMockState.prepareThrows = null;
    allowedRoots = ['D:\\databases', 'C:\\dev'];
    existingPaths = new Set();
    pathStats = new Map();

    vi.mocked(existsSync).mockImplementation((p: string | Buffer | URL) =>
      existingPaths.has(String(p))
    );

    vi.mocked(statSync).mockImplementation((p: string | Buffer | URL) => {
      const stats = pathStats.get(String(p)) ?? { size: 0, mtimeMs: 0 };
      return stats as ReturnType<typeof statSync>;
    });

    vi.mocked(loadDatabaseTargets).mockReturnValue([]);
  });

  async function makeService() {
    const { DbExplorerService } = await import('./db-explorer');
    return new DbExplorerService({ allowedRoots });
  }

  function setupDbPath() {
    existingPaths.add('D:\\databases\\test.db');
    pathStats.set('D:\\databases\\test.db', { size: 1, mtimeMs: 1 });
  }

  function mockQuery(rows: unknown[][], columns: Array<{ name: string }> = [{ name: 'col' }]) {
    const rawStmt = { all: vi.fn().mockReturnValue(rows) };
    const stmt = {
      raw: vi.fn().mockReturnValue(rawStmt),
      columns: vi.fn().mockReturnValue(columns)
    };
    dbMockState.prepareQueue.push(stmt);
    return { stmt, rawStmt };
  }

  it('accepts valid SELECT statements and returns results', async () => {
    setupDbPath();
    mockQuery([[1], [2]], [{ name: 'id' }]);

    const svc = await makeService();
    const result = await svc.runQuery('D:\\databases\\test.db', 'SELECT id FROM users');

    expect(result.columns).toEqual(['id']);
    expect(result.rows).toEqual([[1], [2]]);
    expect(result.rowCount).toBe(2);
    expect(result.truncated).toBe(false);
    expect(result.executionMs).toBeGreaterThanOrEqual(0);
  });

  it('accepts valid WITH statements', async () => {
    setupDbPath();
    mockQuery([[42]], [{ name: 'n' }]);

    const svc = await makeService();
    const result = await svc.runQuery('D:\\databases\\test.db', 'WITH t AS (SELECT 1) SELECT * FROM t');
    expect(result.rowCount).toBe(1);
  });

  it.each([
    'INSERT INTO users VALUES (1)',
    'UPDATE users SET x = 1',
    'DELETE FROM users',
    'DROP TABLE users',
    'ALTER TABLE users ADD COLUMN x INT',
    'CREATE TABLE users (id INT)',
    'TRUNCATE TABLE users',
    "ATTACH DATABASE 'foo.db' AS foo",
    'DETACH DATABASE foo',
    'PRAGMA foreign_keys'
  ])('rejects forbidden statement: %s', async (sql) => {
    setupDbPath();
    const svc = await makeService();
    await expect(svc.runQuery('D:\\databases\\test.db', sql)).rejects.toThrow();
  });

  it('rejects mixed statements containing forbidden keywords', async () => {
    setupDbPath();
    const svc = await makeService();
    await expect(
      svc.runQuery('D:\\databases\\test.db', 'SELECT * FROM users; DROP TABLE users')
    ).rejects.toThrow('forbidden keywords');
  });

  it('enforces 1,000-row cap and sets truncated: true', async () => {
    setupDbPath();
    const rows = Array.from({ length: 1_001 }, (_, i) => [i]);
    mockQuery(rows, [{ name: 'id' }]);

    const svc = await makeService();
    const result = await svc.runQuery('D:\\databases\\test.db', 'SELECT id FROM nums');

    expect(result.rows).toHaveLength(1_000);
    expect(result.rowCount).toBe(1_000);
    expect(result.truncated).toBe(true);
  });

  it('wraps user SQL in an outer LIMIT before execution', async () => {
    setupDbPath();
    mockQuery([[1]], [{ name: 'id' }]);

    const svc = await makeService();
    await svc.runQuery('D:\\databases\\test.db', 'SELECT id FROM nums ORDER BY id DESC;');

    expect(dbMockState.mockDbInstances[0]!.prepare).toHaveBeenCalledWith(
      'SELECT * FROM (SELECT id FROM nums ORDER BY id DESC) AS command_center_query_limit LIMIT 1001'
    );
  });

  it('does not truncate when under the cap', async () => {
    setupDbPath();
    const rows = Array.from({ length: 500 }, (_, i) => [i]);
    mockQuery(rows, [{ name: 'id' }]);

    const svc = await makeService();
    const result = await svc.runQuery('D:\\databases\\test.db', 'SELECT id FROM nums');

    expect(result.rows).toHaveLength(500);
    expect(result.truncated).toBe(false);
  });

  it('rejects multiple read statements', async () => {
    setupDbPath();
    const svc = await makeService();
    await expect(
      svc.runQuery('D:\\databases\\test.db', 'SELECT id FROM users; SELECT id FROM teams')
    ).rejects.toThrow('Only one SELECT or WITH query is allowed');
  });

  it('rejects sibling paths that only share an allowed root prefix', async () => {
    existingPaths.add('D:\\databases-old\\test.db');
    const svc = await makeService();
    await expect(
      svc.runQuery('D:\\databases-old\\test.db', 'SELECT 1')
    ).rejects.toThrow('outside allowed roots');
  });

  it('throws for invalid path', async () => {
    const svc = await makeService();
    await expect(svc.runQuery('E:\\bad.db', 'SELECT 1')).rejects.toThrow('outside allowed roots');
  });

  it('throws for missing file', async () => {
    const svc = await makeService();
    await expect(svc.runQuery('D:\\databases\\gone.db', 'SELECT 1')).rejects.toThrow('file not found');
  });

  it('throws for malformed SQL', async () => {
    setupDbPath();
    dbMockState.prepareThrows = new Error('syntax error');

    const svc = await makeService();
    await expect(
      svc.runQuery('D:\\databases\\test.db', 'SELECT * FROM')
    ).rejects.toThrow('syntax error');
  });
});
