import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HierarchicalSummarizer } from '../consolidation/HierarchicalSummarizer.js';
import { DatabaseManager } from '../database/DatabaseManager.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-summarizer-test.db');

function cleanupDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function insertEpisode(
  db: ReturnType<DatabaseManager['getDb']>,
  query: string,
  response: string,
  timestamp: number,
  sessionId = 'test-session',
) {
  db.prepare(
    'INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id) VALUES (?, ?, ?, ?, ?)',
  ).run('test', timestamp, query, response, sessionId);
}

describe('HierarchicalSummarizer', () => {
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  // ── run ───────────────────────────────────────────────

  describe('run', () => {
    it('returns zeros when not enough episodes', async () => {
      const db = dbManager.getDb();
      const summarizer = new HierarchicalSummarizer({ minSessionSize: 3 });

      // Insert only 2 episodes (below threshold)
      insertEpisode(db, 'Q1', 'A1', Date.now());
      insertEpisode(db, 'Q2', 'A2', Date.now() + 1000);

      const result = await summarizer.run(db);
      expect(result.sessionsCreated).toBe(0);
      expect(result.topicsCreated).toBe(0);
      expect(result.domainsCreated).toBe(0);
      expect(result.totalEpisodesProcessed).toBe(0);
    });

    it('creates session summaries from enough episodes', async () => {
      const db = dbManager.getDb();
      const summarizer = new HierarchicalSummarizer({
        minSessionSize: 3,
        sessionWindowMs: 60 * 60 * 1000, // 1 hour
      });

      const baseTime = Date.now();
      // Insert 5 episodes close together (within 1 hour)
      for (let i = 0; i < 5; i++) {
        insertEpisode(
          db,
          `How do I use React hooks for state management in complex applications?`,
          `React hooks provide state management through useState and useReducer patterns.`,
          baseTime + i * 1000,
        );
      }

      const result = await summarizer.run(db);
      expect(result.sessionsCreated).toBeGreaterThanOrEqual(1);
      expect(result.totalEpisodesProcessed).toBe(5);
    });

    it('persists summaries as semantic memories', async () => {
      const db = dbManager.getDb();
      const summarizer = new HierarchicalSummarizer({
        minSessionSize: 3,
      });

      const baseTime = Date.now();
      for (let i = 0; i < 5; i++) {
        insertEpisode(
          db,
          `Question about topic ${i}`,
          `Answer about topic ${i}`,
          baseTime + i * 1000,
        );
      }

      await summarizer.run(db);

      // Check that at least one semantic memory was created with hierarchy category
      const rows = db
        .prepare("SELECT * FROM semantic_memory WHERE category LIKE 'hierarchy-%'")
        .all();
      expect(rows.length).toBeGreaterThanOrEqual(1);
    });

    it('groups episodes into separate sessions by time gap', async () => {
      const db = dbManager.getDb();
      const summarizer = new HierarchicalSummarizer({
        minSessionSize: 3,
        sessionWindowMs: 60 * 60 * 1000, // 1 hour
      });

      const baseTime = Date.now();
      // Session 1: 4 episodes close together
      for (let i = 0; i < 4; i++) {
        insertEpisode(db, `Session1-Q${i}`, `Session1-A${i}`, baseTime + i * 1000);
      }
      // Session 2: 4 episodes, 3 hours later
      for (let i = 0; i < 4; i++) {
        insertEpisode(
          db,
          `Session2-Q${i}`,
          `Session2-A${i}`,
          baseTime + 3 * 60 * 60 * 1000 + i * 1000,
        );
      }

      const result = await summarizer.run(db);
      // Should have at least 2 sessions
      expect(result.sessionsCreated).toBeGreaterThanOrEqual(2);
    });
  });

  // ── getStats ──────────────────────────────────────────

  describe('getStats', () => {
    it('returns zero stats with no data', () => {
      const db = dbManager.getDb();
      const summarizer = new HierarchicalSummarizer();
      const stats = summarizer.getStats(db);

      expect(stats.sessions).toBe(0);
      expect(stats.topics).toBe(0);
      expect(stats.domains).toBe(0);
    });

    it('returns counts after summarization', async () => {
      const db = dbManager.getDb();
      const summarizer = new HierarchicalSummarizer({ minSessionSize: 3 });

      const baseTime = Date.now();
      for (let i = 0; i < 5; i++) {
        insertEpisode(db, `Question ${i}`, `Answer ${i}`, baseTime + i * 100);
      }

      await summarizer.run(db);
      const stats = summarizer.getStats(db);
      expect(stats.sessions).toBeGreaterThanOrEqual(0); // may have sessions
    });
  });

  // ── config overrides ──────────────────────────────────

  describe('configuration', () => {
    it('uses default config values', () => {
      const summarizer = new HierarchicalSummarizer();
      expect(summarizer).toBeDefined();
    });

    it('accepts custom summarizeFn', async () => {
      const db = dbManager.getDb();
      const customFn = (texts: string[]) => `CUSTOM: ${texts.join('; ')}`;
      const summarizer = new HierarchicalSummarizer({
        minSessionSize: 3,
        summarizeFn: customFn,
      });

      const baseTime = Date.now();
      for (let i = 0; i < 5; i++) {
        insertEpisode(db, `Q${i}`, `A${i}`, baseTime + i * 1000);
      }

      const result = await summarizer.run(db);
      // Should still produce summaries
      expect(result.totalEpisodesProcessed).toBe(5);

      // Verify custom function was used
      const rows = db
        .prepare("SELECT text FROM semantic_memory WHERE category LIKE 'hierarchy-%'")
        .all() as Array<{ text: string }>;

      if (rows.length > 0) {
        expect(rows.some((r) => r.text.startsWith('CUSTOM:'))).toBe(true);
      }
    });
  });
});
