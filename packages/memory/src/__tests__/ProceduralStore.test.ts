import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { ProceduralStore } from '../stores/ProceduralStore.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-procedural-test.db');

function cleanupDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

describe('ProceduralStore', () => {
  let dbManager: DatabaseManager;
  let store: ProceduralStore;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    store = new ProceduralStore(dbManager.getDb());
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  // ── upsert ─────────────────────────────────────────

  describe('upsert', () => {
    it('inserts a new procedural memory', () => {
      store.upsert({
        pattern: 'pnpm build',
        context: 'build project',
        successRate: 1.0,
      });

      expect(store.count()).toBe(1);
      const results = store.search('pnpm build');
      expect(results).toHaveLength(1);
      expect(results[0].pattern).toBe('pnpm build');
    });

    it('increments frequency on duplicate pattern', () => {
      store.upsert({ pattern: 'pnpm test', context: 'testing', successRate: 1.0 });
      store.upsert({ pattern: 'pnpm test', context: 'testing', successRate: 1.0 });

      const results = store.search('pnpm test');
      expect(results).toHaveLength(1);
      expect(results[0].frequency).toBe(2);
    });

    it('stores and retrieves metadata', () => {
      store.upsert({
        pattern: 'git push',
        context: 'deploy',
        successRate: 0.9,
        metadata: { branch: 'main' },
      });

      const results = store.search('git push');
      expect(results[0].metadata).toEqual({ branch: 'main' });
    });
  });

  // ── upsertMany ────────────────────────────────

  describe('upsertMany', () => {
    it('inserts multiple patterns in a transaction', () => {
      store.upsertMany([
        { pattern: 'cmd-a', context: 'ctx-a', successRate: 1.0 },
        { pattern: 'cmd-b', context: 'ctx-b', successRate: 0.8 },
        { pattern: 'cmd-c', context: 'ctx-c', successRate: 0.5 },
      ]);

      expect(store.count()).toBe(3);
    });
  });

  // ── getMostFrequent ────────────────────────────

  describe('getMostFrequent', () => {
    it('returns patterns sorted by frequency', () => {
      store.upsert({ pattern: 'rare', context: 'ctx', successRate: 1.0 });
      store.upsert({ pattern: 'common', context: 'ctx', successRate: 1.0 });
      store.upsert({ pattern: 'common', context: 'ctx', successRate: 1.0 });
      store.upsert({ pattern: 'common', context: 'ctx', successRate: 1.0 });

      const results = store.getMostFrequent(2);
      expect(results[0].pattern).toBe('common');
      expect(results[0].frequency).toBe(3);
    });

    it('respects limit parameter', () => {
      store.upsertMany([
        { pattern: 'a', context: 'c', successRate: 1.0 },
        { pattern: 'b', context: 'c', successRate: 1.0 },
        { pattern: 'c', context: 'c', successRate: 1.0 },
      ]);

      expect(store.getMostFrequent(2)).toHaveLength(2);
    });
  });

  // ── getMostSuccessful ────────────────────────────

  describe('getMostSuccessful', () => {
    it('returns patterns sorted by success rate', () => {
      store.upsert({ pattern: 'low', context: 'ctx', successRate: 0.2 });
      store.upsert({ pattern: 'high', context: 'ctx', successRate: 0.95 });

      const results = store.getMostSuccessful(5);
      expect(results[0].pattern).toBe('high');
    });
  });

  // ── search ──────────────────────────────────────

  describe('search', () => {
    it('finds patterns by pattern text', () => {
      store.upsert({ pattern: 'pnpm install', context: 'deps', successRate: 1.0 });
      store.upsert({ pattern: 'pnpm build', context: 'build', successRate: 1.0 });

      const results = store.search('install');
      expect(results).toHaveLength(1);
      expect(results[0].pattern).toBe('pnpm install');
    });

    it('finds patterns by context text', () => {
      store.upsert({ pattern: 'cmd-x', context: 'deploy to production', successRate: 1.0 });

      const results = store.search('production');
      expect(results).toHaveLength(1);
    });

    it('returns empty array for no matches', () => {
      store.upsert({ pattern: 'foo', context: 'bar', successRate: 1.0 });
      expect(store.search('nonexistent')).toHaveLength(0);
    });
  });

  // ── updateSuccessRate ──────────────────────────────

  describe('updateSuccessRate', () => {
    it('adjusts success rate incrementally', () => {
      store.upsert({ pattern: 'test-cmd', context: 'ctx', successRate: 1.0 });

      // Report a failure
      store.updateSuccessRate('test-cmd', false);

      const results = store.search('test-cmd');
      expect(results[0].successRate).toBeLessThan(1.0);
    });
  });

  // ── getById ──────────────────────────────────────

  describe('getById', () => {
    it('retrieves a pattern by ID', () => {
      store.upsert({ pattern: 'find-me', context: 'ctx', successRate: 0.8 });
      const all = store.getMostFrequent(10);
      const id = all[0].id!;

      const result = store.getById(id);
      expect(result).not.toBeNull();
      expect(result!.pattern).toBe('find-me');
    });

    it('returns null for nonexistent ID', () => {
      expect(store.getById(99999)).toBeNull();
    });
  });

  // ── pruneByFrequency ──────────────────────────────

  describe('pruneByFrequency', () => {
    it('removes patterns used less than threshold', () => {
      store.upsert({ pattern: 'keep-me', context: 'ctx', successRate: 1.0 });
      store.upsert({ pattern: 'keep-me', context: 'ctx', successRate: 1.0 });
      store.upsert({ pattern: 'delete-me', context: 'ctx', successRate: 1.0 });

      const deleted = store.pruneByFrequency(2);
      expect(deleted).toBe(1);
      expect(store.count()).toBe(1);
    });
  });

  // ── count ──────────────────────────────────────

  describe('count', () => {
    it('returns zero for empty store', () => {
      expect(store.count()).toBe(0);
    });

    it('returns accurate count', () => {
      store.upsertMany([
        { pattern: 'a', context: 'c', successRate: 1.0 },
        { pattern: 'b', context: 'c', successRate: 1.0 },
      ]);
      expect(store.count()).toBe(2);
    });
  });
});
