import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { SemanticStore } from '../stores/SemanticStore.js';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-semantic-conflict-test.db');
const DIMENSION = 8;

function cleanupDb(): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

/**
 * Minimal embedder stub that returns vectors keyed off a string→vector map.
 * Falls back to a deterministic but distant vector for unknown text so that
 * unrelated inserts have low cosine similarity.
 */
class FakeEmbedder {
  public model = 'fake-model-v1';
  public provider: 'openrouter' | 'ollama' | 'transformers' = 'openrouter';
  public dimension = DIMENSION;
  public originalDimension = DIMENSION;
  public mismatch = false;
  private overrides = new Map<string, number[]>();

  setVector(text: string, vec: number[]): void {
    this.overrides.set(text, vec);
  }

  async embed(text: string): Promise<number[]> {
    const v = this.overrides.get(text);
    if (v) return [...v];
    // Deterministic per-text noise on a baseline orthogonal axis (axis 7).
    const vec = new Array<number>(this.dimension).fill(0);
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    vec[this.dimension - 1] = 1; // far axis from typical test vectors on axis 0
    vec[0] = ((h & 0xff) / 255) * 0.001; // tiny perturbation
    return vec;
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

/**
 * Build a unit-length vector that hits a target axis with the given magnitude
 * and fills the remaining axes with small noise. Cosine similarity between two
 * such vectors is approximately the product of their target magnitudes when
 * the noise is small.
 */
function vectorOnAxis(axis: number, magnitude: number, noise = 0.01): number[] {
  const vec = new Array<number>(DIMENSION).fill(0);
  for (let i = 0; i < DIMENSION; i++) vec[i] = (Math.sin(i * 7 + axis) * noise);
  vec[axis] = magnitude;
  // Normalise.
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

describe('SemanticStore conflict enforcement', () => {
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
  });

  it('inserts when similarity is below the review threshold', async () => {
    embedder.setVector('alpha rule', vectorOnAxis(0, 1));
    embedder.setVector('totally orthogonal beta', vectorOnAxis(3, 1));

    const first = await store.add({ text: 'alpha rule', importance: 5 });
    expect(first.status).toBe('inserted');

    const second = await store.add({ text: 'totally orthogonal beta', importance: 5 });
    expect(second.status).toBe('inserted');

    expect(store.count()).toBe(2);
  });

  it('rejects writes that fall in the 0.85-0.92 review band', async () => {
    embedder.setVector('original rule', vectorOnAxis(0, 1));
    // Mostly the same direction, slight rotation → similarity ≈ 0.86
    const reviewBand = vectorOnAxis(0, 1).map((v, i) => v + (i === 1 ? 0.6 : 0));
    let norm = 0;
    for (const v of reviewBand) norm += v * v;
    norm = Math.sqrt(norm);
    const normalised = reviewBand.map((v) => v / norm);
    embedder.setVector('near duplicate rule', normalised);

    const inserted = await store.add({ text: 'original rule', importance: 5 });
    expect(inserted.status).toBe('inserted');
    const insertedId = inserted.status === 'inserted' ? inserted.id : -1;

    const rejected = await store.add({ text: 'near duplicate rule', importance: 5 });
    expect(rejected.status).toBe('rejected_duplicate');
    if (rejected.status === 'rejected_duplicate') {
      expect(rejected.existingId).toBe(insertedId);
      expect(rejected.similarity).toBeGreaterThanOrEqual(0.85);
      expect(rejected.similarity).toBeLessThan(0.92);
      expect(rejected.conflicts.length).toBeGreaterThan(0);
    }

    // No new row inserted.
    expect(store.count()).toBe(1);
  });

  it('merges into the existing row when similarity is >= 0.92', async () => {
    embedder.setVector('canonical rule', vectorOnAxis(0, 1));
    // Identical direction → similarity = 1.0
    embedder.setVector('canonical rule (rephrased)', vectorOnAxis(0, 1));

    const inserted = await store.add({ text: 'canonical rule', importance: 5 });
    expect(inserted.status).toBe('inserted');
    const insertedId = inserted.status === 'inserted' ? inserted.id : -1;

    // Confirm initial state.
    const before = store.getById(insertedId);
    expect(before).not.toBeNull();
    expect(before?.accessCount).toBe(0);
    expect(before?.importance).toBe(5);

    const merged = await store.add({
      text: 'canonical rule (rephrased)',
      importance: 9, // higher importance than existing
    });
    expect(merged.status).toBe('merged');
    if (merged.status === 'merged') {
      expect(merged.existingId).toBe(insertedId);
      expect(merged.similarity).toBeGreaterThanOrEqual(0.92);
    }

    // Existing row updated, no new row.
    expect(store.count()).toBe(1);
    const after = store.getById(insertedId);
    expect(after?.accessCount).toBe(1);
    expect(after?.importance).toBe(9); // lifted to max(existing=5, new=9)

    // Merged-from text is captured in metadata.
    const meta = after?.metadata as { mergedFrom?: Array<{ text: string }> } | undefined;
    expect(meta?.mergedFrom).toBeDefined();
    expect(meta?.mergedFrom?.[0]?.text).toBe('canonical rule (rephrased)');
  });

  it('does not lower importance during a merge', async () => {
    embedder.setVector('high-importance rule', vectorOnAxis(0, 1));
    embedder.setVector('low-importance duplicate', vectorOnAxis(0, 1));

    const inserted = await store.add({ text: 'high-importance rule', importance: 10 });
    expect(inserted.status).toBe('inserted');
    const id = inserted.status === 'inserted' ? inserted.id : -1;

    const merged = await store.add({ text: 'low-importance duplicate', importance: 1 });
    expect(merged.status).toBe('merged');

    const after = store.getById(id);
    expect(after?.importance).toBe(10); // stays at max
  });
});
