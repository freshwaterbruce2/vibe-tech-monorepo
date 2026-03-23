import type Database from 'better-sqlite3';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';
import type { SearchResult, SemanticMemory } from '../types/index.js';
import { cosineSimilarity, deserializeEmbedding } from '../utils/math.js';

interface SemanticRow {
  id: number;
  text: string;
  embedding: Buffer;
  category: string | null;
  importance: number;
  created: number;
  last_accessed: number | null;
  access_count: number;
  metadata: string | null;
}

export class SemanticStore {
  constructor(
    private db: Database.Database,
    private embedder: EmbeddingService,
  ) {}

  /**
   * Add semantic memory with embedding
   */
  async add(
    memory: Omit<SemanticMemory, 'id' | 'embedding' | 'created' | 'accessCount'>,
  ): Promise<number> {
    // Generate embedding
    const embedding = await this.embedder.embed(memory.text);

    // Serialize embedding as BLOB (Float32Array)
    const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);

    const stmt = this.db.prepare(`
      INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count, metadata)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);

    const result = stmt.run(
      memory.text,
      embeddingBlob,
      memory.category ?? null,
      memory.importance ?? 5,
      Date.now(),
      memory.metadata ? JSON.stringify(memory.metadata) : null,
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Batch insert semantic memories (embeddings computed sequentially, inserts transactional)
   */
  async addMany(
    memories: Omit<SemanticMemory, 'id' | 'embedding' | 'created' | 'accessCount'>[],
  ): Promise<number[]> {
    // Compute all embeddings first (sequential to avoid overwhelming Ollama)
    const prepared: Array<{ memory: (typeof memories)[0]; blob: Buffer }> = [];
    for (const memory of memories) {
      const embedding = await this.embedder.embed(memory.text);
      prepared.push({ memory, blob: Buffer.from(new Float32Array(embedding).buffer) });
    }

    // Batch insert in transaction
    const stmt = this.db.prepare(`
      INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count, metadata)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);

    const ids: number[] = [];
    const insertAll = this.db.transaction((items: typeof prepared) => {
      for (const { memory, blob } of items) {
        const result = stmt.run(
          memory.text,
          blob,
          memory.category ?? null,
          memory.importance ?? 5,
          Date.now(),
          memory.metadata ? JSON.stringify(memory.metadata) : null,
        );
        ids.push(result.lastInsertRowid as number);
      }
    });

    insertAll(prepared);
    return ids;
  }

  /**
   * Vector similarity search
   * C1-fix: Pre-filters with importance >= 1, caps scan at 1000 rows
   * L2-fix: Supports offset for pagination
   * Phase 4: Dimension guard — returns empty when embedding provider changed dimensions
   */
  async search(queryText: string, limit = 5, offset = 0): Promise<SearchResult<SemanticMemory>[]> {
    // Phase 4: Dimension guard — refuse to search with mismatched dimensions
    if (this.embedder.hasDimensionMismatch()) {
      console.error(
        '[SemanticStore] DIMENSION_MISMATCH: Embedding provider changed dimensions. ' +
        'Existing vectors are incompatible. Restore primary provider or run re-embedding migration.',
      );
      return [];
    }

    const queryEmbedding = await this.embedder.embed(queryText);

    // Pre-filter: only non-trivial memories, capped scan
    const scanLimit = Math.max(limit * 20, 1000);
    const stmt = this.db.prepare(`
      SELECT id, text, embedding, category, importance, created, last_accessed, access_count, metadata
      FROM semantic_memory
      WHERE importance >= 1 AND length(embedding) > 0
      ORDER BY importance DESC
      LIMIT ?
    `);

    const rows = stmt.all(scanLimit) as SemanticRow[];

    const results: SearchResult<SemanticMemory>[] = rows.map((row) => {
      const embedding = deserializeEmbedding(row.embedding);
      const similarity = cosineSimilarity(queryEmbedding, embedding);

      return {
        item: {
          id: row.id,
          text: row.text,
          embedding,
          category: row.category ?? undefined,
          importance: row.importance,
          created: row.created,
          lastAccessed: row.last_accessed ?? undefined,
          accessCount: row.access_count,
          metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        },
        score: similarity,
        distance: 1 - similarity,
      };
    });

    results.sort((a, b) => b.score - a.score);

    return results.slice(offset, offset + limit);
  }

  /**
   * Update access metadata (for adaptive importance)
   */
  updateAccess(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE semantic_memory
      SET last_accessed = ?, access_count = access_count + 1
      WHERE id = ?
    `);

    stmt.run(Date.now(), id);
  }

  /**
   * Get semantic memory by ID
   */
  getById(id: number): SemanticMemory | null {
    const stmt = this.db.prepare(`
      SELECT id, text, embedding, category, importance, created, last_accessed, access_count, metadata
      FROM semantic_memory
      WHERE id = ?
    `);

    const row = stmt.get(id) as SemanticRow | undefined;
    if (!row) return null;

    const embedding = deserializeEmbedding(row.embedding);

    return {
      id: row.id,
      text: row.text,
      embedding,
      category: row.category ?? undefined,
      importance: row.importance,
      created: row.created,
      lastAccessed: row.last_accessed ?? undefined,
      accessCount: row.access_count,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Delete low-importance, rarely-accessed memories (consolidation)
   */
  pruneByImportance(importanceThreshold = 3, accessThreshold = 2): number {
    const stmt = this.db.prepare(`
      DELETE FROM semantic_memory
      WHERE importance <= ? AND access_count < ?
    `);

    const result = stmt.run(importanceThreshold, accessThreshold);
    return result.changes;
  }

  /**
   * Get count of semantic memories
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM semantic_memory');
    const row = stmt.get() as { count: number };
    return row.count;
  }
}
