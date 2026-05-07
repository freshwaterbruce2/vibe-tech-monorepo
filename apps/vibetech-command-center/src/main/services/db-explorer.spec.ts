import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, statSync, readdirSync, Dirent } from 'node:fs';
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

function createMockStmt(opts: {
  all?: unknown[];
  get?: unknown;
  columns?: Array<{ name: string }>;
  rawAll?: unknown[][];
}) {
  const rawStmt = {
    all: vi.fn().mockReturnValue(opts.rawAll ?? [])
  };
  return {
    all: vi.fn().mockReturnValue(opts.all ?? []),
    get: vi.fn().mockReturnValue(opts.get ?? {}),
    raw: vi.fn().mockReturnValue(rawStmt),
    columns: vi.fn().mockReturnValue(opts.columns ?? [])
  };
}

function makeDirent(name: string, isFile = true): Dirent {
  return {
    name,
    isFile: () => isFile,
    isDirectory: () => !isFile
  } as Dirent;
}

describe('DbExplorerService', () => {
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

    vi.mocked(readdirSync).mockImplementation(() => []);

    vi.mocked(loadDatabaseTargets).mockReturnValue([]);
  });

  async function makeService() {
    const { DbExplorerService } = await import('./db-explorer');
    return new DbExplorerService({ allowedRoots });
  }

  describe('listDatabases', () => {
    it('returns databases from inventory when inventory exists', async () => {
      existingPaths.add('D:\\databases\\memory.db');
      pathStats.set('D:\\databases\\memory.db', { size: 1024, mtimeMs: 1_700_000_000_000 });

      vi.mocked(loadDatabaseTargets).mockReturnValue([
        { name: 'memory.db', path: 'D:\\databases\\memory.db' }
      ]);

      const svc = await makeService();
      const result = await svc.listDatabases();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'memory.db',
        path: 'D:\\databases\\memory.db',
        sizeBytes: 1024,
        walSizeBytes: 0,
        lastModifiedAt: 1_700_000_000_000,
        tables: []
      });
    });

    it('skips inventory entries outside allowedRoots', async () => {
      vi.mocked(loadDatabaseTargets).mockReturnValue([
        { name: 'bad.db', path: 'E:\\secret\\bad.db' }
      ]);

      const svc = await makeService();
      const result = await svc.listDatabases();
      expect(result).toHaveLength(0);
    });

    it('falls back to scanning allowedRoots for db files', async () => {
      existingPaths.add('D:\\databases');
      existingPaths.add('D:\\databases\\app.db');
      pathStats.set('D:\\databases\\app.db', { size: 2048, mtimeMs: 1_700_000_000_001 });

      (readdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if (String(p) === 'D:\\databases') {
          return [makeDirent('app.db'), makeDirent('notes.txt'), makeDirent('data.sqlite')];
        }
        return [];
      });

      const svc = await makeService();
      const result = await svc.listDatabases();

      const names = result.map((r) => r.name);
      expect(names).toContain('app.db');
      expect(names).toContain('data.sqlite');
      expect(names).not.toContain('notes.txt');
    });

    it('computes walSizeBytes when wal file exists', async () => {
      existingPaths.add('D:\\databases\\memory.db');
      existingPaths.add('D:\\databases\\memory.db-wal');
      pathStats.set('D:\\databases\\memory.db', { size: 4096, mtimeMs: 1 });
      pathStats.set('D:\\databases\\memory.db-wal', { size: 512, mtimeMs: 1 });

      vi.mocked(loadDatabaseTargets).mockReturnValue([
        { name: 'memory.db', path: 'D:\\databases\\memory.db' }
      ]);

      const svc = await makeService();
      const result = await svc.listDatabases();

      expect(result[0]!.walSizeBytes).toBe(512);
      expect(result[0]!.sizeBytes).toBe(4096);
    });

    it('sorts results by name', async () => {
      existingPaths.add('D:\\databases');
      existingPaths.add('D:\\databases\\zebra.db');
      existingPaths.add('D:\\databases\\alpha.db');
      pathStats.set('D:\\databases\\zebra.db', { size: 1, mtimeMs: 1 });
      pathStats.set('D:\\databases\\alpha.db', { size: 1, mtimeMs: 1 });

      (readdirSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((p: unknown) => {
        if (String(p) === 'D:\\databases') {
          return [makeDirent('zebra.db'), makeDirent('alpha.db')];
        }
        return [];
      });

      const svc = await makeService();
      const result = await svc.listDatabases();
      expect(result.map((r) => r.name)).toEqual(['alpha.db', 'zebra.db']);
    });
  });

  describe('getSchema', () => {
    function setupDbPath() {
      existingPaths.add('D:\\databases\\test.db');
      pathStats.set('D:\\databases\\test.db', { size: 1, mtimeMs: 1 });
    }

    it('returns correct table list for a valid DB path', async () => {
      setupDbPath();
      dbMockState.prepareQueue.push(createMockStmt({
        all: [{ name: 'users' }, { name: 'orders' }]
      }));

      const svc = await makeService();
      const result = await svc.getSchema('D:\\databases\\test.db');

      expect(result.map((r) => r.name)).toEqual(['users', 'orders']);
    });

    it('returns columns with correct types, notNull, defaultValue', async () => {
      setupDbPath();
      dbMockState.prepareQueue.push(
        createMockStmt({ all: [{ name: 'users' }] }),
        createMockStmt({
          all: [
            { name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null },
            { name: 'name', type: 'TEXT', notnull: 0, dflt_value: 'anon' }
          ]
        }),
        createMockStmt({ get: { c: 42 } }),
        createMockStmt({ get: { s: 8192 } })
      );

      const svc = await makeService();
      const result = await svc.getSchema('D:\\databases\\test.db');

      expect(result[0]!.columns).toEqual([
        { name: 'id', type: 'INTEGER', notNull: true, defaultValue: null },
        { name: 'name', type: 'TEXT', notNull: false, defaultValue: 'anon' }
      ]);
    });

    it('returns row counts per table', async () => {
      setupDbPath();
      dbMockState.prepareQueue.push(
        createMockStmt({ all: [{ name: 'users' }] }),
        createMockStmt({ all: [] }),
        createMockStmt({ get: { c: 99 } }),
        createMockStmt({ get: { s: 1 } })
      );

      const svc = await makeService();
      const result = await svc.getSchema('D:\\databases\\test.db');
      expect(result[0]!.rowCount).toBe(99);
    });

    it('handles missing dbstat gracefully (returns null estimatedSize)', async () => {
      setupDbPath();
      dbMockState.prepareQueue.push(
        createMockStmt({ all: [{ name: 'users' }] }),
        createMockStmt({ all: [] }),
        createMockStmt({ get: { c: 0 } }),
        {
          all: vi.fn(),
          get: vi.fn().mockImplementation(() => { throw new Error('no such table: dbstat'); }),
          raw: vi.fn(),
          columns: vi.fn()
        }
      );

      const svc = await makeService();
      const result = await svc.getSchema('D:\\databases\\test.db');
      expect(result[0]!.estimatedSizeBytes).toBeNull();
    });

    it('throws for paths outside allowedRoots', async () => {
      const svc = await makeService();
      await expect(svc.getSchema('E:\\secret\\bad.db')).rejects.toThrow('outside allowed roots');
    });

    it('throws for sibling paths that only share an allowed root prefix', async () => {
      existingPaths.add('D:\\databases-archive\\test.db');
      const svc = await makeService();
      await expect(svc.getSchema('D:\\databases-archive\\test.db')).rejects.toThrow('outside allowed roots');
    });

    it('throws when database file is missing', async () => {
      const svc = await makeService();
      await expect(svc.getSchema('D:\\databases\\missing.db')).rejects.toThrow('file not found');
    });
  });
});
