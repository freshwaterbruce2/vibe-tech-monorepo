import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';
import { LearningBridge } from '../integrations/LearningBridge.js';
import type { MemoryManager } from '../core/MemoryManager.js';

const LEARNING_DB_PATH = path.join(os.tmpdir(), 'vibetech-learning-bridge-test.db');
const MEMORY_DB_PATH = path.join(os.tmpdir(), 'vibetech-learning-bridge-memory.db');
const FAKE_DIMENSION = 8;
const MODEL_NAME = 'test-embed';

function cleanup(): void {
  for (const base of [LEARNING_DB_PATH, MEMORY_DB_PATH]) {
    for (const suffix of ['', '-wal', '-shm']) {
      const p = base + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
}

/**
 * Build a deterministic 8d unit vector from a sparse axis assignment.
 * Used to create patterns whose similarity to the query is predictable.
 */
function vec(axes: Record<number, number>): number[] {
  const v = new Array<number>(FAKE_DIMENSION).fill(0);
  for (const [k, val] of Object.entries(axes)) v[Number(k)] = val;
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => x / norm);
}

/**
 * Build a stub embedder that maps known text snippets to deterministic vectors.
 * Anything not mapped returns a vector orthogonal to all keyed entries.
 */
function buildStubEmbedder(textToVec: Map<string, number[]>): {
  embedder: EmbeddingService;
  embedSpy: ReturnType<typeof vi.fn>;
} {
  const embedSpy = vi.fn(async (text: string): Promise<number[]> => {
    return textToVec.get(text) ?? vec({ 7: 1 });
  });
  // Cast through a minimal shape — only the methods LearningBridge calls matter.
  const embedder = {
    embed: embedSpy,
    getDimension: () => FAKE_DIMENSION,
    getModel: () => MODEL_NAME,
  } as unknown as EmbeddingService;
  return { embedder, embedSpy };
}

/**
 * Create the success_patterns / code_patterns tables in the test DB.
 * Schema mirrors agent_learning.db exactly.
 */
function seedLearningDb(): Database.Database {
  const db = new Database(LEARNING_DB_PATH);
  db.exec(`
    CREATE TABLE success_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL,
      description TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      confidence_score REAL DEFAULT 0.5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used TEXT,
      metadata TEXT
    );
    CREATE TABLE code_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_type TEXT NOT NULL,
      name TEXT NOT NULL,
      code_snippet TEXT NOT NULL,
      file_path TEXT NOT NULL,
      language TEXT NOT NULL,
      imports TEXT,
      usage_count INTEGER DEFAULT 0,
      last_used INTEGER,
      tags TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(file_path, name, pattern_type)
    );
    CREATE TABLE agent_executions (
      execution_id TEXT PRIMARY KEY,
      agent_id TEXT,
      project_name TEXT,
      task_type TEXT,
      tools_used TEXT,
      started_at TEXT,
      success INTEGER,
      execution_time_ms INTEGER,
      error_message TEXT,
      context TEXT
    );
    CREATE TABLE agent_mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mistake_type TEXT,
      description TEXT,
      impact_severity TEXT,
      prevention_strategy TEXT,
      identified_at TEXT
    );
  `);
  return db;
}

describe('LearningBridge embedding-aware procedural search', () => {
  let learningDb: Database.Database;
  let bridge: LearningBridge;
  let memoryStub: MemoryManager;

  beforeEach(() => {
    cleanup();
    learningDb = seedLearningDb();
    memoryStub = {} as MemoryManager;
  });

  afterEach(() => {
    bridge?.close();
    if (learningDb && learningDb.open) learningDb.close();
    cleanup();
  });

  it('throws if no embedder is configured', async () => {
    bridge = new LearningBridge(memoryStub, LEARNING_DB_PATH);
    await expect(bridge.searchProceduralPatterns('query', 5)).rejects.toThrow(
      /requires an EmbeddingService/,
    );
  });

  it('ranks patterns by combined cosine × successRate × log(frequency)', async () => {
    // 3 success patterns with different similarity, frequency, confidence:
    // - "alpha": high similarity to query, low confidence + low frequency
    // - "beta": medium similarity, high confidence + high frequency  ← should win
    // - "gamma": low similarity, high confidence + high frequency
    const queryText = 'how to fix a build error';
    const textToVec = new Map<string, number[]>([
      [queryText, vec({ 0: 1 })],
      ['[type-alpha] Alpha pattern description', vec({ 0: 1 })],          // cos = 1.0
      ['[type-beta] Beta pattern description', vec({ 0: 0.7, 1: 0.7 })],  // cos ≈ 0.707
      ['[type-gamma] Gamma pattern description', vec({ 1: 1 })],          // cos = 0
    ]);
    const { embedder, embedSpy } = buildStubEmbedder(textToVec);

    learningDb
      .prepare(
        `INSERT INTO success_patterns (pattern_type, description, frequency, confidence_score)
         VALUES ('type-alpha', 'Alpha pattern description', 1, 0.2),
                ('type-beta',  'Beta pattern description', 50, 0.95),
                ('type-gamma', 'Gamma pattern description', 50, 0.95)`,
      )
      .run();

    bridge = new LearningBridge(memoryStub, LEARNING_DB_PATH, embedder);
    const results = await bridge.searchProceduralPatterns(queryText, 5);

    // Expect beta to win the combined-score race
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.patternType).toBe('type-beta');

    // alpha (cos=1, freq=1, conf=0.2) score = 1 × (0.5 + 0.1) × ln(2) ≈ 0.416
    // beta  (cos≈0.707, freq=50, conf=0.95) ≈ 0.707 × 0.975 × ln(51) ≈ 2.71
    // gamma (cos=0) → 0
    const alpha = results.find((r) => r.patternType === 'type-alpha');
    const beta = results.find((r) => r.patternType === 'type-beta');
    expect(beta?.score ?? 0).toBeGreaterThan(alpha?.score ?? 0);

    expect(embedSpy).toHaveBeenCalled();
  });

  it('lazily embeds and persists embeddings to metadata on first access', async () => {
    const queryText = 'lookup query';
    const patternText = '[lazy] Lazy pattern description';
    const textToVec = new Map<string, number[]>([
      [queryText, vec({ 2: 1 })],
      [patternText, vec({ 2: 1 })],
    ]);
    const { embedder, embedSpy } = buildStubEmbedder(textToVec);

    learningDb
      .prepare(
        `INSERT INTO success_patterns (pattern_type, description, frequency, confidence_score)
         VALUES ('lazy', 'Lazy pattern description', 1, 0.5)`,
      )
      .run();

    bridge = new LearningBridge(memoryStub, LEARNING_DB_PATH, embedder);

    // First call: pattern has no cached embedding — embed + persist
    await bridge.searchProceduralPatterns(queryText, 5);
    const firstCallCount = embedSpy.mock.calls.length;
    expect(firstCallCount).toBeGreaterThanOrEqual(2); // query + pattern

    // Verify embedding was persisted into metadata JSON
    const row = learningDb
      .prepare('SELECT metadata FROM success_patterns WHERE pattern_type = ?')
      .get('lazy') as { metadata: string | null };
    expect(row.metadata).toBeTruthy();
    const meta = JSON.parse(row.metadata ?? '{}');
    expect(typeof meta.embedding_b64).toBe('string');
    expect(meta.embedding_model).toBe(MODEL_NAME);
    expect(meta.embedding_dim).toBe(FAKE_DIMENSION);

    // Second call: embedder.embed() should only be called once more (for the query),
    // not for the pattern — its embedding is read from cache.
    embedSpy.mockClear();
    await bridge.searchProceduralPatterns(queryText, 5);
    expect(embedSpy).toHaveBeenCalledTimes(1);
    expect(embedSpy).toHaveBeenCalledWith(queryText);
  });

  it('includes code_patterns and stores cached embedding in tags column', async () => {
    const queryText = 'react component';
    const codeText = '[component] Button (typescript): export const Button = () => null;';
    const { embedder } = buildStubEmbedder(
      new Map<string, number[]>([
        [queryText, vec({ 3: 1 })],
        [codeText, vec({ 3: 1 })],
      ]),
    );

    learningDb
      .prepare(
        `INSERT INTO code_patterns
         (pattern_type, name, code_snippet, file_path, language, usage_count, created_at)
         VALUES ('component', 'Button', 'export const Button = () => null;',
                 'src/Button.tsx', 'typescript', 5, ?)`,
      )
      .run(Date.now());

    bridge = new LearningBridge(memoryStub, LEARNING_DB_PATH, embedder);
    const results = await bridge.searchProceduralPatterns(queryText, 5);

    const codeHit = results.find((r) => r.source === 'code_pattern');
    expect(codeHit).toBeDefined();
    expect(codeHit?.frequency).toBe(5);

    // Verify embedding was persisted into tags column
    const row = learningDb
      .prepare('SELECT tags FROM code_patterns WHERE name = ?')
      .get('Button') as { tags: string | null };
    const tags = JSON.parse(row.tags ?? '{}');
    expect(typeof tags.embedding_b64).toBe('string');
    expect(tags.embedding_dim).toBe(FAKE_DIMENSION);
  });
});
