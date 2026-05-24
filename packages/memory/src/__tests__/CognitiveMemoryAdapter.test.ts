import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CognitiveMemoryAdapter } from '../cognitive/CognitiveMemoryAdapter.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-cognitive-memory-test.db');
const NOW = 1_800_000_000_000;

function cleanupDb(): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const dbPath = TEST_DB_PATH + suffix;
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  }
}

class FakeEmbedder {
  private readonly dimension = 16;

  async embed(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimension).fill(0);
    for (const token of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash * 31 + token.charCodeAt(i)) | 0;
      }
      vector[Math.abs(hash) % this.dimension] += 1;
    }

    let norm = 0;
    for (const value of vector) norm += value * value;
    norm = Math.sqrt(norm) || 1;
    return vector.map((value) => value / norm);
  }

  getModel(): string {
    return 'fake-cognitive-model';
  }

  getDimension(): number {
    return this.dimension;
  }

  getOriginalDimension(): number {
    return this.dimension;
  }

  getProvider(): string {
    return 'transformers';
  }

  hasDimensionMismatch(): boolean {
    return false;
  }
}

describe('CognitiveMemoryAdapter', () => {
  let dbManager: DatabaseManager;
  let adapter: CognitiveMemoryAdapter;

  beforeEach(async () => {
    cleanupDb();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    adapter = new CognitiveMemoryAdapter(
      dbManager.getDb(),
      new FakeEmbedder() as unknown as EmbeddingService,
    );
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
    vi.useRealTimers();
  });

  it('creates a parallel cognitive memory table without touching existing stores', () => {
    const tables = dbManager
      .getDb()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    expect(tables.map((table) => table.name)).toContain('cognitive_memory');
    expect(adapter.count()).toBe(0);
  });

  it('stores task outcomes and ranks successful confident outcomes higher', async () => {
    await adapter.storeOutcome({
      task: 'run pnpm nx test memory',
      outcome: 'Using the wrong native module path failed in WSL',
      successful: false,
      confidence: 0.2,
    });
    const goodId = await adapter.storeOutcome({
      task: 'run pnpm nx test memory',
      outcome: 'Use the workspace package manager through Nx from the Windows toolchain',
      successful: true,
      confidence: 0.95,
    });

    const results = await adapter.retrieve('pnpm nx test memory', {
      kind: 'outcome',
      limit: 2,
      updateAccess: false,
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.record.id).toBe(goodId);
    expect(results[0]?.components).toMatchObject({
      successRate: 1,
      confidence: 0.95,
    });
  });

  it('stores anti-patterns as failure-backed cognitive memories', async () => {
    const id = await adapter.storeAntiPattern({
      task: 'implement memory feature',
      antiPattern: 'Create a duplicate store instead of extending the memory adapter boundary',
      recommendation: 'Search for existing stores first and keep the adapter parallel',
      confidence: 0.9,
      metadata: { source: 'test' },
    });

    const [result] = await adapter.retrieve('duplicate store memory adapter', {
      kind: 'anti_pattern',
      limit: 1,
      updateAccess: false,
    });

    expect(result?.record.id).toBe(id);
    expect(result?.record.kind).toBe('anti_pattern');
    expect(result?.record.recommendation).toContain('Search for existing stores');
    expect(result?.record.metadata).toEqual({ source: 'test' });
    expect(result?.components.rawSuccessRate).toBe(0);
    expect(result?.components.successRate).toBe(1);
  });

  it('reinforces access on retrieval for base-level activation', async () => {
    const id = await adapter.storeOutcome({
      task: 'remember retrieval',
      outcome: 'Accessed cognitive memories should be reinforced',
      successful: true,
      confidence: 0.8,
    });

    await adapter.retrieve('retrieval cognitive memories', { limit: 1 });

    const reloaded = adapter.getById(id);
    expect(reloaded?.accessCount).toBe(1);
    expect(reloaded?.lastAccessed).toBe(NOW);
  });
});
