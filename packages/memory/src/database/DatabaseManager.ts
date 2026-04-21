import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import * as sqliteVec from 'sqlite-vec';
import { createLogger } from '@vibetech/logger';
import type { MemoryConfig } from '../types/index.js';

const logger = createLogger('DatabaseManager');

export class DatabaseManager {
  private db: Database.Database | null = null;
  private dbPath: string;
  private vectorExtensionLoaded = false;

  constructor(config: MemoryConfig) {
    this.dbPath = config.dbPath;
  }

  /**
   * Initialize database connection and create tables
   */
  async init(): Promise<void> {
    // Ensure D:\databases directory exists
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Connect to database
    this.db = new Database(this.dbPath);

    // Performance pragmas
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('cache_size = -64000'); // 64MB page cache
    this.db.pragma('synchronous = NORMAL'); // Faster writes with WAL

    // Load sqlite-vec extension for vector operations
    this.loadVectorExtension();

    // Create tables
    this.createTables();

    // Run schema migrations
    this.runMigrations();
  }

  /**
   * Load sqlite-vec extension for vector similarity search
   */
  private loadVectorExtension(): void {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Use sqlite-vec's load() API for proper cross-platform loading
      sqliteVec.load(this.db);
      this.vectorExtensionLoaded = true;
      logger.info('sqlite-vec extension loaded successfully');
    } catch {
      this.vectorExtensionLoaded = false;
      logger.warn('sqlite-vec extension not available, vector search will use in-memory fallback');
    }
  }

  /** Whether the sqlite-vec native extension is active */
  isVectorExtensionLoaded(): boolean {
    return this.vectorExtensionLoaded;
  }

  /**
   * Create all required tables
   */
  private createTables(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Episodic memory table (timestamped events)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS episodic_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        query TEXT NOT NULL,
        response TEXT NOT NULL,
        session_id TEXT,
        metadata TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        last_accessed INTEGER,
        access_count INTEGER DEFAULT 0
      )
    `);
    // Migrate existing episodic rows: add columns if they don't exist (must run before index creation)
    try {
      this.db.exec(`ALTER TABLE episodic_memory ADD COLUMN last_accessed INTEGER`);
    } catch {
      /* column already exists */
    }
    try {
      this.db.exec(`ALTER TABLE episodic_memory ADD COLUMN access_count INTEGER DEFAULT 0`);
    } catch {
      /* column already exists */
    }

    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memory (timestamp DESC)`,
    );
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_episodic_source ON episodic_memory (source_id)`);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_episodic_last_accessed ON episodic_memory (last_accessed)`,
    );

    // Semantic memory table (long-term knowledge with embeddings)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS semantic_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        embedding BLOB,
        category TEXT,
        importance INTEGER DEFAULT 5,
        created INTEGER NOT NULL,
        last_accessed INTEGER,
        access_count INTEGER DEFAULT 0,
        metadata TEXT
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_semantic_category ON semantic_memory (category)`);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_semantic_importance ON semantic_memory (importance DESC)`,
    );
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_semantic_last_accessed ON semantic_memory (last_accessed)`,
    );

    // Procedural memory table (command patterns, workflows)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS procedural_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL UNIQUE,
        context TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        success_rate REAL DEFAULT 1.0,
        last_used INTEGER,
        metadata TEXT
      )
    `);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_procedural_frequency ON procedural_memory (frequency DESC)`,
    );
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_procedural_last_used ON procedural_memory (last_used)`,
    );

    // Health metrics table (system health tracking)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS health_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        metric_type TEXT NOT NULL,
        value REAL NOT NULL,
        metadata TEXT
      )
    `);
    this.db.exec(
      `CREATE INDEX IF NOT EXISTS idx_health_timestamp ON health_metrics (timestamp DESC)`,
    );

    // Embedding cache table (content hash → vector + metadata)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embedding_cache (
        content_hash TEXT PRIMARY KEY,
        embedding BLOB NOT NULL,
        model TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        hit_count INTEGER DEFAULT 0
      )
    `);

    // FTS5 full-text index on episodic memory (external-content, no data duplication)
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS episodic_fts USING fts5(
        query, response,
        content='episodic_memory',
        content_rowid='id'
      )
    `);

    // Auto-sync triggers: keep FTS5 index in sync with episodic_memory
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS episodic_fts_ai AFTER INSERT ON episodic_memory BEGIN
        INSERT INTO episodic_fts(rowid, query, response) VALUES (new.id, new.query, new.response);
      END
    `);
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS episodic_fts_ad AFTER DELETE ON episodic_memory BEGIN
        INSERT INTO episodic_fts(episodic_fts, rowid, query, response)
          VALUES('delete', old.id, old.query, old.response);
      END
    `);
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS episodic_fts_au AFTER UPDATE ON episodic_memory BEGIN
        INSERT INTO episodic_fts(episodic_fts, rowid, query, response)
          VALUES('delete', old.id, old.query, old.response);
        INSERT INTO episodic_fts(rowid, query, response) VALUES (new.id, new.query, new.response);
      END
    `);

    // Rebuild FTS index for any existing rows not yet indexed
    this.rebuildFtsIndex();
  }

  /**
   * Schema versioning and migration runner.
   * Each migration is a numbered function. Versions are tracked in schema_version.
   */
  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized');
    // Capture into a local so migration closures (below) get a narrowed
    // non-nullable reference without needing `this.db!`.
    const db = this.db;

    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `);

    const currentVersion =
      (
        db.prepare('SELECT MAX(version) as v FROM schema_version').get() as {
          v: number | null;
        }
      ).v ?? 0;

    const migrations: Array<() => void> = [
      // Migration 1: Add created_at alias to semantic_memory (M5)
      () => {
        try {
          db.exec('ALTER TABLE semantic_memory ADD COLUMN created_at INTEGER');
        } catch {
          /* column already exists */
        }
        db.exec('UPDATE semantic_memory SET created_at = created WHERE created_at IS NULL');
      },
      // Migration 2: Add embedding_model column to semantic_memory (Phase 2 — embedding versioning)
      () => {
        try {
          db.exec(
            `ALTER TABLE semantic_memory ADD COLUMN embedding_model TEXT DEFAULT 'text-embedding-3-small'`,
          );
        } catch {
          /* column already exists */
        }
      },
    ];

    for (let i = currentVersion; i < migrations.length; i++) {
      const migration = migrations[i];
      if (!migration) continue; // unreachable: loop bound < migrations.length
      migration();
      db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
        i + 1,
        Date.now(),
      );
    }
  }

  /** Rebuild FTS5 index from existing episodic_memory data */
  private rebuildFtsIndex(): void {
    if (!this.db) return;
    try {
      this.db.exec(`INSERT INTO episodic_fts(episodic_fts) VALUES('rebuild')`);
    } catch {
      /* FTS table may already be in sync — safe to ignore */
    }
  }

  /**
   * Get database connection
   */
  getDb(): Database.Database {
    if (!this.db) throw new Error('Database not initialized. Call init() first.');
    return this.db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Run VACUUM to optimize database
   */
  optimize(): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.exec('VACUUM;');
    this.db.exec('PRAGMA optimize;');
  }

  /**
   * Get database statistics
   */
  getStats(): {
    episodicCount: number;
    semanticCount: number;
    proceduralCount: number;
    dbSizeBytes: number;
    embeddingModelName: string | null;
    avgNorm: number | null;
    normStdDev: number | null;
  } {
    if (!this.db) throw new Error('Database not initialized');

    const episodicCount = this.db
      .prepare('SELECT COUNT(*) as count FROM episodic_memory')
      .get() as { count: number };
    const semanticCount = this.db
      .prepare('SELECT COUNT(*) as count FROM semantic_memory')
      .get() as { count: number };
    const proceduralCount = this.db
      .prepare('SELECT COUNT(*) as count FROM procedural_memory')
      .get() as { count: number };

    const dbSizeBytes = fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0;

    // Embedding model name from most recent row (Phase 2)
    let embeddingModelName: string | null = null;
    try {
      const modelRow = this.db
        .prepare(
          'SELECT embedding_model FROM semantic_memory WHERE embedding_model IS NOT NULL ORDER BY id DESC LIMIT 1',
        )
        .get() as { embedding_model: string } | undefined;
      embeddingModelName = modelRow?.embedding_model ?? null;
    } catch {
      /* embedding_model column may not exist on old DBs */
    }

    // Average L2 norm + stddev across last 100 embedded rows (Phase 1 — drift detection)
    let avgNorm: number | null = null;
    let normStdDev: number | null = null;
    try {
      const embRows = this.db
        .prepare(
          'SELECT embedding FROM semantic_memory WHERE embedding IS NOT NULL ORDER BY id DESC LIMIT 100',
        )
        .all() as { embedding: Buffer }[];

      if (embRows.length > 0) {
        const norms = embRows.map((row) => {
          const vec = new Float32Array(
            row.embedding.buffer,
            row.embedding.byteOffset,
            row.embedding.byteLength / 4,
          );
          let sum = 0;
          for (let i = 0; i < vec.length; i++) {
            const v = vec[i] ?? 0;
            sum += v * v;
          }
          return Math.sqrt(sum);
        });

        const mean = norms.reduce((a, b) => a + b, 0) / norms.length;
        const variance = norms.reduce((s, n) => s + (n - mean) ** 2, 0) / norms.length;
        avgNorm = Math.round(mean * 1000) / 1000;
        normStdDev = Math.round(Math.sqrt(variance) * 1000) / 1000;
      }
    } catch {
      /* non-critical — embedding BLOB deserialization failure */
    }

    return {
      episodicCount: episodicCount.count,
      semanticCount: semanticCount.count,
      proceduralCount: proceduralCount.count,
      dbSizeBytes,
      embeddingModelName,
      avgNorm,
      normStdDev,
    };
  }
}
