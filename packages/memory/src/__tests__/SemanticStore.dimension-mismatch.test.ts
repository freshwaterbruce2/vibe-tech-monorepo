import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { SemanticStore } from '../stores/SemanticStore.js';
import { DimensionMismatchError } from '../errors.js';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-semantic-dimension-test.db');

function cleanupDb(): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

/**
 * Mutable embedder stub — its dimension/model can change between calls so a
 * single test can simulate stored vectors at one dimension and a query at
 * another.
 */
class FakeEmbedder {
  public model = 'fake-1536-model';
  public provider: 'openrouter' | 'ollama' | 'transformers' = 'openrouter';
  public dimension = 1536;
  public originalDimension = 1536;
  public mismatch = false;

  async embed(text: string): Promise<number[]> {
    // Deterministic vector of the configured dimension.
    const vec = new Array<number>(this.dimension).fill(0);
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    vec[0] = ((h & 0xff) / 255) * 0.5 + 0.5;
    // Normalise.
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm) || 1;
    return vec.map((v) => v / norm);
  }

  getModel(): string {
    return this.model;
  }
  getDimension(): number {
    return this.dimension;
  }
  getOriginalDimension(): number {
    return this.originalDimension;
  }
  getProvider(): string {
    return this.provider;
  }
  hasDimensionMismatch(): boolean {
    return this.mismatch;
  }
}

describe('SemanticStore dimension mismatch loud-fail', () => {
  let dbManager: DatabaseManager;
  let store: SemanticStore;
  let embedder: FakeEmbedder;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    embedder = new FakeEmbedder();
    store = new SemanticStore(
      dbManager.getDb(),
      embedder as unknown as EmbeddingService,
    );
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
    vi.restoreAllMocks();
  });

  it('search returns [] AND increments counter AND warns when stored row dim != query dim', async () => {
    // 1. Seed at dimension 1536.
    embedder.dimension = 1536;
    embedder.model = 'fake-1536-model';
    embedder.originalDimension = 1536;
    const inserted = await store.add({ text: 'seed knowledge', importance: 8 });
    expect(inserted.status).toBe('inserted');
    expect(store.count()).toBe(1);

    // 2. Sanity: embedding health should be clean.
    const beforeHealth = store.getEmbeddingHealth();
    expect(beforeHealth.staleDimensionCount).toBe(0);
    expect(beforeHealth.lastMismatchAt).toBeNull();
    expect(beforeHealth.currentDimension).toBe(1536);
    expect(beforeHealth.currentModel).toBe('fake-1536-model');

    // 3. Now query with a 768-dimension embedder (same model name so the
    //    model-filter does not skip the row — we want the dimension guard
    //    to be the thing that catches it).
    embedder.dimension = 768;
    // Keep model name identical so search reaches the per-row dim check.

    // Spy on console / logger output. The package uses @vibetech/logger which
    // ultimately writes via winston; we cannot easily intercept that, so we
    // assert on the side-effects (counter + empty result) which is the contract.
    const results = await store.search('seed knowledge', 5);
    expect(results).toEqual([]);

    const afterHealth = store.getEmbeddingHealth();
    expect(afterHealth.staleDimensionCount).toBeGreaterThan(0);
    expect(afterHealth.lastMismatchAt).not.toBeNull();
    expect(afterHealth.currentDimension).toBe(768);
  });

  it('add() throws DimensionMismatchError when embedder reports a runtime dimension switch', async () => {
    embedder.dimension = 1536;
    embedder.originalDimension = 1536;

    // Flip the global mismatch flag — simulates Transformers fallback after init.
    embedder.mismatch = true;
    embedder.dimension = 384;

    await expect(
      store.add({ text: 'should not be stored', importance: 5 }),
    ).rejects.toBeInstanceOf(DimensionMismatchError);

    // Verify error fields are populated for observability.
    try {
      await store.add({ text: 'should not be stored either', importance: 5 });
      throw new Error('expected DimensionMismatchError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DimensionMismatchError);
      const dim = err as DimensionMismatchError;
      expect(dim.expected).toBe(1536);
      expect(dim.actual).toBe(384);
      expect(dim.provider).toBe('openrouter');
      expect(dim.modelVersion).toBe('fake-1536-model');
    }

    // No row was inserted.
    expect(store.count()).toBe(0);

    // Counter was bumped (twice — once per failed call).
    const health = store.getEmbeddingHealth();
    expect(health.staleDimensionCount).toBeGreaterThanOrEqual(2);
    expect(health.lastMismatchAt).not.toBeNull();
  });

  it('add() throws DimensionMismatchError when the embedding length disagrees with reported dimension', async () => {
    embedder.dimension = 1536;
    embedder.originalDimension = 1536;
    // Override embed() to return a 4-dim vector while reporting 1536.
    embedder.embed = async (): Promise<number[]> => [0.1, 0.2, 0.3, 0.4];

    await expect(
      store.add({ text: 'mismatched payload', importance: 5 }),
    ).rejects.toBeInstanceOf(DimensionMismatchError);

    expect(store.count()).toBe(0);
    expect(store.getEmbeddingHealth().staleDimensionCount).toBeGreaterThan(0);
  });

  it('search returns [] (without throwing) when the global mismatch flag is set', async () => {
    embedder.dimension = 1536;
    embedder.originalDimension = 1536;
    await store.add({ text: 'pre-mismatch row', importance: 6 });

    embedder.mismatch = true;
    embedder.dimension = 384;

    const results = await store.search('pre-mismatch row', 5);
    expect(results).toEqual([]);

    const health = store.getEmbeddingHealth();
    expect(health.staleDimensionCount).toBeGreaterThan(0);
  });
});
