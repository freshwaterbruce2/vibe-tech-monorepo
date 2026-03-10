import type Database from 'better-sqlite3';
import type { ProceduralMemory } from '../types/index.js';

interface ProceduralRow {
  id: number;
  pattern: string;
  context: string;
  frequency: number;
  successRate: number;
  lastUsed: number;
  metadata: string | null;
}

export class ProceduralStore {
  constructor(private db: Database.Database) {}

  /**
   * Add or update procedural memory (command/workflow pattern)
   */
  upsert(memory: Omit<ProceduralMemory, 'id' | 'frequency'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO procedural_memory (pattern, context, success_rate, last_used, metadata)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(pattern) DO UPDATE SET
        frequency = frequency + 1,
        success_rate = ?,
        last_used = ?,
        metadata = ?
    `);

    stmt.run(
      memory.pattern,
      memory.context,
      memory.successRate ?? 1.0,
      memory.lastUsed ?? Date.now(),
      memory.metadata ? JSON.stringify(memory.metadata) : null,
      memory.successRate ?? 1.0,
      memory.lastUsed ?? Date.now(),
      memory.metadata ? JSON.stringify(memory.metadata) : null,
    );
  }

  /**
   * Batch upsert procedural memories (transactional)
   */
  upsertMany(memories: Omit<ProceduralMemory, 'id' | 'frequency'>[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO procedural_memory (pattern, context, success_rate, last_used, metadata)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(pattern) DO UPDATE SET
        frequency = frequency + 1,
        success_rate = ?,
        last_used = ?,
        metadata = ?
    `);

    const insertAll = this.db.transaction((items: typeof memories) => {
      for (const memory of items) {
        stmt.run(
          memory.pattern,
          memory.context,
          memory.successRate ?? 1.0,
          memory.lastUsed ?? Date.now(),
          memory.metadata ? JSON.stringify(memory.metadata) : null,
          memory.successRate ?? 1.0,
          memory.lastUsed ?? Date.now(),
          memory.metadata ? JSON.stringify(memory.metadata) : null,
        );
      }
    });

    insertAll(memories);
  }

  /**
   * Get most frequently used patterns
   */
  getMostFrequent(limit = 10): ProceduralMemory[] {
    const stmt = this.db.prepare(`
      SELECT id, pattern, context, frequency, success_rate as successRate, last_used as lastUsed, metadata
      FROM procedural_memory
      ORDER BY frequency DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as ProceduralRow[];

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Get highest success rate patterns
   */
  getMostSuccessful(limit = 10): ProceduralMemory[] {
    const stmt = this.db.prepare(`
      SELECT id, pattern, context, frequency, success_rate as successRate, last_used as lastUsed, metadata
      FROM procedural_memory
      ORDER BY success_rate DESC, frequency DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as ProceduralRow[];

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Search procedural memories by pattern or context
   */
  search(queryText: string): ProceduralMemory[] {
    const stmt = this.db.prepare(`
      SELECT id, pattern, context, frequency, success_rate as successRate, last_used as lastUsed, metadata
      FROM procedural_memory
      WHERE pattern LIKE ? OR context LIKE ?
      ORDER BY frequency DESC
    `);

    const searchPattern = `%${queryText}%`;
    const rows = stmt.all(searchPattern, searchPattern) as ProceduralRow[];

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Update success rate for a pattern
   */
  updateSuccessRate(pattern: string, successful: boolean): void {
    // Incremental average: new_avg = old_avg + (new_value - old_avg) / count
    const stmt = this.db.prepare(`
      UPDATE procedural_memory
      SET
        success_rate = success_rate + ((? - success_rate) / (frequency + 1)),
        frequency = frequency + 1,
        last_used = ?
      WHERE pattern = ?
    `);

    stmt.run(successful ? 1.0 : 0.0, Date.now(), pattern);
  }

  /**
   * Get procedural memory by ID
   */
  getById(id: number): ProceduralMemory | null {
    const stmt = this.db.prepare(`
      SELECT id, pattern, context, frequency, success_rate as successRate, last_used as lastUsed, metadata
      FROM procedural_memory
      WHERE id = ?
    `);

    const row = stmt.get(id) as ProceduralRow | undefined;
    if (!row) return null;

    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Delete rarely used patterns
   */
  pruneByFrequency(frequencyThreshold = 2): number {
    const stmt = this.db.prepare(`
      DELETE FROM procedural_memory
      WHERE frequency < ?
    `);

    const result = stmt.run(frequencyThreshold);
    return result.changes;
  }

  /**
   * Get count of procedural memories
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM procedural_memory');
    const row = stmt.get() as { count: number };
    return row.count;
  }
}
