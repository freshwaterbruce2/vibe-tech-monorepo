import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { EpisodicStore } from '../stores/EpisodicStore.js';
import { MemoryDecay } from '../consolidation/MemoryDecay.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-episodic-decay-dedup-test.db');

function cleanupDb() {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const wal = TEST_DB_PATH + '-wal';
  const shm = TEST_DB_PATH + '-shm';
  if (fs.existsSync(wal)) fs.unlinkSync(wal);
  if (fs.existsSync(shm)) fs.unlinkSync(shm);
}

describe('EpisodicStore.addUnique (dedup at insert)', () => {
  let dbManager: DatabaseManager;
  let store: EpisodicStore;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    store = new EpisodicStore(dbManager.getDb());
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  it('inserts the first time and returns deduped=false', () => {
    const result = store.addUnique({
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'how do I X?',
      response: 'do this Y',
      sessionId: 's1',
    });
    expect(result.deduped).toBe(false);
    expect(result.id).toBeGreaterThan(0);
    expect(store.count()).toBe(1);
  });

  it('skips identical content within recency window and returns existing id', () => {
    const memory = {
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'identical query',
      response: 'identical response',
      sessionId: 's1',
    };
    const first = store.addUnique(memory);
    const second = store.addUnique({ ...memory, timestamp: Date.now() + 1000 });

    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);
    expect(second.id).toBe(first.id);
    expect(store.count()).toBe(1);
  });

  it('inserts when content is identical but session differs', () => {
    const base = {
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'q',
      response: 'r',
    };
    const a = store.addUnique({ ...base, sessionId: 'session-A' });
    const b = store.addUnique({ ...base, sessionId: 'session-B' });

    expect(a.deduped).toBe(false);
    expect(b.deduped).toBe(false);
    expect(b.id).not.toBe(a.id);
    expect(store.count()).toBe(2);
  });

  it('inserts when same content arrives outside the recency window', () => {
    const oldTs = Date.now() - 60 * 60 * 1000; // 1 hour ago, well outside default 5 min window
    const memory = {
      sourceId: 'claude-code',
      timestamp: oldTs,
      query: 'q',
      response: 'r',
      sessionId: 's1',
    };
    const first = store.addUnique(memory);
    const second = store.addUnique({ ...memory, timestamp: Date.now() });

    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(false);
    expect(store.count()).toBe(2);
  });

  it('respects custom recencyWindowMs override', () => {
    const memory = {
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'q',
      response: 'r',
      sessionId: 's1',
    };
    store.addUnique(memory, { recencyWindowMs: 60 * 60 * 1000 }); // 1h window
    const second = store.addUnique(
      { ...memory, timestamp: Date.now() + 30 * 60 * 1000 }, // 30 min later
      { recencyWindowMs: 60 * 60 * 1000 },
    );
    expect(second.deduped).toBe(true);
    expect(store.count()).toBe(1);
  });

  it('add() (no dedup) still inserts duplicates for backward compat', () => {
    const memory = {
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'q',
      response: 'r',
      sessionId: 's1',
    };
    store.add(memory);
    store.add(memory);
    expect(store.count()).toBe(2);
  });
});

describe('MemoryDecay episodic archival', () => {
  let dbManager: DatabaseManager;
  let store: EpisodicStore;
  let decay: MemoryDecay;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    store = new EpisodicStore(dbManager.getDb());
    decay = new MemoryDecay({ archiveThreshold: 0.1 });
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  it('scoreEpisodic gives recent memories a score near 1.0 and old ones near 0', () => {
    const now = Date.now();
    store.add({
      sourceId: 'src',
      timestamp: now - 1000,
      query: 'fresh',
      response: 'r',
    });
    store.add({
      sourceId: 'src',
      timestamp: now - decay.episodicHalfLifeMs * 10, // 50 days = 10 half-lives
      response: 'r',
      query: 'old',
    });

    const scores = decay.scoreEpisodic(dbManager.getDb());
    expect(scores).toHaveLength(2);
    // First (lowest score) is the old memory
    expect(scores[0]?.text).toContain('old');
    expect(scores[0]?.score).toBeLessThan(0.01);
    // Second (highest score) is fresh
    expect(scores[1]?.text).toContain('fresh');
    expect(scores[1]?.score).toBeGreaterThan(0.99);
  });

  it('archiveDecayedEpisodic moves below-threshold rows to archive table and removes from main', () => {
    const now = Date.now();
    store.add({
      sourceId: 'src',
      timestamp: now,
      query: 'fresh',
      response: 'r',
    });
    store.add({
      sourceId: 'src',
      timestamp: now - decay.episodicHalfLifeMs * 10,
      query: 'ancient',
      response: 'r',
    });

    const result = decay.archiveDecayedEpisodic(dbManager.getDb(), false);
    expect(result.archived).toBe(1);
    expect(store.count()).toBe(1);

    const archiveRows = dbManager
      .getDb()
      .prepare('SELECT query FROM episodic_memory_archive')
      .all() as Array<{ query: string }>;
    expect(archiveRows).toHaveLength(1);
    expect(archiveRows[0]?.query).toBe('ancient');
  });

  it('archiveDecayedEpisodic dryRun=true reports archive candidates without modifying tables', () => {
    const now = Date.now();
    store.add({
      sourceId: 'src',
      timestamp: now - decay.episodicHalfLifeMs * 10,
      query: 'ancient',
      response: 'r',
    });

    const before = store.count();
    const result = decay.archiveDecayedEpisodic(dbManager.getDb(), true);
    expect(result.archived).toBe(1);
    expect(store.count()).toBe(before); // unchanged
  });

  it('does not archive recent memories', () => {
    const now = Date.now();
    store.add({ sourceId: 'src', timestamp: now, query: 'q', response: 'r' });
    const result = decay.archiveDecayedEpisodic(dbManager.getDb(), false);
    expect(result.archived).toBe(0);
    expect(store.count()).toBe(1);
  });
});
