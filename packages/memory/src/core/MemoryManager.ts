import type Database from 'better-sqlite3';
import { MemoryDecay } from '../consolidation/MemoryDecay.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { EmbeddingService } from '../embeddings/EmbeddingService.js';
import { EpisodicStore } from '../stores/EpisodicStore.js';
import { ProceduralStore } from '../stores/ProceduralStore.js';
import { SemanticStore } from '../stores/SemanticStore.js';
import type { MemoryConfig } from '../types/index.js';

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

    return {
      database: dbStats,
      embedding: {
        provider: this.embeddingService.getProvider(),
        dimension: this.embeddingService.getDimension(),
        cache: this.embeddingService.getCacheStats(),
        dimensionMismatch: this.embeddingService.hasDimensionMismatch(),
      },
      vectorExtension: this.dbManager.isVectorExtensionLoaded(),
      decay: this.decay ? this.decay.getStats(this.dbManager.getDb()) : undefined,
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
