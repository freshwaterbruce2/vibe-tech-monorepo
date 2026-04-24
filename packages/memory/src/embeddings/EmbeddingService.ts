import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { Ollama } from 'ollama';
import { createLogger } from '@vibetech/logger';
import type { EmbeddingProvider, MemoryConfig } from '../types/index.js';

const logger = createLogger('EmbeddingService');

const PROVIDER_DEFAULTS: Record<EmbeddingProvider, { endpoint: string; model: string; dimension: number }> = {
  openrouter: { endpoint: 'http://localhost:3001', model: 'text-embedding-3-small', dimension: 1536 },
  ollama: { endpoint: 'http://localhost:11434', model: 'nomic-embed-text', dimension: 768 },
  transformers: { endpoint: '', model: 'Xenova/all-MiniLM-L6-v2', dimension: 384 },
};

interface TransformerPipelineResult {
  data: ArrayLike<number>;
}

type TransformerPipeline = (
  text: string,
  options: { pooling: string; normalize: boolean },
) => Promise<TransformerPipelineResult>;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export class EmbeddingService {
  private provider: EmbeddingProvider;
  private endpoint: string;
  private model: string;
  private dimension: number;
  private initDimension: number; // dimension at init time (for guard)
  private fallbackEnabled: boolean;
  private explicitProvider: boolean; // user pinned a provider — never silently switch
  private transformerPipeline: TransformerPipeline | null = null;
  private ollamaClient: Ollama | null = null;
  private _dimensionMismatch = false;

  // Two-tier cache: in-memory LRU + SQLite persistent
  private memCache = new Map<string, { embedding: number[]; timestamp: number }>();
  private readonly maxMemCacheSize = 500;
  private readonly maxCacheAgeMs = 60 * 60 * 1000; // 1 hour TTL
  private db: Database.Database | null = null;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(config: MemoryConfig) {
    this.explicitProvider = config.embeddingProvider !== undefined;
    this.provider = config.embeddingProvider ?? 'openrouter';
    const defaults = PROVIDER_DEFAULTS[this.provider];
    this.model = config.embeddingModel ?? defaults.model;
    this.dimension = config.embeddingDimension ?? defaults.dimension;
    this.endpoint = config.embeddingEndpoint ?? defaults.endpoint;
    this.initDimension = this.dimension;
    // Explicit provider opts out of silent fallback — fail loud instead.
    this.fallbackEnabled = this.explicitProvider ? false : (config.fallbackToTransformers ?? true);
  }

  /**
   * Initialize embedding service: probe the configured provider's endpoint.
   * If the user pinned a provider via config, refuse to silently switch.
   */
  async init(): Promise<void> {
    if (this.provider === 'transformers') {
      // Transformers loads lazily on first embed — nothing to probe.
      logger.info(`Using Transformers.js with ${this.model} (${this.dimension}d, OFFLINE)`);
      return;
    }

    try {
      await this.probeProvider();
      logger.info(`Using ${this.provider} with ${this.model} (${this.dimension}d) at ${this.endpoint}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`[EmbeddingService] ${this.provider} not available: ${message}`);
      if (this.explicitProvider) {
        throw new Error(`Explicit provider '${this.provider}' unavailable at ${this.endpoint}: ${message}`);
      }
      if (this.fallbackEnabled) {
        this.activateTransformersFallback();
      } else {
        throw new Error(`${this.provider} unavailable and fallback disabled`);
      }
    }
  }

  /** Probe the configured provider's health endpoint. Throws on failure. */
  private async probeProvider(): Promise<void> {
    if (this.provider === 'openrouter') {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`OpenRouter proxy returned ${response.status}`);
      return;
    }
    if (this.provider === 'ollama') {
      // Ollama exposes /api/tags as a cheap connectivity check
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const installed = data.models?.map((m) => m.name) ?? [];
      const hasModel = installed.some((n) => n === this.model || n.startsWith(`${this.model}:`));
      if (!hasModel) {
        throw new Error(
          `Ollama model '${this.model}' not installed (have: ${installed.join(', ') || 'none'}). Run: ollama pull ${this.model}`,
        );
      }
      this.ollamaClient = new Ollama({ host: this.endpoint });
      return;
    }
    throw new Error(`probeProvider: unsupported provider '${this.provider}'`);
  }

  /**
   * Switch to Transformers.js 384d fallback and set dimension mismatch guard.
   * Centralised to avoid duplicated state-transition logic.
   */
  private activateTransformersFallback(): void {
    logger.warn('[EmbeddingService] Falling back to Transformers.js (384d, OFFLINE MODE)');
    const previousDimension = this.dimension;
    this.provider = 'transformers';
    this.dimension = 384;
    if (previousDimension !== 384) {
      this._dimensionMismatch = true;
      logger.warn(
        `[EmbeddingService] WARNING: Dimension changed from ${previousDimension}d to 384d`,
      );
      logger.warn(
        `[EmbeddingService] Existing ${previousDimension}d vectors will NOT be searchable`,
      );
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
    if (this.provider === 'openrouter') {
      embedding = await this.embedWithOpenRouter(text);
    } else if (this.provider === 'ollama') {
      embedding = await this.embedWithOllama(text);
    } else {
      embedding = await this.embedWithTransformers(text);
    }
    if (embedding.length !== this.dimension) {
      throw new Error(
        `Embedding dimension mismatch: provider ${this.provider} returned ${embedding.length}d, expected ${this.dimension}d`,
      );
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
   * Generate embeddings using OpenRouter API via localhost:3001 proxy
   * Reuses the batch/retry pattern from nova-agent RAGEmbedder
   */
  private async embedWithOpenRouter(text: string): Promise<number[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`${this.endpoint}/api/v1/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            input: [text],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Embedding API error ${response.status}: ${errorText}`);
        }

        const data = (await response.json()) as {
          data: Array<{ embedding: number[]; index: number }>;
        };

        const vec = data.data[0]?.embedding;
        if (!vec || vec.length === 0) {
          throw new Error('Empty embedding returned from API');
        }

        return vec;
      } catch (error) {
        lastError = error as Error;

        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          logger.debug(
            `[EmbeddingService] Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${(error as Error).message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted — try fallback (only if not pinned to a provider)
    if (this.fallbackEnabled && !this.explicitProvider) {
      logger.warn('[EmbeddingService] OpenRouter failed after retries, falling back to Transformers.js');
      this.activateTransformersFallback();
      return this.embedWithTransformers(text);
    }

    throw new Error(`Embedding API failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
  }

  /**
   * Generate embeddings via local Ollama daemon.
   * Uses the `ollama` npm client; assumes the model has been pulled via `ollama pull <model>`.
   * No silent fallback — if Ollama fails, throw so the caller sees the real error.
   */
  private async embedWithOllama(text: string): Promise<number[]> {
    if (!this.ollamaClient) {
      this.ollamaClient = new Ollama({ host: this.endpoint });
    }
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.ollamaClient.embed({ model: this.model, input: text });
        const vec = response.embeddings?.[0];
        if (!vec || vec.length === 0) {
          throw new Error(`Ollama returned empty embedding for model '${this.model}'`);
        }
        return vec;
      } catch (error) {
        lastError = error as Error;
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          logger.debug(
            `[EmbeddingService] Ollama attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw new Error(`Ollama embedding failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
  }

  /**
   * Generate embeddings using Transformers.js (offline fallback)
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

      const pipeline = this.transformerPipeline;
      if (!pipeline) {
        throw new Error('Transformers.js pipeline failed to initialize');
      }
      const output = await pipeline(text, {
        pooling: 'mean',
        normalize: true,
      });

      // Convert Tensor to array
      return Array.from(output.data);
    } catch (error) {
      logger.error('Transformers.js embedding failed:', undefined, error instanceof Error ? error : new Error(String(error)));
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
   * Check if dimension changed at runtime (guard for Phase 4)
   * When true, existing vectors in the DB are incompatible with current embeddings.
   */
  hasDimensionMismatch(): boolean {
    return this._dimensionMismatch;
  }

  /**
   * Get the dimension that was configured at init time
   */
  getOriginalDimension(): number {
    return this.initDimension;
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

  /** Get the current embedding model name */
  getModel(): string {
    return this.model;
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
