import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryVizService } from './memory-viz';

vi.mock('better-sqlite3', () => ({ default: vi.fn() }));
vi.mock('node:fs');

import Database from 'better-sqlite3';

function createMockDb(tables: Record<string, unknown[]> = {}) {
  const db = {
    pragma: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn((sql: string) => {
      const lower = sql.toLowerCase();

      let resultSet: unknown[] = [];
      if (lower.includes('from episodic_memory')) resultSet = tables['episodic_memory'] ?? [];
      else if (lower.includes('from semantic_memory')) resultSet = tables['semantic_memory'] ?? [];
      else if (lower.includes('from procedural_memory')) resultSet = tables['procedural_memory'] ?? [];
      else if (lower.includes('from consolidation_log')) resultSet = tables['consolidation_log'] ?? [];

      const stmt = {
        get: vi.fn(() => {
          if (lower.includes('count(*)')) {
            return { count: resultSet.length };
          }
          if (lower.includes('max(created_at)')) {
            const rows = tables['consolidation_log'] ?? [];
            const max = rows.length ? Math.max(...rows.map((value: unknown) => { const r = value as Record<string, unknown>; return r.created_at as number; })) : undefined;
            return { lastRun: max };
          }
          if (lower.includes('embedding')) {
            const rows = tables['semantic_memory'] ?? [];
            const row = rows.find((value: unknown) => { const r = value as Record<string, unknown>; return r.embedding != null; });
            return row ? { embedding: (row as Record<string, unknown>).embedding } : undefined;
          }
          return resultSet[0] ?? undefined;
        }),
        all: vi.fn((...args: unknown[]) => {
          let limit: number | undefined;
          for (let index = args.length - 1; index >= 0; index -= 1) {
            const arg = args[index];
            if (typeof arg === 'number') {
              limit = arg;
              break;
            }
          }
          return typeof limit === 'number' ? resultSet.slice(0, limit) : resultSet;
        }),
        run: vi.fn(() => ({ changes: 0 })),
      };
      return stmt;
    }),
  };
  return db;
}

const MockedDatabase = vi.mocked(Database);

