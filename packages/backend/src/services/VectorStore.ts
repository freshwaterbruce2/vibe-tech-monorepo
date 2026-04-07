// packages/backend/src/services/VectorStore.ts
import { type LogicPattern, type VectorSearchResult } from '@vibetech/shared-utils';
import { getIntelligencePath } from '@vibetech/shared-utils';
import { env } from '@xenova/transformers';
import Database from 'better-sqlite3';
import log from 'electron-log';
import fs from 'fs';
import path from 'path';

type InsertablePattern = Omit<LogicPattern, 'id' | 'created_at'>;
interface StoredEmbeddingRow {
  id: number;
  vector: Buffer;
}
interface StoredPatternRow {
  id: number;
  logic_rule: string;
  pattern_data: string | null;
  success_rate: number;
  tags: string | null;
  created_at: string;
}

export class VectorStore {
  private db: Database.Database;
  private modelRoot: string;
  private patternCache = new Map<number, LogicPattern>();

  constructor() {
    // 1. Resolve paths via the Shared Path Registry (Remediates D: Drive Strategy)
    this.modelRoot = getIntelligencePath();
    const dbDir = path.join(this.modelRoot, 'vector-store');
    const dbPath = path.join(dbDir, 'vibe_v1.db');

    log.info(`[VectorStore] Initializing at: ${dbPath}`);

    // 2. Safety Check: Ensure directory exists (even if PreFlight was skipped)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    try {
      // 3. Native Module Initialization
      // This will now use the externalized better-sqlite3 from your new Vite config
      this.db = new Database(dbPath, {
        verbose: (msg) => log.debug(`[SQLite] ${msg}`),
      });

      this.initializeSchema();
      this.configureOnnxRuntime();
    } catch (error) {
      log.error('[VectorStore] Initialization Failed:', error);
      throw new Error(
        `Failed to initialize Intelligence Layer: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private configureOnnxRuntime() {
    /**
     * Remediates ONNX DLL isolation.
     * Instructs @xenova/transformers to look for local binaries
     * in the unpacked ASAR resources directory.
     */
    env.localModelPath = path.join(this.modelRoot, 'models');
    env.allowRemoteModels = false; // Force air-gapped security

    // Explicitly point to the unpacked onnxruntime binaries
    const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
    if (process.env.NODE_ENV === 'production' && resourcesPath) {
      const unpackedBin = path.join(
        resourcesPath,
        'app.asar.unpacked',
        'node_modules/onnxruntime-node/bin',
      );
      // Note: env.onnx.wasm.wasmPaths might need adjustment depending on version, checking docs or assuming user is correct.
      // The user code: env.onnx.wasm.wasmPaths = unpackedBin;
      // In newer xenova/transformers, it might be different, but adhering to user snippet.
      const envWithOnnx = env as typeof env & {
        onnx?: {
          wasm?: {
            wasmPaths?: string;
          };
        };
      };
      if (envWithOnnx.onnx?.wasm) {
        envWithOnnx.onnx.wasm.wasmPaths = unpackedBin;
      }
    }
  }

  private initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id INTEGER PRIMARY KEY,
        metadata JSON,
        vector BLOB
      );
      CREATE INDEX IF NOT EXISTS idx_metadata ON embeddings(metadata);
      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        logic_rule TEXT NOT NULL,
        pattern_data JSON,
        success_rate REAL NOT NULL,
        tags JSON,
        created_at TEXT NOT NULL
      );
    `);
  }

  public async addPattern(pattern: InsertablePattern, embedding: Float32Array): Promise<number> {
    const createdAt = new Date().toISOString();
    const insertPattern = this.db.prepare(
      'INSERT INTO patterns (logic_rule, pattern_data, success_rate, tags, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    const result = insertPattern.run(
      pattern.logic_rule,
      JSON.stringify(pattern.pattern_data),
      pattern.success_rate,
      JSON.stringify(pattern.tags),
      createdAt,
    );

    const id = Number(result.lastInsertRowid);
    const insertEmbedding = this.db.prepare(
      'INSERT OR REPLACE INTO embeddings (id, metadata, vector) VALUES (?, ?, ?)',
    );
    insertEmbedding.run(
      id,
      JSON.stringify({ tags: pattern.tags }),
      Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength),
    );

    this.patternCache.set(id, {
      id,
      logic_rule: pattern.logic_rule,
      pattern_data: pattern.pattern_data,
      success_rate: pattern.success_rate,
      tags: pattern.tags,
      created_at: createdAt,
    });

    return id;
  }

  public search(queryEmbedding: Float32Array, limit = 3): VectorSearchResult[] {
    const rows = this.db
      .prepare('SELECT id, vector FROM embeddings WHERE vector IS NOT NULL')
      .all() as StoredEmbeddingRow[];

    const ranked = rows
      .map((row) => {
        const storedVector = this.deserializeFloat32(row.vector);
        const score = this.cosineSimilarity(queryEmbedding, storedVector);
        return {
          strategy_id: row.id,
          distance: 1 - score,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return ranked;
  }

  public getPatternById(id: number): LogicPattern | undefined {
    const cached = this.patternCache.get(id);
    if (cached) {
      return cached;
    }

    const row = this.db
      .prepare(
        'SELECT id, logic_rule, pattern_data, success_rate, tags, created_at FROM patterns WHERE id = ?',
      )
      .get(id) as StoredPatternRow | undefined;

    if (!row) {
      return undefined;
    }

    const pattern: LogicPattern = {
      id: row.id,
      logic_rule: row.logic_rule,
      pattern_data: row.pattern_data
        ? this.safeParseJson<Record<string, unknown>>(row.pattern_data, {})
        : {},
      success_rate: row.success_rate,
      tags: row.tags ? this.safeParseJson<string[]>(row.tags, []) : [],
      created_at: row.created_at,
    };

    this.patternCache.set(id, pattern);
    return pattern;
  }

  private deserializeFloat32(buffer: Buffer): Float32Array {
    const source = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return new Float32Array(source);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    const size = Math.min(a.length, b.length);
    if (size === 0) {
      return 0;
    }

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < size; i++) {
      const av = a[i] ?? 0;
      const bv = b[i] ?? 0;
      dot += av * bv;
      normA += av * av;
      normB += bv * bv;
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private safeParseJson<T>(value: string, fallback: T): T {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  public close() {
    this.db.close();
  }
}
