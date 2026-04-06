/**
 * Memory Consolidation
 * Merges similar semantic memories to reduce redundancy
 */

import { createLogger } from '@vibetech/logger';
import type { MemoryManager } from '../core/MemoryManager.js';
import type { SemanticMemory } from '../types/index.js';
import { cosineSimilarity, deserializeEmbedding } from '../utils/math.js';

const logger = createLogger('MemoryConsolidator');

export interface ConsolidationResult {
  merged: number;
  preserved: number;
  deletions: Array<{
    deletedId: number;
    mergedIntoId: number;
    similarity: number;
    reason: string;
  }>;
}

export interface ConsolidationOptions {
  /** Similarity threshold (0-1, default 0.9 = 90% similar) */
  threshold?: number;
  /** Dry run - don't actually merge, just report */
  dryRun?: boolean;
  /** Category filter - only consolidate within this category */
  category?: string;
  /** Preserve importance - keep highest importance memory */
  preserveImportance?: boolean;
}

export class MemoryConsolidator {
  constructor(private memory: MemoryManager) {}

  /**
   * Ensure consolidation_log table exists for audit trail (L7)
   */
  private ensureAuditTable(): void {
    const db = this.memory.getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS consolidation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        kept_id INTEGER,
        deleted_id INTEGER,
        similarity REAL,
        reason TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL
      )
    `);
  }

  /**
   * Find and merge similar semantic memories
   */
  async consolidate(options: ConsolidationOptions = {}): Promise<ConsolidationResult> {
    const { threshold = 0.9, dryRun = false, category, preserveImportance = true } = options;

    const result: ConsolidationResult = {
      merged: 0,
      preserved: 0,
      deletions: [],
    };

    // C3-fix: Use getDb() instead of bracket-notation access
    const db = this.memory.getDb();

    const stmt = db.prepare(`
      SELECT id, text, embedding, category, importance, created, access_count, metadata
      FROM semantic_memory
      ${category ? 'WHERE category = ?' : ''}
      ORDER BY importance DESC, created DESC
    `);

    const memories = (category ? stmt.all(category) : stmt.all()) as Array<{
      id: number;
      text: string;
      embedding: Buffer;
      category: string | null;
      importance: number;
      created: number;
      access_count: number;
      metadata: string | null;
    }>;

    // C2-fix: Deserialize embeddings from BLOB (Float32Array), not JSON
    const parsedMemories: Array<SemanticMemory & { parsedEmbedding: number[] }> = [];

    for (const m of memories) {
      try {
        const embeddingBuf = m.embedding as Buffer;
        if (!embeddingBuf || embeddingBuf.byteLength < 4) {
          logger.warn(`Skipping memory ${m.id} - empty or invalid embedding BLOB`);
          continue;
        }
        const parsedEmbedding = deserializeEmbedding(embeddingBuf);
        if (parsedEmbedding.length === 0) {
          logger.warn(`Skipping memory ${m.id} - zero-length embedding`);
          continue;
        }
        parsedMemories.push({
          id: m.id,
          text: m.text,
          embedding: [],
          parsedEmbedding,
          category: m.category ?? undefined,
          importance: m.importance,
          created: m.created,
          accessCount: m.access_count,
          metadata: m.metadata ? JSON.parse(m.metadata) : undefined,
        });
      } catch (error) {
        logger.warn(`Skipping memory ${m.id} - embedding deserialization failed: ${error}`);
        continue;
      }
    }

    // Find similar pairs using shared cosine similarity (M1-fix)
    const similarities: Array<{
      id1: number;
      id2: number;
      similarity: number;
    }> = [];

    for (let i = 0; i < parsedMemories.length; i++) {
      for (let j = i + 1; j < parsedMemories.length; j++) {
        const sim = cosineSimilarity(
          parsedMemories[i].parsedEmbedding,
          parsedMemories[j].parsedEmbedding,
        );

        if (sim >= threshold) {
          similarities.push({
            id1: parsedMemories[i].id ?? 0,
            id2: parsedMemories[j].id ?? 0,
            similarity: sim,
          });
        }
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity);

    const processedIds = new Set<number>();

    // Ensure audit table exists before logging
    if (!dryRun && similarities.length > 0) {
      this.ensureAuditTable();
    }

    for (const { id1, id2, similarity } of similarities) {
      if (processedIds.has(id1) || processedIds.has(id2)) {
        continue;
      }

      const mem1 = parsedMemories.find((m) => m.id === id1);
      const mem2 = parsedMemories.find((m) => m.id === id2);
      if (!mem1 || !mem2) continue;

      const [keep, remove] =
        preserveImportance && mem1.importance !== mem2.importance
          ? mem1.importance > mem2.importance
            ? [mem1, mem2]
            : [mem2, mem1]
          : mem1.created < mem2.created
            ? [mem1, mem2]
            : [mem2, mem1];

      const consolidatedFrom = Array.isArray(keep.metadata?.consolidatedFrom)
        ? (keep.metadata.consolidatedFrom as number[])
        : [];
      const originalImportance = Array.isArray(keep.metadata?.originalImportance)
        ? (keep.metadata.originalImportance as number[])
        : [keep.importance];

      const mergedMetadata = {
        ...(keep.metadata ?? {}),
        ...(remove.metadata ?? {}),
        consolidatedFrom: [...consolidatedFrom, remove.id],
        consolidatedAt: Date.now(),
        originalImportance: [...originalImportance, remove.importance],
      };

      const reason = `${(similarity * 100).toFixed(1)}% similar, merged into ${
        preserveImportance ? 'higher importance' : 'older'
      } memory`;

      if (!dryRun) {
        // C3-fix: Use db from getDb()
        db.prepare(
          `UPDATE semantic_memory
           SET metadata = ?,
               access_count = ?,
               importance = ?
           WHERE id = ?`,
        ).run(
          JSON.stringify(mergedMetadata),
          keep.accessCount + remove.accessCount,
          Math.max(keep.importance, remove.importance),
          keep.id,
        );

        db.prepare('DELETE FROM semantic_memory WHERE id = ?').run(remove.id);

        // L7: Audit log entry
        db.prepare(
          `INSERT INTO consolidation_log (action, kept_id, deleted_id, similarity, reason, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          'merge',
          keep.id,
          remove.id,
          similarity,
          reason,
          JSON.stringify(mergedMetadata),
          Date.now(),
        );

        logger.info(`Merged memory ${remove.id} into ${keep.id} (${(similarity * 100).toFixed(1)}%)`);
      }

      result.merged++;
      result.deletions.push({
        deletedId: remove.id ?? 0,
        mergedIntoId: keep.id ?? 0,
        similarity,
        reason,
      });

      processedIds.add(remove.id ?? 0);
      processedIds.add(keep.id ?? 0);
    }

    result.preserved = parsedMemories.length - result.merged;

    return result;
  }

  /**
   * Get consolidation preview without applying changes
   */
  async preview(options: ConsolidationOptions = {}): Promise<ConsolidationResult> {
    return this.consolidate({ ...options, dryRun: true });
  }

  /**
   * Get consolidation statistics
   */
  async getStats(): Promise<{
    totalMemories: number;
    potentialDuplicates: number;
    averageSimilarity: number;
  }> {
    const previewResult = await this.preview({ threshold: 0.9 });

    return {
      totalMemories: previewResult.preserved + previewResult.merged,
      potentialDuplicates: previewResult.merged,
      averageSimilarity:
        previewResult.deletions.reduce((sum, d) => sum + d.similarity, 0) /
        (previewResult.deletions.length || 1),
    };
  }
}
