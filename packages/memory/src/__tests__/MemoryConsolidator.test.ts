import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryConsolidator } from '../consolidation/MemoryConsolidator.js';
import { MemoryManager } from '../core/MemoryManager.js';
import { DatabaseManager } from '../database/DatabaseManager.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-consolidator-test.db');

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

function insertSemantic(
  db: ReturnType<DatabaseManager['getDb']>,
  text: string,
  embedding: Buffer,
  importance = 5,
  category = 'general',
) {
  db.prepare(
    'INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count) VALUES (?, ?, ?, ?, ?, 0)',
  ).run(text, embedding, category, importance, Date.now());
}

describe('MemoryConsolidator', () => {
  let dbManager: DatabaseManager;
  let memory: MemoryManager;
  let consolidator: MemoryConsolidator;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();

    // Create a minimal MemoryManager mock with getDb()
    memory = {
      getDb: () => dbManager.getDb(),
      semantic: { search: vi.fn().mockResolvedValue([]) },
      episodic: { getRecent: vi.fn().mockReturnValue([]) },
      procedural: { getMostFrequent: vi.fn().mockReturnValue([]) },
    } as unknown as MemoryManager;

    consolidator = new MemoryConsolidator(memory);
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  // ── consolidate ─────────────────────────────────────────

  describe('consolidate', () => {
    it('returns empty result when no semantic memories exist', async () => {
      const result = await consolidator.consolidate();
      expect(result.merged).toBe(0);
      expect(result.preserved).toBe(0);
      expect(result.deletions).toHaveLength(0);
    });

    it('does not merge dissimilar memories', async () => {
      const db = dbManager.getDb();
      // Two orthogonal embeddings — cosine similarity ≈ 0
      insertSemantic(db, 'React hooks guide', makeEmbedding([1, 0, 0, 0]));
      insertSemantic(db, 'Rust async patterns', makeEmbedding([0, 1, 0, 0]));

      const result = await consolidator.consolidate({ threshold: 0.9 });
      expect(result.merged).toBe(0);
    });

    it('merges nearly identical memories', async () => {
      const db = dbManager.getDb();
      // Two very similar embeddings
      insertSemantic(db, 'TypeScript best practices', makeEmbedding([0.9, 0.1, 0.0, 0.0]));
      insertSemantic(db, 'TypeScript coding standards', makeEmbedding([0.89, 0.11, 0.01, 0.0]));

      const result = await consolidator.consolidate({ threshold: 0.9 });
      expect(result.merged).toBeGreaterThanOrEqual(1);
      expect(result.deletions.length).toBeGreaterThanOrEqual(1);
    });

    it('dry run does not delete anything', async () => {
      const db = dbManager.getDb();
      insertSemantic(db, 'Memory A', makeEmbedding([1, 0, 0, 0]));
      insertSemantic(db, 'Memory B', makeEmbedding([0.99, 0.01, 0, 0]));

      const beforeCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;

      const result = await consolidator.consolidate({ dryRun: true, threshold: 0.9 });

      const afterCount = (
        db.prepare('SELECT COUNT(*) as c FROM semantic_memory').get() as { c: number }
      ).c;

      // dryRun should not delete rows even if similar
      expect(afterCount).toBe(beforeCount);
      // But should still report potential merges
      expect(result).toBeDefined();
    });

    it('respects category filter', async () => {
      const db = dbManager.getDb();
      insertSemantic(db, 'Cat A item 1', makeEmbedding([1, 0, 0, 0]), 5, 'catA');
      insertSemantic(db, 'Cat A item 2', makeEmbedding([0.99, 0.01, 0, 0]), 5, 'catA');
      insertSemantic(db, 'Cat B item 1', makeEmbedding([1, 0, 0, 0]), 5, 'catB');
      insertSemantic(db, 'Cat B item 2', makeEmbedding([0.99, 0.01, 0, 0]), 5, 'catB');

      // Only consolidate catA
      await consolidator.consolidate({ category: 'catA', threshold: 0.9 });

      // catB should still have two entries
      const catBCount = (
        db.prepare("SELECT COUNT(*) as c FROM semantic_memory WHERE category = 'catB'").get() as {
          c: number;
        }
      ).c;
      expect(catBCount).toBe(2);
    });

    it('skips memories with invalid embeddings', async () => {
      const db = dbManager.getDb();
      // Insert one with valid embedding and one with zeroblob
      insertSemantic(db, 'Valid memory', makeEmbedding([1, 0, 0, 0]));
      db.prepare(
        "INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count) VALUES (?, zeroblob(0), 'general', 5, ?, 0)",
      ).run('Invalid memory', Date.now());

      // Should not crash
      const result = await consolidator.consolidate();
      expect(result).toBeDefined();
    });
  });

  // ── getStats ──────────────────────────────────────────

  describe('getStats', () => {
    it('returns zero stats for empty database', async () => {
      const stats = await consolidator.getStats();
      expect(stats.totalMemories).toBe(0);
    });

    it('returns accurate memory count', async () => {
      const db = dbManager.getDb();
      insertSemantic(db, 'Memory 1', makeEmbedding([1, 0, 0, 0]));
      insertSemantic(db, 'Memory 2', makeEmbedding([0, 1, 0, 0]));
      insertSemantic(db, 'Memory 3', makeEmbedding([0, 0, 1, 0]));

      const stats = await consolidator.getStats();
      expect(stats.totalMemories).toBe(3);
    });
  });
});
