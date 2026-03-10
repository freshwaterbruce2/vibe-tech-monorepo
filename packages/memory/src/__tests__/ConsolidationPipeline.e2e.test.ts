/**
 * End-to-end Consolidation Pipeline Test
 *
 * Exercises the full consolidation pipeline against a real SQLite database
 * with realistic data: MemoryConsolidator → HierarchicalSummarizer → MemoryDecay
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HierarchicalSummarizer } from '../consolidation/HierarchicalSummarizer.js';
import { MemoryConsolidator } from '../consolidation/MemoryConsolidator.js';
import { MemoryDecay } from '../consolidation/MemoryDecay.js';
import type { MemoryManager } from '../core/MemoryManager.js';
import { DatabaseManager } from '../database/DatabaseManager.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-pipeline-e2e.db');

function cleanupDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function makeEmbedding(values: number[]): Buffer {
  const buf = Buffer.alloc(values.length * 4);
  values.forEach((v, i) => buf.writeFloatLE(v, i * 4));
  return buf;
}

// ── Helpers to seed realistic data ──────────────────────────

function seedEpisodicMemories(db: ReturnType<DatabaseManager['getDb']>) {
  const stmt = db.prepare(
    'INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id) VALUES (?, ?, ?, ?, ?)',
  );

  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const MINUTE = 60 * 1000;

  // Session 1: React development (5 episodes, close together)
  const session1Base = now - 24 * HOUR;
  stmt.run(
    'agent-1',
    session1Base,
    'How do I use React hooks for state management?',
    'Use useState for local state and useReducer for complex state logic.',
    'session-react-1',
  );
  stmt.run(
    'agent-1',
    session1Base + 2 * MINUTE,
    'What about global React state?',
    'Use Zustand or Redux for global application state.',
    'session-react-1',
  );
  stmt.run(
    'agent-1',
    session1Base + 5 * MINUTE,
    'How to handle React side effects?',
    'Use useEffect hook with proper dependency arrays for side effects.',
    'session-react-1',
  );
  stmt.run(
    'agent-1',
    session1Base + 8 * MINUTE,
    'React performance optimization tips?',
    'Use React.memo, useMemo, and useCallback for expensive computations.',
    'session-react-1',
  );
  stmt.run(
    'agent-1',
    session1Base + 12 * MINUTE,
    'How to test React components?',
    'Use Vitest with React Testing Library for component unit tests.',
    'session-react-1',
  );

  // Session 2: Database work (4 episodes, 6 hours later)
  const session2Base = now - 18 * HOUR;
  stmt.run(
    'agent-1',
    session2Base,
    'How to create SQLite indexes?',
    'Use CREATE INDEX for frequently queried columns.',
    'session-db-1',
  );
  stmt.run(
    'agent-1',
    session2Base + 3 * MINUTE,
    'SQLite WAL mode benefits?',
    'WAL mode allows concurrent reads and writes, improving performance.',
    'session-db-1',
  );
  stmt.run(
    'agent-1',
    session2Base + 7 * MINUTE,
    'How to write database migrations?',
    'Use versioned migration scripts with UP and DOWN operations.',
    'session-db-1',
  );
  stmt.run(
    'agent-1',
    session2Base + 10 * MINUTE,
    'SQLite performance tuning tips?',
    'Use PRAGMA journal_mode=WAL, optimize queries with EXPLAIN QUERY PLAN.',
    'session-db-1',
  );

  // Session 3: More React (4 episodes, 3 hours later — should cluster with session 1 at topic level)
  const session3Base = now - 12 * HOUR;
  stmt.run(
    'agent-1',
    session3Base,
    'How to structure React project folders?',
    'Organize by feature with components, hooks, and services per feature.',
    'session-react-2',
  );
  stmt.run(
    'agent-1',
    session3Base + 4 * MINUTE,
    'React error boundary patterns?',
    'Create ErrorBoundary class components to catch render errors gracefully.',
    'session-react-2',
  );
  stmt.run(
    'agent-1',
    session3Base + 6 * MINUTE,
    'How to use React context effectively?',
    'Use context for cross-cutting concerns like themes and auth state.',
    'session-react-2',
  );
  stmt.run(
    'agent-1',
    session3Base + 9 * MINUTE,
    'React lazy loading for code splitting?',
    'Use React.lazy and Suspense for route-level code splitting.',
    'session-react-2',
  );
}

function seedSemanticMemories(db: ReturnType<DatabaseManager['getDb']>) {
  const stmt = db.prepare(
    'INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count) VALUES (?, ?, ?, ?, ?, ?)',
  );
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // Pair 1: Near-duplicates (should merge)
  stmt.run(
    'TypeScript strict mode enables better error detection',
    makeEmbedding([0.9, 0.1, 0.0, 0.0]),
    'typescript',
    6,
    now - 5 * DAY,
    3,
  );
  stmt.run(
    'TypeScript strict mode catches errors at compile time',
    makeEmbedding([0.89, 0.11, 0.01, 0.0]),
    'typescript',
    5,
    now - 4 * DAY,
    2,
  );

  // Pair 2: Also similar but less so
  stmt.run(
    'Async await simplifies promise handling in JavaScript',
    makeEmbedding([0.0, 0.9, 0.1, 0.0]),
    'javascript',
    7,
    now - 3 * DAY,
    5,
  );
  stmt.run(
    'Promise chains can be replaced with async/await syntax',
    makeEmbedding([0.05, 0.88, 0.12, 0.0]),
    'javascript',
    6,
    now - 2 * DAY,
    4,
  );

  // Distant: should NOT merge
  stmt.run(
    'SQLite uses B-tree indexes for efficient lookups',
    makeEmbedding([0.0, 0.0, 0.9, 0.1]),
    'database',
    8,
    now - 1 * DAY,
    10,
  );

  // Old, low-access: should decay and get archived
  stmt.run(
    'Outdated webpack config patterns from 2020',
    makeEmbedding([0.1, 0.0, 0.0, 0.9]),
    'deprecated',
    2,
    now - 30 * DAY,
    0,
  );
  stmt.run(
    'Legacy jQuery selector patterns',
    makeEmbedding([0.0, 0.1, 0.0, 0.9]),
    'deprecated',
    1,
    now - 60 * DAY,
    0,
  );
}

describe('Consolidation Pipeline E2E', () => {
  let dbManager: DatabaseManager;
  let db: ReturnType<DatabaseManager['getDb']>;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    db = dbManager.getDb();
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  // ── Stage 1: MemoryConsolidator ─────────────────────────

  describe('Stage 1: Semantic Memory Consolidation', () => {
    it('merges near-duplicate semantic memories while preserving distinct ones', async () => {
      seedSemanticMemories(db);

      const beforeCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      expect(beforeCount).toBe(7);

      const memory = {
        getDb: () => db,
        semantic: { search: vi.fn().mockResolvedValue([]) },
        episodic: { getRecent: vi.fn().mockReturnValue([]) },
        procedural: { getMostFrequent: vi.fn().mockReturnValue([]) },
      } as unknown as MemoryManager;

      const consolidator = new MemoryConsolidator(memory);

      // Dry run first — nothing should change
      const preview = await consolidator.consolidate({ threshold: 0.9, dryRun: true });
      expect(preview).toBeDefined();
      const midCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      expect(midCount).toBe(beforeCount);

      // Real run
      const result = await consolidator.consolidate({ threshold: 0.9 });
      expect(result.merged).toBeGreaterThanOrEqual(1); // At least the TS pair merged
      expect(result.deletions.length).toBeGreaterThanOrEqual(1);

      const afterCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      expect(afterCount).toBeLessThan(beforeCount);

      // SQLite entry should still exist (the one we kept)
      const remaining = db
        .prepare("SELECT text FROM semantic_memory WHERE category = 'database'")
        .all() as { text: string }[];
      expect(remaining).toHaveLength(1);
      expect(remaining[0].text).toContain('SQLite');
    });
  });

  // ── Stage 2: Hierarchical Summarization ────────────────

  describe('Stage 2: Hierarchical Summarization', () => {
    it('creates session summaries from episodic memories', async () => {
      seedEpisodicMemories(db);

      const summarizer = new HierarchicalSummarizer({
        minSessionSize: 3,
        sessionWindowMs: 2 * 60 * 60 * 1000, // 2 hours
        minTopicSessions: 2,
      });

      const result = await summarizer.run(db);

      // We have 3 sessions with 5, 4, 4 episodes → all >= minSessionSize(3)
      expect(result.sessionsCreated).toBeGreaterThanOrEqual(3);
      expect(result.totalEpisodesProcessed).toBe(13);

      // Should create at least 1 topic (React sessions should cluster)
      expect(result.topicsCreated).toBeGreaterThanOrEqual(1);

      // With 2+ topics, a domain summary should also be created
      // (depends on keyword clustering — might not always produce 2 topics)
    });

    it('persists summaries as semantic memories with hierarchy categories', async () => {
      seedEpisodicMemories(db);

      const summarizer = new HierarchicalSummarizer({ minSessionSize: 3 });
      await summarizer.run(db);

      // Check that hierarchy categories exist in semantic_memory
      const hierarchyRows = db
        .prepare(
          "SELECT category, COUNT(*) as count FROM semantic_memory WHERE category LIKE 'hierarchy-%' GROUP BY category",
        )
        .all() as Array<{ category: string; count: number }>;

      expect(hierarchyRows.length).toBeGreaterThanOrEqual(1);

      // At least session-level summaries should exist
      const sessionRows = hierarchyRows.filter((r) => r.category.startsWith('hierarchy-session'));
      expect(sessionRows.length).toBeGreaterThanOrEqual(1);
    });

    it('getStats reflects the summarization hierarchy', async () => {
      seedEpisodicMemories(db);

      const summarizer = new HierarchicalSummarizer({ minSessionSize: 3 });
      await summarizer.run(db);

      const stats = summarizer.getStats(db);
      expect(stats.totalEpisodes).toBe(13);
      expect(stats.sessions).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Stage 3: Memory Decay ──────────────────────────────

  describe('Stage 3: Memory Decay & Archival', () => {
    it('scores memories correctly — recent + accessed = high, old + unused = low', () => {
      seedSemanticMemories(db);

      const decay = new MemoryDecay({
        halfLifeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        archiveThreshold: 0.15,
      });

      const scores = decay.scoreAll(db);
      expect(scores.length).toBe(7);

      // Scores should be sorted ascending (most decayed first)
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i].score).toBeGreaterThanOrEqual(scores[i - 1].score);
      }

      // Old deprecated memories should have the lowest scores
      const deprecated = scores.filter((s) => s.category === 'deprecated');
      expect(deprecated.length).toBe(2);
      expect(deprecated[0].score).toBeLessThan(0.3);
    });

    it('archives decayed memories and preserves active ones', () => {
      seedSemanticMemories(db);

      const decay = new MemoryDecay({
        halfLifeMs: 7 * 24 * 60 * 60 * 1000,
        archiveThreshold: 0.15,
      });

      // Preview first (dry run)
      const preview = decay.previewArchival(db);
      expect(preview.archived).toBeGreaterThanOrEqual(1); // Old deprecated items

      const beforeCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;

      // Real archival
      const result = decay.archiveDecayed(db);
      expect(result.archived).toBeGreaterThanOrEqual(1);
      expect(result.remaining).toBeLessThan(beforeCount);

      const afterCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      expect(afterCount).toBe(result.remaining);

      // Verify archive table has the items
      const archiveCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory_archive').get() as { c: number }
      ).c;
      expect(archiveCount).toBe(result.archived);
    });

    it('restore brings archived memories back', () => {
      seedSemanticMemories(db);

      const decay = new MemoryDecay({
        halfLifeMs: 7 * 24 * 60 * 60 * 1000,
        archiveThreshold: 0.15,
      });

      // Archive decayed memories
      decay.archiveDecayed(db);

      // Get an archived ID
      const archived = db.prepare('SELECT id FROM semantic_memory_archive LIMIT 1').get() as
        | { id: number }
        | undefined;
      expect(archived).toBeDefined();

      const beforeRestore = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;

      // Restore it
      const restored = decay.restoreFromArchive(db, archived!.id);
      expect(restored).toBe(true);

      const afterRestore = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      expect(afterRestore).toBe(beforeRestore + 1);

      // Should no longer be in archive
      const stillArchived = db
        .prepare('SELECT id FROM semantic_memory_archive WHERE id = ?')
        .get(archived!.id);
      expect(stillArchived).toBeUndefined();
    });

    it('getStats reports consistent numbers', () => {
      seedSemanticMemories(db);

      const decay = new MemoryDecay({
        halfLifeMs: 7 * 24 * 60 * 60 * 1000,
        archiveThreshold: 0.15,
      });

      const before = decay.getStats(db);
      expect(before.total).toBe(7);
      expect(before.archivedCount).toBe(0);

      decay.archiveDecayed(db);

      const after = decay.getStats(db);
      expect(after.total).toBeLessThan(before.total);
      expect(after.archivedCount).toBeGreaterThanOrEqual(1);
      expect(after.total + after.archivedCount).toBe(before.total);
    });
  });

  // ── Full Pipeline: All 3 stages sequentially ──────────

  describe('Full Pipeline: Consolidate → Summarize → Decay', () => {
    it('runs all three stages in sequence on realistic data', async () => {
      // Seed both episodic and semantic data
      seedEpisodicMemories(db);
      seedSemanticMemories(db);

      const initialSemanticCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      const initialEpisodicCount = (
        db.prepare('SELECT COUNT(*) as c FROM episodic_memory').get() as { c: number }
      ).c;
      expect(initialSemanticCount).toBe(7);
      expect(initialEpisodicCount).toBe(13);

      // ── Stage 1: Consolidate duplicate semantic memories
      const memory = {
        getDb: () => db,
        semantic: { search: vi.fn().mockResolvedValue([]) },
        episodic: { getRecent: vi.fn().mockReturnValue([]) },
        procedural: { getMostFrequent: vi.fn().mockReturnValue([]) },
      } as unknown as MemoryManager;

      const consolidator = new MemoryConsolidator(memory);
      const consolidation = await consolidator.consolidate({ threshold: 0.9 });
      expect(consolidation.merged).toBeGreaterThanOrEqual(1);

      const postConsolidateCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      expect(postConsolidateCount).toBeLessThan(initialSemanticCount);

      // ── Stage 2: Summarize episodic memories into semantic hierarchy
      const summarizer = new HierarchicalSummarizer({ minSessionSize: 3 });
      const summarization = await summarizer.run(db);
      expect(summarization.sessionsCreated).toBeGreaterThanOrEqual(3);

      const postSummarizeCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      expect(postSummarizeCount).toBeGreaterThan(postConsolidateCount); // Summaries added

      // ── Stage 3: Decay and archive old/unused memories
      const decay = new MemoryDecay({
        halfLifeMs: 7 * 24 * 60 * 60 * 1000,
        archiveThreshold: 0.15,
      });
      const decayResult = decay.archiveDecayed(db);
      expect(decayResult.archived).toBeGreaterThanOrEqual(1);

      const finalCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;
      const archivedCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory_archive').get() as { c: number }
      ).c;

      // Final state: fewer active memories, some archived, hierarchy summaries present
      expect(finalCount).toBeGreaterThan(0);
      expect(archivedCount).toBeGreaterThanOrEqual(1);

      // Hierarchy summaries should survive (they're recent + important)
      const hierarchyCount = (
        db
          .prepare("SELECT COUNT(*) as c FROM semantic_memory WHERE category LIKE 'hierarchy-%'")
          .get() as { c: number }
      ).c;
      expect(hierarchyCount).toBeGreaterThanOrEqual(3); // At least session summaries
    });
  });
});
