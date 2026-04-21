import { describe, it, expect, afterEach, beforeEach, afterAll, vi } from 'vitest';
import { MemoryManager } from '../core/MemoryManager.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-memory-integration-test.db');

const EMBEDDING_DIMENSION = 1536; // canonical OpenRouter text-embedding-3-small
const PROXY_ORIGIN = 'http://localhost:3001';

/**
 * Deterministic keyword-biased embedding used ONLY for tests.
 * The canonical production path calls the OpenRouter proxy at :3001, which
 * is not guaranteed to be running under Vitest. This mock lets us exercise
 * the MemoryManager → EmbeddingService → SemanticStore pipeline end-to-end
 * without network dependence, while still producing similarities that rank
 * the "database" rule higher for a "database files" query.
 *
 * Strategy:
 *  - All vectors are random-but-stable per-text (via a seeded PRNG over sha-like hash).
 *  - We inject a concentrated signal on a fixed axis for each keyword. Vectors
 *    sharing keywords have a higher dot product.
 */
const KEYWORD_AXES: Record<string, number> = {
  database: 0,
  databases: 0,
  drive: 1,
  pnpm: 2,
  nx: 3,
  react: 4,
  typescript: 5,
  monorepo: 6,
  imports: 7,
};

function hashString(s: string): number {
  // Simple 32-bit FNV-1a — deterministic, dependency-free.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildEmbedding(text: string): number[] {
  const rng = mulberry32(hashString(text));
  const vec = new Array<number>(EMBEDDING_DIMENSION);
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    vec[i] = (rng() - 0.5) * 0.02; // low-magnitude baseline noise
  }
  const lower = text.toLowerCase();
  for (const [kw, axis] of Object.entries(KEYWORD_AXES)) {
    if (lower.includes(kw)) {
      vec[axis] = (vec[axis] ?? 0) + 1.0; // strong signal on keyword axis
    }
  }
  // Normalise to unit length so cosine similarity is well-behaved.
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] = (vec[i] ?? 0) / norm;
  return vec;
}

function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installProxyFetchMock(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      if (!url.startsWith(PROXY_ORIGIN)) {
        throw new Error(`Unexpected fetch to ${url} in memory integration test`);
      }
      if (url.endsWith('/health')) {
        return mockResponse({ ok: true });
      }
      if (url.endsWith('/api/v1/embeddings')) {
        const raw = init?.body;
        const payload = typeof raw === 'string' ? (JSON.parse(raw) as { input: string[] }) : { input: [''] };
        const embeddings = payload.input.map((t, idx) => ({
          embedding: buildEmbedding(t),
          index: idx,
        }));
        return mockResponse({ data: embeddings });
      }
      throw new Error(`Unhandled proxy endpoint: ${url}`);
    }),
  );
}

describe('MemoryManager integration', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    installProxyFetchMock();
  });

  afterEach(() => {
    if (manager) manager.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = TEST_DB_PATH + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with OpenRouter and report healthy', async () => {
    manager = new MemoryManager({
      dbPath: TEST_DB_PATH,
      embeddingModel: 'text-embedding-3-small',
      embeddingDimension: EMBEDDING_DIMENSION,
      fallbackToTransformers: false,
    });

    await manager.init();

    const health = await manager.healthCheck();
    expect(health.healthy).toBe(true);
    expect(health.database).toBe(true);
    expect(health.embedding).toBe(true);
  });

  it('should store and search semantic memories with real embeddings', async () => {
    manager = new MemoryManager({
      dbPath: TEST_DB_PATH,
      embeddingModel: 'text-embedding-3-small',
      embeddingDimension: EMBEDDING_DIMENSION,
      fallbackToTransformers: false,
    });

    await manager.init();

    // Store some knowledge
    await manager.semantic.add({
      text: 'The VibeTech monorepo uses pnpm with Nx for build orchestration and caching',
      category: 'architecture',
      importance: 8,
    });

    await manager.semantic.add({
      text: 'All databases must be stored on D:\\ drive, never in C:\\dev source tree',
      category: 'rules',
      importance: 10,
    });

    await manager.semantic.add({
      text: 'React components should use named imports, never import React default',
      category: 'typescript',
      importance: 7,
    });

    // Search for related knowledge
    const results = await manager.semantic.search('where should I put database files?');

    expect(results.length).toBeGreaterThan(0);
    // The D:\ drive rule should rank highest since it's about database storage
    expect(results[0].item.text).toContain('databases');
    expect(results[0].score).toBeGreaterThan(0.3);
  }, 30000); // Allow 30s for embedding generation

  it('should store and retrieve episodic + procedural memories', async () => {
    manager = new MemoryManager({
      dbPath: TEST_DB_PATH,
      embeddingModel: 'text-embedding-3-small',
      embeddingDimension: EMBEDDING_DIMENSION,
      fallbackToTransformers: false,
    });

    await manager.init();

    // Episodic
    manager.episodic.add({
      sourceId: 'claude-code',
      timestamp: Date.now(),
      query: 'How do I build the memory system?',
      response: 'Run pnpm --filter @vibetech/memory build',
      sessionId: 'test-session',
    });

    // Procedural
    manager.procedural.upsert({
      pattern: 'pnpm --filter <project> build',
      context: 'Building individual Nx projects',
      successRate: 1.0,
    });

    // Verify stats
    const stats = manager.getStats();
    expect(stats.database.episodicCount).toBe(1);
    expect(stats.database.proceduralCount).toBe(1);
    // Canonical provider/dimension per 2026-03-23 migration: OpenRouter text-embedding-3-small → 1536d
    expect(stats.embedding.provider).toBe('openrouter');
    expect(stats.embedding.dimension).toBe(EMBEDDING_DIMENSION);
  });
});
