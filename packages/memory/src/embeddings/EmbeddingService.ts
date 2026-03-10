import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { Ollama } from 'ollama';
import type { EmbeddingProvider, MemoryConfig } from '../types/index.js';

interface TransformerPipelineResult {
  data: ArrayLike<number>;
}

type TransformerPipeline = (
  text: string,
  options: { pooling: string; normalize: boolean },
) => Promise<TransformerPipelineResult>;

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private ollama: Ollama | null = null;
  private model: string;
  private dimension: number;
  private fallbackEnabled: boolean;
  private transformerPipeline: TransformerPipeline | null = null;

  // Two-tier cache: in-memory LRU + SQLite persistent
  private memCache = new Map<string, { embedding: number[]; timestamp: number }>();
  private readonly maxMemCacheSize = 500;
  private readonly maxCacheAgeMs = 60 * 60 * 1000; // 1 hour TTL
  private db: Database.Database | null = null;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: MemoryConfig) {
    this.model = config.embeddingModel ?? 'nomic-embed-text';
    this.dimension = config.embeddingDimension ?? 768; // nomic-embed-text default
    this.fallbackEnabled = config.fallbackToTransformers ?? true;
    this.provider = 'ollama'; // Start with Ollama, fallback if needed
  }

  /**
   * Initialize embedding service (check Ollama availability)
   */
  async init(): Promise<void> {
    try {
      this.ollama = new Ollama({ host: 'http://localhost:11434' });

      // Verify model is available
      const models = await this.ollama.list();
      const modelExists = models.models.some((m) => m.name.includes(this.model));

      if (!modelExists) {
        console.warn(
          `Ollama model ${this.model} not found. Available models:`,
          models.models.map((m) => m.name),
        );
        if (this.fallbackEnabled) {
          console.error('Falling back to Transformers.js');
          this.provider = 'transformers';
          this.dimension = 384; // all-MiniLM-L6-v2 default
        } else {
          throw new Error(`Ollama model ${this.model} not available and fallback disabled`);
        }
      } else {
        this.provider = 'ollama';
        console.error(`Using Ollama with ${this.model} (${this.dimension}d embeddings)`);
      }
    } catch (error) {
      console.warn('Ollama not available:', error);
      if (this.fallbackEnabled) {
        console.error('Falling back to Transformers.js');
        this.provider = 'transformers';
        this.dimension = 384;
      } else {
        throw new Error('Ollama unavailable and fallback disabled');
      }
    }
  }

  /**
   * Wire up SQLite for persistent embedding cache (called after DB init)
   */
  setDb(db: Database.Database): void {
    this.db = db;
  }

  /**
   * Generate embedding for text (with caching)
   */
  async embed(text: string): Promise<number[]> {
    const hash = this.hashContent(text);

    // Tier 1: in-memory LRU cache
    const memHit = this.memCache.get(hash);
    if (memHit) {
      this.cacheHits++;
      return memHit.embedding;
    }

    // Tier 2: SQLite persistent cache
    if (this.db) {
      try {
        const row = this.db
          .prepare(
            'SELECT embedding, dimension FROM embedding_cache WHERE content_hash = ? AND model = ?',
          )
          .get(hash, this.model) as { embedding: Buffer; dimension: number } | undefined;

        if (row?.dimension === this.dimension) {
          const embedding = Array.from(
            new Float32Array(
              row.embedding.buffer,
              row.embedding.byteOffset,
              row.embedding.byteLength / 4,
            ),
          );
          // Promote to memory cache
          this.setMemCache(hash, embedding);
          this.db
            .prepare('UPDATE embedding_cache SET hit_count = hit_count + 1 WHERE content_hash = ?')
            .run(hash);
          this.cacheHits++;
          return embedding;
        }
      } catch {
        /* cache miss or table missing, proceed to compute */
      }
    }

    // Cache miss — compute embedding
    this.cacheMisses++;
    let embedding: number[];
    if (this.provider === 'ollama') {
      embedding = await this.embedWithOllama(text);
    } else {
      embedding = await this.embedWithTransformers(text);
    }

    // Store in both caches
    this.setMemCache(hash, embedding);
    if (this.db) {
      try {
        const blob = Buffer.from(new Float32Array(embedding).buffer);
        this.db
          .prepare(
            'INSERT OR REPLACE INTO embedding_cache (content_hash, embedding, model, dimension) VALUES (?, ?, ?, ?)',
          )
          .run(hash, blob, this.model, this.dimension);
      } catch {
        /* non-critical — cache write failure */
      }
    }

    return embedding;
  }

  /** Content hash for cache key */
  private hashContent(text: string): string {
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
  }

  /** LRU-style memory cache setter with TTL eviction */
  private setMemCache(hash: string, embedding: number[]): void {
    // Sweep expired entries
    const now = Date.now();
    for (const [key, entry] of this.memCache) {
      if (now - entry.timestamp > this.maxCacheAgeMs) {
        this.memCache.delete(key);
      }
    }
    // Evict oldest if still over capacity
    if (this.memCache.size >= this.maxMemCacheSize) {
      const firstKey = this.memCache.keys().next().value;
      if (firstKey) this.memCache.delete(firstKey);
    }
    this.memCache.set(hash, { embedding, timestamp: now });
  }

  /** Get cache statistics */
  getCacheStats(): { hits: number; misses: number; memCacheSize: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      memCacheSize: this.memCache.size,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    };
  }

  /**
   * Generate embeddings using Ollama
   */
  private async embedWithOllama(text: string): Promise<number[]> {
    if (!this.ollama) {
      throw new Error('Ollama not initialized');
    }

    try {
      const response = await this.ollama.embeddings({
        model: this.model,
        prompt: text,
      });

      return response.embedding;
    } catch (error) {
      console.error('Ollama embedding failed:', error);

      // Fallback if enabled
      if (this.fallbackEnabled) {
        console.error('Falling back to Transformers.js');
        this.provider = 'transformers';
        this.dimension = 384;
        return this.embedWithTransformers(text);
      }

      throw error;
    }
  }

  /**
   * Generate embeddings using Transformers.js (fallback)
   */
  private async embedWithTransformers(text: string): Promise<number[]> {
    try {
      // Lazy-load and cache the pipeline
      if (!this.transformerPipeline) {
        // Dynamic import - @xenova/transformers is a devDependency/optional fallback
        const transformers = await (Function(
          'return import("@xenova/transformers")',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        )() as Promise<any>);
        this.transformerPipeline = await transformers.pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
        );
      }

      const pipeline = this.transformerPipeline!;
      const output = await pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert Tensor to array
      return Array.from(output.data);
    } catch (error) {
      console.error('Transformers.js embedding failed:', error);
      throw error;
    }
  }

  /**
   * Get current provider
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  /**
   * Purge stale entries from the persistent SQLite embedding cache.
   * Removes entries not accessed in the last 30 days.
   */
  purgeStaleCache(): number {
    if (!this.db) return 0;
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    try {
      const result = this.db
        .prepare('DELETE FROM embedding_cache WHERE created_at < ?')
        .run(thirtyDaysAgo);
      return result.changes;
    } catch {
      return 0;
    }
  }

  getDimension(): number {
    return this.dimension;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      dotProduct += ai * bi;
      normA += ai * ai;
      normB += bi * bi;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