describe('MemoryVizService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor & lazy init', () => {
    it('accepts dbPath option', () => {
      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      expect(svc).toBeInstanceOf(MemoryVizService);
    });

    it('does not connect until first method call', () => {
      new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      expect(MockedDatabase).not.toHaveBeenCalled();
    });

    it('opens the external memory database in read-only query mode', () => {
      const mockDb = createMockDb({});
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      svc.getSnapshot();

      expect(MockedDatabase).toHaveBeenCalledWith('D:\\databases\\memory.db', {
        readonly: true,
        fileMustExist: true,
      });
      expect(mockDb.pragma).toHaveBeenCalledWith('query_only = ON');
      expect(mockDb.pragma).not.toHaveBeenCalledWith('journal_mode = WAL');
    });
  });

  describe('getSnapshot', () => {
    it('returns snapshot with all fields populated', () => {
      const mockDb = createMockDb({
        episodic_memory: [{ id: 1, source_id: 'agent-a', timestamp: Date.now(), query: 'q', response: 'r', session_id: 's1' }],
        semantic_memory: [{ id: 2, text: 't', category: 'c', importance: 5, created: Date.now(), last_accessed: Date.now(), access_count: 3 }],
        procedural_memory: [{ id: 3, pattern: 'p', context: 'ctx', frequency: 10, success_rate: 0.9, last_used: Date.now() }],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const result = svc.getSnapshot() as Record<string, unknown>;

      expect(result.stats).toBeInstanceOf(Array);
      expect(result.recentEpisodic).toBeInstanceOf(Array);
      expect(result.recentSemantic).toBeInstanceOf(Array);
      expect(result.recentProcedural).toBeInstanceOf(Array);
      expect(result.decayItems).toBeInstanceOf(Array);
      expect(result.consolidationStatus).toBeInstanceOf(Object);
      expect(result.generatedAt).toBeTypeOf('number');
    });

    it('stats include record counts for episodic, semantic, procedural', () => {
      const mockDb = createMockDb({
        episodic_memory: [{ id: 1 }],
        semantic_memory: [{ id: 2 }],
        procedural_memory: [{ id: 3 }],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const result = svc.getSnapshot() as { stats: Array<{ store: string; recordCount: number }> };

      const byStore = Object.fromEntries(result.stats.map((s) => [s.store, s.recordCount]));
      expect(byStore['episodic']).toBe(1);
      expect(byStore['semantic']).toBe(1);
      expect(byStore['procedural']).toBe(1);
    });

    it('handles missing database gracefully', () => {
      MockedDatabase.mockImplementation(() => { throw new Error('ENOENT'); });

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\missing.db' });
      const result = svc.getSnapshot() as Record<string, unknown>;

      expect(result.stats).toEqual([
        { store: 'episodic', recordCount: 0 },
        { store: 'semantic', recordCount: 0 },
        { store: 'procedural', recordCount: 0 },
      ]);
      expect(result.recentEpisodic).toEqual([]);
      expect(result.recentSemantic).toEqual([]);
      expect(result.recentProcedural).toEqual([]);
      expect(result.decayItems).toEqual([]);
      expect(result.consolidationStatus).toEqual({ lastRunAt: null, itemsSummarized: 0, itemsPruned: 0 });
    });

    it('handles empty stores gracefully', () => {
      const mockDb = createMockDb({});
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const result = svc.getSnapshot() as Record<string, unknown>;

      expect(result.recentEpisodic).toEqual([]);
      expect(result.recentSemantic).toEqual([]);
      expect(result.recentProcedural).toEqual([]);
      expect(result.decayItems).toEqual([]);
    });

    it('limits recent memory reads at SQL level', () => {
      const rows = Array.from({ length: 150 }, (_, index) => ({
        id: index,
        source_id: 'agent-a',
        timestamp: Date.now() - index,
        query: `q${index}`,
        response: `r${index}`,
        session_id: 's1',
      }));
      const mockDb = createMockDb({
        episodic_memory: rows,
        semantic_memory: rows.map((row) => ({
          id: row.id,
          text: row.query,
          category: null,
          importance: 5,
          created: row.timestamp,
          last_accessed: row.timestamp,
          access_count: 1,
        })),
        procedural_memory: rows.map((row) => ({
          id: row.id,
          pattern: row.query,
          context: row.response,
          frequency: 1,
          success_rate: 1,
        })),
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const result = svc.getSnapshot() as {
        recentEpisodic: unknown[];
        recentSemantic: unknown[];
        recentProcedural: unknown[];
      };

      expect(result.recentEpisodic).toHaveLength(100);
      expect(result.recentSemantic).toHaveLength(100);
      expect(result.recentProcedural).toHaveLength(100);

      const preparedSql = mockDb.prepare.mock.calls.map(([sql]) => String(sql).toLowerCase());
      expect(preparedSql.some((sql) => sql.includes('from episodic_memory order by timestamp desc limit ?'))).toBe(true);
      expect(preparedSql.some((sql) => sql.includes('from semantic_memory order by created desc limit ?'))).toBe(true);
      expect(preparedSql.some((sql) => sql.includes('from procedural_memory order by frequency desc limit ?'))).toBe(true);
    });

    it('includes consolidation status fields', () => {
      const ts = Date.now();
      const mockDb = createMockDb({
        consolidation_log: [
          { action: 'merge', created_at: ts },
          { action: 'prune', created_at: ts },
        ],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const result = svc.getSnapshot() as { consolidationStatus: { lastRunAt: number; itemsSummarized: number; itemsPruned: number } };

      expect(result.consolidationStatus.lastRunAt).toBe(ts);
      expect(result.consolidationStatus.itemsSummarized).toBe(2);
      expect(result.consolidationStatus.itemsPruned).toBe(2);
    });
  });

  describe('search', () => {
    it('accepts query string and topK', () => {
      const mockDb = createMockDb({
        episodic_memory: [{ id: 1, query: 'hello', response: 'world', timestamp: Date.now() }],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.search('hello', 5);
      expect(results).toBeInstanceOf(Array);
    });

    it('returns results with source, text, score', () => {
      const mockDb = createMockDb({
        episodic_memory: [{ id: 1, query: 'hello', response: 'world', timestamp: Date.now(), score: 1.0 }],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.search('hello') as Array<{ source: string; text: string; score: number }>;

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.source).toBe('episodic');
      expect(results[0]!.text).toContain('hello');
      expect(typeof results[0]!.score).toBe('number');
    });

    it('returns empty array when database is unavailable', () => {
      MockedDatabase.mockImplementation(() => { throw new Error('ENOENT'); });

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\missing.db' });
      const results = svc.search('hello');
      expect(results).toEqual([]);
    });

    it('respects topK limit', () => {
      const rows = Array.from({ length: 20 }, (_, i) => ({
        id: i, query: `q${i}`, response: `r${i}`, timestamp: Date.now()
      }));
      const mockDb = createMockDb({ episodic_memory: rows });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.search('q', 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('computeDecay', () => {
    it('returns decay scores >= 0', () => {
      const mockDb = createMockDb({
        semantic_memory: [
          { id: 1, text: 'a', category: null, importance: 5, created: Date.now(), last_accessed: Date.now(), access_count: 0 },
        ],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.computeDecay() as Array<{ decayScore: number }>;

      expect(results.length).toBe(1);
      expect(results[0]!.decayScore).toBeGreaterThanOrEqual(0);
    });

    it('recommendedAction is keep for score >= 0.5', () => {
      const mockDb = createMockDb({
        semantic_memory: [
          { id: 1, text: 'a', category: null, importance: 10, created: Date.now(), last_accessed: Date.now(), access_count: 10 },
        ],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.computeDecay() as Array<{ recommendedAction: string }>;

      expect(results[0]!.recommendedAction).toBe('keep');
    });

    it('recommendedAction is summarize for score >= 0.2 and < 0.5', () => {
      const mockDb = createMockDb({
        semantic_memory: [
          { id: 1, text: 'a', category: null, importance: 3, created: Date.now() - 20 * 24 * 60 * 60 * 1000, last_accessed: Date.now() - 20 * 24 * 60 * 60 * 1000, access_count: 0 },
        ],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.computeDecay() as Array<{ recommendedAction: string }>;

      expect(results[0]!.recommendedAction).toBe('summarize');
    });

    it('recommendedAction is prune for score < 0.2', () => {
      const mockDb = createMockDb({
        semantic_memory: [
          { id: 1, text: 'a', category: null, importance: 1, created: Date.now() - 60 * 24 * 60 * 60 * 1000, last_accessed: Date.now() - 60 * 24 * 60 * 60 * 1000, access_count: 0 },
        ],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.computeDecay() as Array<{ recommendedAction: string }>;

      expect(results[0]!.recommendedAction).toBe('prune');
    });

    it('returns empty array when no semantic memories exist', () => {
      const mockDb = createMockDb({});
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.computeDecay();
      expect(results).toEqual([]);
    });

    it('limits decay preview candidates at SQL level', () => {
      const rows = Array.from({ length: 600 }, (_, index) => ({
        id: index,
        text: `memory ${index}`,
        category: null,
        importance: 5,
        created: Date.now() - index,
        last_accessed: Date.now() - index,
        access_count: 1,
      }));
      const mockDb = createMockDb({ semantic_memory: rows });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const results = svc.computeDecay();

      expect(results).toHaveLength(500);
      const preparedSql = mockDb.prepare.mock.calls.map(([sql]) => String(sql).toLowerCase());
      expect(preparedSql.some((sql) => sql.includes('from semantic_memory order by last_accessed asc, created asc limit ?'))).toBe(true);
    });
  });

  describe('triggerConsolidation', () => {
    it('previews decay actions without writing to the database', () => {
      const mockDb = createMockDb({
        semantic_memory: [
          { id: 1, text: 'keep', category: null, importance: 10, created: Date.now(), last_accessed: Date.now(), access_count: 10 },
          { id: 2, text: 'prune', category: null, importance: 1, created: Date.now() - 60 * 24 * 60 * 60 * 1000, last_accessed: Date.now() - 60 * 24 * 60 * 60 * 1000, access_count: 0 },
        ],
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const result = svc.triggerConsolidation();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Read-only preview complete');
      expect(result.message).toContain('No database changes were made');
      expect(mockDb.exec).not.toHaveBeenCalled();
      const preparedSql = mockDb.prepare.mock.calls.map(([sql]) => String(sql).toLowerCase());
      expect(preparedSql.some((sql) => sql.includes('delete'))).toBe(false);
      expect(preparedSql.some((sql) => sql.includes('insert'))).toBe(false);
    });

    it('returns failure when database is unavailable', () => {
      MockedDatabase.mockImplementation(() => { throw new Error('ENOENT'); });

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\missing.db' });
      const result = svc.triggerConsolidation();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database not available');
    });

    it('returns failure message on preview error', () => {
      const mockDb = createMockDb({});
      mockDb.prepare.mockImplementation(() => { throw new Error('readonly'); });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      const result = svc.triggerConsolidation();

      expect(result.success).toBe(false);
      expect(result.message).toBe('readonly');
    });
  });

  describe('error handling', () => {
    it('throws when database is corrupted on read', () => {
      const mockDb = createMockDb({});
      mockDb.prepare.mockImplementation(() => {
        throw new Error('database disk image is malformed');
      });
      MockedDatabase.mockImplementation(() => mockDb as unknown as ReturnType<typeof Database>);

      const svc = new MemoryVizService({ dbPath: 'D:\\databases\\memory.db' });
      expect(() => svc.computeDecay()).toThrow('database disk image is malformed');
    });
  });
});
