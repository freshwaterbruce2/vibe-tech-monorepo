import type Database from 'better-sqlite3';
import { createLogger } from '@vibetech/logger';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';
import type { SearchResult, SemanticMemory } from '../types/index.js';
import { cosineSimilarity, deserializeEmbedding } from '../utils/math.js';

const logger = createLogger('SemanticStore');

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
  embedding_model: string | null;
}

interface ConflictHit {
  id: number;
  text: string;
  similarity: number;
  category: string | null;
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
    const embeddingModel = this.embedder.getModel();

    // Phase 3: conflict pre-check — enrich metadata with similar existing memories
    const conflicts = this.findConflicts(embedding, 0.85, 3);
    const enrichedMetadata: Record<string, unknown> = { ...(memory.metadata ?? {}) };
    if (conflicts.length > 0) {
      enrichedMetadata['potentialConflicts'] = conflicts.map((c) => ({
        id: c.id,
        similarity: c.similarity,
      }));
    }

    // Serialize embedding as BLOB (Float32Array)
    const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);

    const stmt = this.db.prepare(`
      INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count, metadata, embedding_model)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const result = stmt.run(
      memory.text,
      embeddingBlob,
      memory.category ?? null,
      memory.importance ?? 5,
      Date.now(),
      JSON.stringify(enrichedMetadata),
      embeddingModel,
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
    const embeddingModel = this.embedder.getModel();
    const stmt = this.db.prepare(`
      INSERT INTO semantic_memory (text, embedding, category, importance, created, access_count, metadata, embedding_model)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
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
          embeddingModel,
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
      logger.error(
        '[SemanticStore] DIMENSION_MISMATCH: Embedding provider changed dimensions. ' +
        'Existing vectors are incompatible. Restore primary provider or run re-embedding migration.',
      );
      return [];
    }

    const queryEmbedding = await this.embedder.embed(queryText);
    const currentModel = this.embedder.getModel();

    // Pre-filter: only non-trivial memories, capped scan
    const scanLimit = Math.max(limit * 20, 1000);
    const stmt = this.db.prepare(`
      SELECT id, text, embedding, category, importance, created, last_accessed, access_count, metadata, embedding_model
      FROM semantic_memory
      WHERE importance >= 1 AND length(embedding) > 0
      ORDER BY importance DESC
      LIMIT ?
    `);

    const allRows = stmt.all(scanLimit) as SemanticRow[];

    // Phase 2: skip rows embedded with a different model (incompatible vector space)
    const rows = allRows.filter((row) => {
      if (row.embedding_model && row.embedding_model !== currentModel) {
        return false;
      }
      return true;
    });

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
   * Phase 3: Find existing memories with cosine similarity above threshold.
   * Used internally during add() and externally via findConflictsForText().
   * Returns up to `limit` hits sorted by descending similarity.
   */
  private findConflicts(
    embedding: number[],
    threshold = 0.85,
    limit = 3,
  ): ConflictHit[] {
    try {
      const rows = this.db
        .prepare(
          `SELECT id, text, embedding, category FROM semantic_memory
           WHERE length(embedding) > 0
           ORDER BY importance DESC LIMIT 1000`,
        )
        .all() as Array<{ id: number; text: string; embedding: Buffer; category: string | null }>;

      const hits: ConflictHit[] = [];
      for (const row of rows) {
        const vec = deserializeEmbedding(row.embedding);
        const sim = cosineSimilarity(embedding, vec);
        if (sim >= threshold) {
          hits.push({ id: row.id, text: row.text, similarity: sim, category: row.category });
        }
      }

      hits.sort((a, b) => b.similarity - a.similarity);
      return hits.slice(0, limit);
    } catch {
      return [];
    }
  }

  /**
   * Phase 3: Public API — embed text and return conflict hits with recommendation.
   * Used by the memory_conflict_check MCP handler.
   */
  async findConflictsForText(
    text: string,
    threshold = 0.85,
    limit = 5,
  ): Promise<{
    conflicts: ConflictHit[];
    recommendation: 'store' | 'merge' | 'review';
    maxSimilarity: number;
  }> {
    const embedding = await this.embedder.embed(text);
    const conflicts = this.findConflicts(embedding, threshold, limit);
    const maxSimilarity = conflicts[0]?.similarity ?? 0;

    let recommendation: 'store' | 'merge' | 'review';
    if (maxSimilarity < 0.85) {
      recommendation = 'store';
    } else if (maxSimilarity >= 0.92) {
      recommendation = 'merge';
    } else {
      recommendation = 'review';
    }

    return { conflicts, recommendation, maxSimilarity };
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
