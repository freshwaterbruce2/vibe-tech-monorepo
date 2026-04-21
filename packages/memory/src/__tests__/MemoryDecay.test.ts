import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryDecay } from '../consolidation/MemoryDecay.js';
import { DatabaseManager } from '../database/DatabaseManager.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-decay-test.db');

function cleanupDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

describe('MemoryDecay', () => {
  let dbManager: DatabaseManager;
  let decay: MemoryDecay;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    decay = new MemoryDecay();
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  // ── calculateScore ──────────────────────────────────────

  describe('calculateScore', () => {
    it('returns 1.0+ for a brand-new, high-importance memory', () => {
      const score = decay.calculateScore(0, 0, 10);
      // base=1, boost=0, importanceBonus=0.2 → 1.2
      expect(score).toBeCloseTo(1.2, 1);
    });

    it('decays to ~0.5 base after one half-life', () => {
      // Explicit half-life avoids coupling to the dual-layer default (semantic=11d)
      const halfLife = 7 * 24 * 60 * 60 * 1000;
      const tunedDecay = new MemoryDecay({ halfLifeMs: halfLife });
      const score = tunedDecay.calculateScore(halfLife, 0, 0);
      expect(score).toBeCloseTo(0.5, 1);
    });

    it('decays to ~0.25 base after two half-lives', () => {
      const halfLife = 7 * 24 * 60 * 60 * 1000;
      const twoHalfLives = 14 * 24 * 60 * 60 * 1000;
      const tunedDecay = new MemoryDecay({ halfLifeMs: halfLife });
      const score = tunedDecay.calculateScore(twoHalfLives, 0, 0);
      expect(score).toBeCloseTo(0.25, 1);
    });

    it('boosts score with access count', () => {
      const halfLife = 7 * 24 * 60 * 60 * 1000;
      const withoutAccess = decay.calculateScore(halfLife, 0, 5);
      const withAccess = decay.calculateScore(halfLife, 10, 5);
      expect(withAccess).toBeGreaterThan(withoutAccess);
    });

    it('never returns below zero', () => {
      const veryOld = 365 * 24 * 60 * 60 * 1000;
      const score = decay.calculateScore(veryOld, 0, 0);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('respects custom config values', () => {
      const customDecay = new MemoryDecay({
        halfLifeMs: 1000,
        accessBoost: 0.5,
        importanceWeight: 0.5,
      });
      const score = customDecay.calculateScore(0, 4, 10);
      // Phase 4 formula (linear boost with 0.5 cap — replaced earlier sqrt):
      //   base = 2^0 = 1
      //   boost = min(4 * 0.5, 0.5) = 0.5
      //   importanceBonus = (10/10) * 0.5 = 0.5
      //   total = 2.0
      expect(score).toBeCloseTo(2.0, 1);
    });
  });

  // ── scoreAll ────────────────────────────────────────────

  describe('scoreAll', () => {
    it('returns empty array for empty database', () => {
      const scores = decay.scoreAll(dbManager.getDb());
      expect(scores).toEqual([]);
    });

    it('scores inserted memories and sorts ascending', () => {
      const db = dbManager.getDb();
      const now = Date.now();
      const embedding = Buffer.from(new Float32Array([0.1, 0.2]).buffer);

      // Insert two memories: one old, one recent
      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
      ).run('old memory', embedding, 5, now - 30 * 24 * 60 * 60 * 1000, 0);

      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
      ).run('new memory', embedding, 5, now, 3);

      const scores = decay.scoreAll(db);
      expect(scores).toHaveLength(2);
      // Sorted ascending — oldest (lowest score) first
      expect(scores[0].text).toBe('old memory');
      expect(scores[1].text).toBe('new memory');
      expect(scores[0].score).toBeLessThan(scores[1].score);
    });
  });

  // ── archiveDecayed ──────────────────────────────────────

  describe('archiveDecayed', () => {
    it('archives memories below threshold', () => {
      const db = dbManager.getDb();
      const embedding = Buffer.from(new Float32Array([0.1]).buffer);
      const veryOld = Date.now() - 365 * 24 * 60 * 60 * 1000;

      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
      ).run('ancient memory', embedding, 1, veryOld, 0);

      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
      ).run('fresh memory', embedding, 8, Date.now(), 5);

      const result = decay.archiveDecayed(db);
      expect(result.archived).toBeGreaterThanOrEqual(1);
      expect(result.remaining).toBeGreaterThanOrEqual(1);

      // Verify archived memory is in archive table
      const archived = db
        .prepare('SELECT COUNT(*) as count FROM semantic_memory_archive')
        .get() as { count: number };
      expect(archived.count).toBeGreaterThanOrEqual(1);
    });

    it('does nothing in dry run mode', () => {
      const db = dbManager.getDb();
      const embedding = Buffer.from(new Float32Array([0.1]).buffer);
      const veryOld = Date.now() - 365 * 24 * 60 * 60 * 1000;

      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
      ).run('ancient memory', embedding, 1, veryOld, 0);

      const result = decay.previewArchival(db);
      expect(result.archived).toBeGreaterThanOrEqual(1);

      // Memory should still exist in main table
      const count = (
        db.prepare('SELECT COUNT(*) as count FROM semantic_memory').get() as { count: number }
      ).count;
      expect(count).toBe(1);
    });
  });

  // ── restoreFromArchive ──────────────────────────────────

  describe('restoreFromArchive', () => {
    it('restores an archived memory back to active', () => {
      const db = dbManager.getDb();
      const embedding = Buffer.from(new Float32Array([0.1]).buffer);
      const veryOld = Date.now() - 365 * 24 * 60 * 60 * 1000;

      const { lastInsertRowid } = db
        .prepare(
          'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
        )
        .run('to archive', embedding, 1, veryOld, 0);

      // Archive it
      decay.archiveDecayed(db);

      // Verify it's gone from main
      const gone = db.prepare('SELECT * FROM semantic_memory WHERE id = ?').get(lastInsertRowid);
      expect(gone).toBeUndefined();

      // Restore it
      const restored = decay.restoreFromArchive(db, lastInsertRowid as number);
      expect(restored).toBe(true);

      // Verify it's back
      const back = db.prepare('SELECT * FROM semantic_memory WHERE id = ?').get(lastInsertRowid);
      expect(back).toBeDefined();
    });

    it('returns false for non-existent archive ID', () => {
      const db = dbManager.getDb();
      // Ensure archive table exists
      db.exec(
        'CREATE TABLE IF NOT EXISTS semantic_memory_archive (id INTEGER PRIMARY KEY, text TEXT, embedding BLOB, category TEXT, importance INTEGER, created INTEGER, access_count INTEGER, last_accessed INTEGER, metadata TEXT, archived_at INTEGER, decay_score REAL)',
      );
      expect(decay.restoreFromArchive(db, 9999)).toBe(false);
    });
  });

  // ── getStats ────────────────────────────────────────────

  describe('getStats', () => {
    it('returns zeroes for empty database', () => {
      const stats = decay.getStats(dbManager.getDb());
      expect(stats.total).toBe(0);
      expect(stats.belowThreshold).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.archivedCount).toBe(0);
    });

    it('counts archived memories', () => {
      const db = dbManager.getDb();
      const embedding = Buffer.from(new Float32Array([0.1]).buffer);
      const veryOld = Date.now() - 365 * 24 * 60 * 60 * 1000;

      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
      ).run('old', embedding, 1, veryOld, 0);
      db.prepare(
        'INSERT INTO semantic_memory (text, embedding, importance, created, access_count) VALUES (?, ?, ?, ?, ?)',
      ).run('new', embedding, 8, Date.now(), 5);

      decay.archiveDecayed(db);
      const stats = decay.getStats(db);
      expect(stats.archivedCount).toBeGreaterThanOrEqual(1);
      expect(stats.total).toBe(1); // Only unarchived remain
    });
  });
});
