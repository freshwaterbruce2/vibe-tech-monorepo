import type Database from 'better-sqlite3';
import { createLogger } from '@vibetech/logger';
import type { EmbeddingService } from '../embeddings/EmbeddingService.js';
import type { SearchResult, SemanticMemory } from '../types/index.js';
import { cosineSimilarity, deserializeEmbedding } from '../utils/math.js';
import { DimensionMismatchError } from '../errors.js';

const logger = createLogger('SemanticStore');

// Conflict thresholds (cosine similarity).
// <REVIEW_THRESHOLD                       → store new row (no conflict)
// REVIEW_THRESHOLD..MERGE_THRESHOLD-ε     → reject as duplicate (caller should review)
// >=MERGE_THRESHOLD                       → merge into existing row
const REVIEW_THRESHOLD = 0.85;
const MERGE_THRESHOLD = 0.92;

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

/**
 * Discriminated result of {@link SemanticStore.add}.
 *
 * - `inserted`: a fresh row was written; `id` is the new rowid.
 * - `merged`: an existing high-similarity row (>= 0.92) absorbed the new
 *    text; access count bumped, importance lifted to max(existing, new).
 *    No new row was created.
 * - `rejected_duplicate`: similarity sits in the 0.85..0.92 review band.
 *    The caller is expected to inspect the conflicts and either rephrase,
 *    raise importance, or explicitly merge via a future API.
 */
export type AddResult =
  | { status: 'inserted'; id: number }
  | { status: 'merged'; existingId: number; similarity: number }
  | {
      status: 'rejected_duplicate';
      existingId: number;
      similarity: number;
      conflicts: ConflictHit[];
    };

export interface EmbeddingHealth {
  staleDimensionCount: number;
  lastMismatchAt: number | null;
  currentDimension: number;
  currentModel: string;
}

export class SemanticStore {
  /** Number of times search/add has observed a per-row dimension mismatch. */
  private staleDimensionCount = 0;
  /** Unix-ms timestamp of the most recent dimension mismatch event. */
  private lastDimensionMismatchAt: number | null = null;

  constructor(
    private db: Database.Database,
    private embedder: EmbeddingService,
  ) {}

  /**
   * Add a semantic memory with embedding.
   *
   * Behaviour depends on similarity to existing rows:
   * - max similarity < 0.85 → INSERT (new row created)
   * - 0.85 ≤ max similarity < 0.92 → REJECT (return existing id + conflicts)
   * - max similarity ≥ 0.92 → MERGE into existing row (no new insert)
   *
   * Throws {@link DimensionMismatchError} if the embedder is in a stale
   * dimension state — silently inserting unsearchable rows would corrupt
   * the index.
   */
  async add(
    memory: Omit<SemanticMemory, 'id' | 'embedding' | 'created' | 'accessCount'>,
  ): Promise<AddResult> {
    // Refuse to write when the embedder has switched dimensions at runtime.
    if (this.embedder.hasDimensionMismatch()) {
      this.recordDimensionMismatch();
      throw new DimensionMismatchError({
        expected: this.embedder.getOriginalDimension(),
        actual: this.embedder.getDimension(),
        provider: this.embedder.getProvider(),
        modelVersion: this.embedder.getModel(),
      });
    }

    // Generate embedding (will throw upstream if provider returns wrong size).
    const embedding = await this.embedder.embed(memory.text);
    const expectedDimension = this.embedder.getDimension();
    if (embedding.length !== expectedDimension) {
      this.recordDimensionMismatch();
      throw new DimensionMismatchError({
        expected: expectedDimension,
        actual: embedding.length,
        provider: this.embedder.getProvider(),
        modelVersion: this.embedder.getModel(),
      });
    }

    const embeddingModel = this.embedder.getModel();

    // Conflict detection — scan top-importance rows for cosine similarity.
    const conflicts = this.findConflicts(embedding, REVIEW_THRESHOLD, 5);
    const top = conflicts[0];

    // MERGE branch: very high similarity → absorb into existing row.
    if (top && top.similarity >= MERGE_THRESHOLD) {
      this.mergeInto(top.id, memory);
      return { status: 'merged', existingId: top.id, similarity: top.similarity };
    }

    // REJECT branch: review-band similarity → caller decides.
    if (top && top.similarity >= REVIEW_THRESHOLD) {
      return {
        status: 'rejected_duplicate',
        existingId: top.id,
        similarity: top.similarity,
        conflicts,
      };
    }

    // INSERT branch: novel content → write new row.
    const enrichedMetadata: Record<string, unknown> = { ...(memory.metadata ?? {}) };
    if (conflicts.length > 0) {
      enrichedMetadata['potentialConflicts'] = conflicts.map((c) => ({
        id: c.id,
        similarity: c.similarity,
      }));
    }

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

    return { status: 'inserted', id: result.lastInsertRowid as number };
  }

