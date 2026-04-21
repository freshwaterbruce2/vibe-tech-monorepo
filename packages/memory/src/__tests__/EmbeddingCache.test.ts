import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { EmbeddingService } from '../embeddings/EmbeddingService.js';

const TEST_DB_PATH = path.join(os.tmpdir(), 'vibetech-embedding-cache-test.db');
const FAKE_DIMENSION = 4;

function cleanupDb() {
  for (const suffix of ['', '-wal', '-shm']) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

/**
 * Build an EmbeddingService that bypasses real model inference.
 * We spy on the private embedder to return deterministic vectors.
 */
function createTestService(): EmbeddingService {
  const service = new EmbeddingService({
    dbPath: TEST_DB_PATH,
    embeddingModel: 'test-model',
    embeddingDimension: FAKE_DIMENSION,
    fallbackToTransformers: false,
  });
  return service;
}

describe('EmbeddingService Cache', () => {
  let dbManager: DatabaseManager;
  let service: EmbeddingService;

  beforeEach(async () => {
    cleanupDb();
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    await dbManager.init();
    service = createTestService();
    service.setDb(dbManager.getDb());
  });

  afterEach(() => {
    dbManager.close();
    cleanupDb();
  });

  // ── Cache Stats ─────────────────────────────────────────

  describe('getCacheStats', () => {
    it('starts with zero hits and misses', () => {
      const stats = service.getCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.memCacheSize).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  // ── Content Hashing ─────────────────────────────────────

  describe('hashContent', () => {
    it('returns consistent hash for same input', () => {
      // Access via prototype cast since hashContent is private
      const hash1 = (service as unknown as { hashContent(t: string): string }).hashContent(
        'hello world',
      );
      const hash2 = (service as unknown as { hashContent(t: string): string }).hashContent(
        'hello world',
      );
      expect(hash1).toBe(hash2);
    });

    it('returns different hash for different input', () => {
      const accessor = service as unknown as { hashContent(t: string): string };
      const hash1 = accessor.hashContent('hello');
      const hash2 = accessor.hashContent('world');
      expect(hash1).not.toBe(hash2);
    });

    it('produces hex string of expected length', () => {
      const hash = (service as unknown as { hashContent(t: string): string }).hashContent('test');
      // SHA-256 hex truncated to 16 chars by hashContent
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  // ── Memory Cache (LRU) ─────────────────────────────────

  describe('setMemCache', () => {
    it('stores and retrieves from memory cache', () => {
      const accessor = service as unknown as {
        setMemCache(hash: string, embedding: number[]): void;
        memCache: Map<string, { embedding: number[]; timestamp: number }>;
      };

      accessor.setMemCache('test-hash', [0.1, 0.2, 0.3, 0.4]);
      expect(accessor.memCache.has('test-hash')).toBe(true);
      const cached = accessor.memCache.get('test-hash')!.embedding;
      expect(cached).toHaveLength(4);
      expect(cached[0]).toBeCloseTo(0.1, 5);
    });

    it('evicts oldest entry when cache is full', () => {
      const accessor = service as unknown as {
        setMemCache(hash: string, embedding: number[]): void;
        memCache: Map<string, { embedding: number[]; timestamp: number }>;
        maxMemCacheSize: number;
      };

      // Fill cache to max
      const maxSize = accessor.maxMemCacheSize;
      for (let i = 0; i < maxSize; i++) {
        accessor.setMemCache(`hash-${i}`, [i]);
      }
      expect(accessor.memCache.size).toBe(maxSize);

      // Add one more — should evict the first
      accessor.setMemCache('hash-overflow', [999]);
      expect(accessor.memCache.size).toBe(maxSize);
      expect(accessor.memCache.has('hash-0')).toBe(false);
      expect(accessor.memCache.has('hash-overflow')).toBe(true);
    });
  });

  // ── SQLite Persistent Cache ─────────────────────────────

  describe('SQLite cache', () => {
    it('embedding_cache table exists after init', () => {
      const db = dbManager.getDb();
      const row = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='embedding_cache'")
        .get() as { name: string } | undefined;
      expect(row).toBeDefined();
      expect(row!.name).toBe('embedding_cache');
    });

    it('can insert and read back embeddings from cache table', () => {
      const db = dbManager.getDb();
      const embedding = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const blob = Buffer.from(embedding.buffer);

      db.prepare(
        'INSERT OR REPLACE INTO embedding_cache (content_hash, embedding, model, dimension) VALUES (?, ?, ?, ?)',
      ).run('test-hash-abc', blob, 'test-model', FAKE_DIMENSION);

      const row = db
        .prepare('SELECT embedding, dimension FROM embedding_cache WHERE content_hash = ?')
        .get('test-hash-abc') as { embedding: Buffer; dimension: number } | undefined;

      expect(row).toBeDefined();
      expect(row!.dimension).toBe(FAKE_DIMENSION);

      const recovered = Array.from(
        new Float32Array(
          row!.embedding.buffer,
          row!.embedding.byteOffset,
          row!.embedding.byteLength / 4,
        ),
      );
      // Float32 has limited precision — use closeTo comparison
      expect(recovered).toHaveLength(4);
      expect(recovered[0]).toBeCloseTo(0.1, 5);
      expect(recovered[1]).toBeCloseTo(0.2, 5);
      expect(recovered[2]).toBeCloseTo(0.3, 5);
      expect(recovered[3]).toBeCloseTo(0.4, 5);
    });
  });

  // ── Cosine Similarity ───────────────────────────────────

  describe('cosineSimilarity', () => {
    it('returns 1.0 for identical vectors', () => {
      const v = [0.1, 0.2, 0.3, 0.4];
      expect(service.cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('returns 0.0 for orthogonal vectors', () => {
      const a = [1, 0, 0, 0];
      const b = [0, 1, 0, 0];
      expect(service.cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
    });

    it('returns negative for opposite vectors', () => {
      const a = [1, 0, 0, 0];
      const b = [-1, 0, 0, 0];
      expect(service.cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
    });

    it('handles zero vectors gracefully', () => {
      const zero = [0, 0, 0, 0];
      const v = [1, 2, 3, 4];
      const result = service.cosineSimilarity(zero, v);
      expect(Number.isNaN(result) || result === 0).toBe(true);
    });
  });

  // ── Provider / Dimension ────────────────────────────────

  describe('getProvider / getDimension', () => {
    it('returns configured dimension', () => {
      expect(service.getDimension()).toBe(FAKE_DIMENSION);
    });

    it('returns provider name', () => {
      const provider = service.getProvider();
      // Canonical provider is OpenRouter (1536d). 'transformers' is the offline
      // fallback; 'ollama' is retained in the union for legacy compat.
      expect(['openrouter', 'ollama', 'transformers']).toContain(provider);
    });
  });
});
