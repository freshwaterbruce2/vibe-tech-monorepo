import type Database from 'better-sqlite3';
import { MemoryDecay } from '../consolidation/MemoryDecay.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { EmbeddingService } from '../embeddings/EmbeddingService.js';
import { EpisodicStore } from '../stores/EpisodicStore.js';
import { ProceduralStore } from '../stores/ProceduralStore.js';
import { SemanticStore } from '../stores/SemanticStore.js';
import type { MemoryConfig } from '../types/index.js';

/**
 * Circular-buffer latency tracker per tool name (Phase 1).
 * Stores up to maxEntries per tool; exposes p50/p95/p99.
 */
export class LatencyTracker {
  private readonly maxEntries: number;
  private readonly buckets = new Map<string, number[]>();

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  record(toolName: string, elapsedMs: number): void {
    let buf = this.buckets.get(toolName);
    if (!buf) {
      buf = [];
      this.buckets.set(toolName, buf);
    }
    buf.push(elapsedMs);
    if (buf.length > this.maxEntries) {
      buf.shift(); // evict oldest
    }
  }

  getStats(
    toolName: string,
  ): { p50: number; p95: number; p99: number; count: number } | null {
    const buf = this.buckets.get(toolName);
    if (!buf || buf.length === 0) return null;

    const sorted = [...buf].sort((a, b) => a - b);
    const idx = (pct: number) => Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1);

    return {
      p50: sorted[idx(50)]!,
      p95: sorted[idx(95)]!,
      p99: sorted[idx(99)]!,
      count: sorted.length,
    };
  }

  getToolNames(): string[] {
    return Array.from(this.buckets.keys());
  }
}

/**
 * Central memory system manager
 * Coordinates episodic, semantic, and procedural stores
 */
export class MemoryManager {
  private dbManager: DatabaseManager;
  private embeddingService: EmbeddingService;

  public episodic!: EpisodicStore;
  public semantic!: SemanticStore;
  public procedural!: ProceduralStore;
  public decay!: MemoryDecay;
  public latency: LatencyTracker = new LatencyTracker();

  /**
   * Expose underlying database for consumers that need direct SQL access
   * (e.g. MemoryConsolidator, HierarchicalSummarizer)
   */
  getDb(): Database.Database {
    return this.dbManager.getDb();
  }

  constructor(private config: MemoryConfig) {
    this.dbManager = new DatabaseManager(config);
    this.embeddingService = new EmbeddingService(config);
  }

  /**
   * Initialize all memory stores
   */
  async init(): Promise<void> {
    // Initialize database
    await this.dbManager.init();

    // Initialize embedding service
    await this.embeddingService.init();

    const db = this.dbManager.getDb();

    // Wire up persistent embedding cache
    this.embeddingService.setDb(db);

    // Initialize stores
    this.episodic = new EpisodicStore(db);
    this.semantic = new SemanticStore(db, this.embeddingService);
    this.procedural = new ProceduralStore(db);
    this.decay = new MemoryDecay();

    console.error('Memory system initialized');
    console.error(`- Database: ${this.config.dbPath}`);
    console.error(`- Embedding provider: ${this.embeddingService.getProvider()}`);
    console.error(`- Embedding dimension: ${this.embeddingService.getDimension()}d`);
    console.error(
      `- Vector extension: ${this.dbManager.isVectorExtensionLoaded() ? 'loaded' : 'fallback'}`,
    );
  }

  /**
   * Get system statistics
   */
  getStats() {
    const dbStats = this.dbManager.getStats();

    // Count semantic rows whose stored embedding_model differs from current model (Phase 2)
    let staleDimensionCount = 0;
    try {
      const currentModel = this.embeddingService.getModel();
      const row = this.dbManager
        .getDb()
        .prepare(
          `SELECT COUNT(*) as cnt FROM semantic_memory
           WHERE embedding_model IS NOT NULL AND embedding_model != ?`,
        )
        .get(currentModel) as { cnt: number };
      staleDimensionCount = row.cnt;
    } catch {
      /* non-critical — column may not exist on old DBs */
    }

    // Collect latency snapshots for tracked tools (Phase 1)
    const latencyStats: Record<string, { p50: number; p95: number; p99: number; count: number }> =
      {};
    for (const toolName of this.latency.getToolNames()) {
      const s = this.latency.getStats(toolName);
      if (s) latencyStats[toolName] = s;
    }

    return {
      database: dbStats,
      embedding: {
        provider: this.embeddingService.getProvider(),
        dimension: this.embeddingService.getDimension(),
        cache: this.embeddingService.getCacheStats(),
        dimensionMismatch: this.embeddingService.hasDimensionMismatch(),
        modelVersion: this.embeddingService.getModel(),
        staleDimensionCount,
      },
      vectorExtension: this.dbManager.isVectorExtensionLoaded(),
      decay: this.decay ? this.decay.getStats(this.dbManager.getDb()) : undefined,
      latency: latencyStats,
    };
  }

  /**
   * Optimize database (vacuum, analyze)
   */
  optimize(): void {
    this.dbManager.optimize();
  }

  /**
   * Close all connections
   */
  close(): void {
    this.dbManager.close();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    database: boolean;
    embedding: boolean;
    message?: string;
  }> {
    try {
      // Check database
      const stats = this.dbManager.getStats();
      const databaseHealthy = stats.episodicCount >= 0 && stats.semanticCount >= 0;

      // Check embedding service
      let embeddingHealthy = true;
      try {
        await this.embeddingService.embed('health check');
      } catch {
        embeddingHealthy = false;
      }

      const healthy = databaseHealthy && embeddingHealthy;

      return {
        healthy,
        database: databaseHealthy,
        embedding: embeddingHealthy,
        message: healthy ? 'All systems operational' : 'Some systems degraded',
      };
    } catch (error) {
      return {
        healthy: false,
        database: false,
        embedding: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