  /**
   * Merge a near-duplicate write into an existing row:
   * - Bump access_count by 1
   * - Lift importance to max(existing, new)
   * - Refresh last_accessed
   * - Record the merged-from text in metadata.mergedFrom (JSON array)
   */
  private mergeInto(
    existingId: number,
    newMemory: Omit<SemanticMemory, 'id' | 'embedding' | 'created' | 'accessCount'>,
  ): void {
    const existing = this.db
      .prepare(
        `SELECT importance, metadata FROM semantic_memory WHERE id = ?`,
      )
      .get(existingId) as { importance: number; metadata: string | null } | undefined;

    if (!existing) {
      // Row vanished between conflict scan and merge — fall back to a no-op.
      // The next add() call will retry; we deliberately do not insert here.
      logger.warn(
        `[SemanticStore] mergeInto: row ${existingId} disappeared before merge; skipping`,
      );
      return;
    }

    const newImportance = Math.max(existing.importance, newMemory.importance ?? 5);

    const metadata = this.parseMetadata(existing.metadata, existingId);
    const mergedFrom = Array.isArray(metadata['mergedFrom'])
      ? (metadata['mergedFrom'] as Array<Record<string, unknown>>)
      : [];
    mergedFrom.push({ text: newMemory.text, mergedAt: Date.now() });
    metadata['mergedFrom'] = mergedFrom;

    this.db
      .prepare(
        `UPDATE semantic_memory
         SET access_count = access_count + 1,
             importance = ?,
             last_accessed = ?,
             metadata = ?
         WHERE id = ?`,
      )
      .run(newImportance, Date.now(), JSON.stringify(metadata), existingId);
  }

  private parseMetadata(metadataJson: string | null, rowId: number): Record<string, unknown> {
    if (!metadataJson) {
      return {};
    }

    try {
      const parsed = JSON.parse(metadataJson) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      logger.warn(`[SemanticStore] row ${rowId} metadata is not an object; replacing on merge`);
      return {};
    } catch (err) {
      logger.warn(
        `[SemanticStore] row ${rowId} has malformed metadata (${(err as Error).message}); replacing on merge`,
      );
      return {};
    }
  }

  /**
   * Batch insert semantic memories (embeddings computed sequentially, inserts transactional).
   *
   * NOTE: addMany bypasses conflict enforcement intentionally — it is meant for
   * trusted bulk hydration paths (migrations, seed data) where the caller has
   * already de-duplicated. Use {@link add} for user-facing writes.
   */
  async addMany(
    memories: Omit<SemanticMemory, 'id' | 'embedding' | 'created' | 'accessCount'>[],
  ): Promise<number[]> {
    if (this.embedder.hasDimensionMismatch()) {
      this.recordDimensionMismatch();
      throw new DimensionMismatchError({
        expected: this.embedder.getOriginalDimension(),
        actual: this.embedder.getDimension(),
        provider: this.embedder.getProvider(),
        modelVersion: this.embedder.getModel(),
      });
    }

    const expectedDimension = this.embedder.getDimension();
    const prepared: Array<{ memory: (typeof memories)[0]; blob: Buffer }> = [];
    for (const memory of memories) {
      const embedding = await this.embedder.embed(memory.text);
      if (embedding.length !== expectedDimension) {
        this.recordDimensionMismatch();
        throw new DimensionMismatchError({
          expected: expectedDimension,
          actual: embedding.length,
          provider: this.embedder.getProvider(),
          modelVersion: this.embedder.getModel(),
        });
      }
      prepared.push({ memory, blob: Buffer.from(new Float32Array(embedding).buffer) });
    }

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
   * Vector similarity search.
   * - Pre-filters with importance >= 1, caps scan at 1000 rows
   * - Supports offset for pagination
   * - Skips rows whose stored embedding model differs from the current model
   * - Skips rows whose stored embedding dimension differs from the query
   *   embedding dimension, incrementing the dimension-mismatch counter.
   *   Returning empty IS valid (no compatible vectors); the WHY is observable
   *   via {@link getEmbeddingHealth}.
   */
  async search(queryText: string, limit = 5, offset = 0): Promise<SearchResult<SemanticMemory>[]> {
    // Global dimension-switch guard — log + count + return empty.
    if (this.embedder.hasDimensionMismatch()) {
      this.recordDimensionMismatch();
      logger.warn(
        '[SemanticStore] DIMENSION_MISMATCH: embedding provider changed dimensions at runtime. ' +
          'Returning empty result set. Restore primary provider or run a re-embedding migration.',
        {
          expected: this.embedder.getOriginalDimension(),
          actual: this.embedder.getDimension(),
          provider: this.embedder.getProvider(),
          model: this.embedder.getModel(),
          staleDimensionCount: this.staleDimensionCount,
        },
      );
      return [];
    }

    const queryEmbedding = await this.embedder.embed(queryText);
    const currentModel = this.embedder.getModel();
    const queryDimension = queryEmbedding.length;

    const scanLimit = Math.max(limit * 20, 1000);
    const stmt = this.db.prepare(`
      SELECT id, text, embedding, category, importance, created, last_accessed, access_count, metadata, embedding_model
      FROM semantic_memory
      WHERE importance >= 1 AND length(embedding) > 0
      ORDER BY importance DESC
      LIMIT ?
    `);

    const allRows = stmt.all(scanLimit) as SemanticRow[];

    // Skip rows embedded with a different model (incompatible vector space).
    const modelFiltered = allRows.filter((row) => {
      if (row.embedding_model && row.embedding_model !== currentModel) {
        return false;
      }
      return true;
    });

    const results: SearchResult<SemanticMemory>[] = [];
    for (const row of modelFiltered) {
      const embedding = deserializeEmbedding(row.embedding);

      // Per-row dimension guard. Bump counter and skip — do not throw.
      if (embedding.length !== queryDimension) {
        this.recordDimensionMismatch();
        logger.warn(
          `[SemanticStore] DIMENSION_MISMATCH: row ${row.id} stored ${embedding.length}d, ` +
            `query is ${queryDimension}d (model=${currentModel}). Skipping row.`,
        );
        continue;
      }

      const similarity = cosineSimilarity(queryEmbedding, embedding);
      results.push({
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
      });
    }

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
   * Find existing memories with cosine similarity above threshold.
   * Used internally during add() and externally via findConflictsForText().
   * Returns up to `limit` hits sorted by descending similarity.
   *
   * Per-row dimension mismatches are skipped (and counted) — they cannot
   * be compared and silently corrupting cosine math is worse than skipping.
   */
  private findConflicts(
    embedding: number[],
    threshold = REVIEW_THRESHOLD,
    limit = 3,
  ): ConflictHit[] {
    const queryDimension = embedding.length;
    const currentModel = this.embedder.getModel();
    let rows: Array<{
      id: number;
      text: string;
      embedding: Buffer;
      category: string | null;
      embedding_model: string | null;
    }>;
    try {
      rows = this.db
        .prepare(
          `SELECT id, text, embedding, category, embedding_model FROM semantic_memory
           WHERE length(embedding) > 0
           ORDER BY importance DESC LIMIT 1000`,
        )
        .all() as Array<{
          id: number;
          text: string;
          embedding: Buffer;
          category: string | null;
          embedding_model: string | null;
        }>;
    } catch (err) {
      logger.warn(
        `[SemanticStore] findConflicts: query failed (${(err as Error).message}); returning no conflicts`,
      );
      return [];
    }

    const hits: ConflictHit[] = [];
    for (const row of rows) {
      if (row.embedding_model && row.embedding_model !== currentModel) {
        continue;
      }

      const vec = deserializeEmbedding(row.embedding);
      if (vec.length !== queryDimension) {
        this.recordDimensionMismatch();
        continue;
      }
      const sim = cosineSimilarity(embedding, vec);
      if (sim >= threshold) {
        hits.push({ id: row.id, text: row.text, similarity: sim, category: row.category });
      }
    }

    hits.sort((a, b) => b.similarity - a.similarity);
    return hits.slice(0, limit);
  }

  /**
   * Public API — embed text and return conflict hits with recommendation.
   * Used by the memory_conflict_check MCP handler.
   */
  async findConflictsForText(
    text: string,
    threshold = REVIEW_THRESHOLD,
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
    if (maxSimilarity < REVIEW_THRESHOLD) {
      recommendation = 'store';
    } else if (maxSimilarity >= MERGE_THRESHOLD) {
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

  /**
   * Embedding health — observable signal for the dimension-mismatch counter.
   * Surfaced via the memory_health MCP tool and any operator dashboards.
   */
  getEmbeddingHealth(): EmbeddingHealth {
    return {
      staleDimensionCount: this.staleDimensionCount,
      lastMismatchAt: this.lastDimensionMismatchAt,
      currentDimension: this.embedder.getDimension(),
      currentModel: this.embedder.getModel(),
    };
  }

  /** Internal — bump the dimension-mismatch counter and timestamp. */
  private recordDimensionMismatch(): void {
    this.staleDimensionCount += 1;
    this.lastDimensionMismatchAt = Date.now();
  }
}
