import type Database from 'better-sqlite3';
import type { EpisodicMemory, SearchResult } from '../types/index.js';

interface EpisodicRow {
  id: number;
  sourceId: string;
  timestamp: number;
  query: string;
  response: string;
  sessionId?: string;
  metadata: string | null;
  score?: number;
}

export class EpisodicStore {
  constructor(private db: Database.Database) {}

  /**
   * Add episodic memory (timestamped event)
   */
  add(memory: EpisodicMemory): number {
    const stmt = this.db.prepare(`
      INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      memory.sourceId,
      memory.timestamp ?? Date.now(),
      memory.query,
      memory.response,
      memory.sessionId ?? null,
      memory.metadata ? JSON.stringify(memory.metadata) : null,
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Add episodic memory with near-duplicate detection.
   * Skips insert if an identical (source_id, session_id, query, response) row
   * exists within the recency window (default: 5 minutes). Returns existing id
   * on dup-hit. Use this for auto-recorded events that may retry/replay; use
   * add() for explicit logging where every entry should land.
   */
  addUnique(
    memory: EpisodicMemory,
    options?: { recencyWindowMs?: number },
  ): { id: number; deduped: boolean } {
    const recencyWindowMs = options?.recencyWindowMs ?? 5 * 60 * 1000;
    const ts = memory.timestamp ?? Date.now();
    const cutoff = ts - recencyWindowMs;

    const existing = this.db
      .prepare(
        `SELECT id FROM episodic_memory
         WHERE source_id = ?
           AND COALESCE(session_id, '') = COALESCE(?, '')
           AND query = ?
           AND response = ?
           AND timestamp >= ?
         ORDER BY timestamp DESC
         LIMIT 1`,
      )
      .get(memory.sourceId, memory.sessionId ?? null, memory.query, memory.response, cutoff) as
      | { id: number }
      | undefined;

    if (existing) return { id: existing.id, deduped: true };

    return { id: this.add(memory), deduped: false };
  }

  /**
   * Batch insert episodic memories (uses SQLite transaction for speed)
   */
  addMany(memories: EpisodicMemory[]): number[] {
    const stmt = this.db.prepare(`
      INSERT INTO episodic_memory (source_id, timestamp, query, response, session_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const ids: number[] = [];
    const insertAll = this.db.transaction((items: EpisodicMemory[]) => {
      for (const memory of items) {
        const result = stmt.run(
          memory.sourceId,
          memory.timestamp ?? Date.now(),
          memory.query,
          memory.response,
          memory.sessionId ?? null,
          memory.metadata ? JSON.stringify(memory.metadata) : null,
        );
        ids.push(result.lastInsertRowid as number);
      }
    });

    insertAll(memories);
    return ids;
  }

  /**
   * Get recent episodic memories
   */
  getRecent(limit = 10, sourceId?: string): EpisodicMemory[] {
    let query = `
      SELECT
        id, source_id as sourceId, timestamp, query, response, session_id as sessionId, metadata
      FROM episodic_memory
    `;

    const params: (string | number)[] = [];

    if (sourceId) {
      query += ` WHERE source_id = ?`;
      params.push(sourceId);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as EpisodicRow[];

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Search episodic memories by query text (FTS5 full-text search with LIKE fallback)
   */
  search(queryText: string, limit = 10): SearchResult<EpisodicMemory>[] {
    // Try FTS5 first — much faster than LIKE
    try {
      const stmt = this.db.prepare(`
        SELECT
          e.id, e.source_id as sourceId, e.timestamp, e.query, e.response,
          e.session_id as sessionId, e.metadata,
          (-bm25(episodic_fts, 10.0, 1.0)) as score
        FROM episodic_fts
        JOIN episodic_memory e ON e.id = episodic_fts.rowid
        WHERE episodic_fts MATCH ?
        ORDER BY score DESC
        LIMIT ?
      `);

      const rows = stmt.all(queryText, limit) as EpisodicRow[];
      return rows.map((row) => this.mapRow(row));
    } catch {
      // FTS5 not available — fall back to LIKE
      return this.searchLike(queryText, limit);
    }
  }

  /** LIKE-based fallback search */
  private searchLike(queryText: string, limit: number): SearchResult<EpisodicMemory>[] {
    const stmt = this.db.prepare(`
      SELECT
        id, source_id as sourceId, timestamp, query, response, session_id as sessionId, metadata,
        (
          CASE
            WHEN query LIKE ? THEN 1.0
            WHEN response LIKE ? THEN 0.8
            ELSE 0.5
          END
        ) as score
      FROM episodic_memory
      WHERE query LIKE ? OR response LIKE ?
      ORDER BY score DESC, timestamp DESC
      LIMIT ?
    `);

    const searchPattern = `%${queryText}%`;
    const rows = stmt.all(
      searchPattern,
      searchPattern,
      searchPattern,
      searchPattern,
      limit,
    ) as EpisodicRow[];

    return rows.map((row) => this.mapRow(row));
  }

  /** Map a raw SQLite row to a SearchResult */
  private mapRow(row: EpisodicRow): SearchResult<EpisodicMemory> {
    return {
      item: {
        id: row.id,
        sourceId: row.sourceId,
        timestamp: row.timestamp,
        query: row.query,
        response: row.response,
        sessionId: row.sessionId,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      },
      score: row.score ?? 0.5,
      distance: 1 - (row.score ?? 0.5),
    };
  }

  /**
   * Get episodic memory by ID
   */
  getById(id: number): EpisodicMemory | null {
    const stmt = this.db.prepare(`
      SELECT id, source_id as sourceId, timestamp, query, response, session_id as sessionId, metadata
      FROM episodic_memory
      WHERE id = ?
    `);

    const row = stmt.get(id) as EpisodicRow | undefined;
    if (!row) return null;

    return {
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Delete old episodic memories (retention policy)
   */
  deleteOlderThan(daysOld: number): number {
    const cutoffTimestamp = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      DELETE FROM episodic_memory
      WHERE timestamp < ?
    `);

    const result = stmt.run(cutoffTimestamp);
    return result.changes;
  }

  /**
   * Get count of episodic memories
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM episodic_memory');
    const row = stmt.get() as { count: number };
    return row.count;
  }

  /**
   * Get all memories for a specific session
   */
  getBySession(sessionId: string): EpisodicMemory[] {
    const stmt = this.db.prepare(`
      SELECT id, source_id as sourceId, timestamp, query, response, session_id as sessionId, metadata
      FROM episodic_memory
      WHERE session_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(sessionId) as EpisodicRow[];

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Get memories within a time range
   */
  getTimeRange(startTime: number, endTime: number, limit = 100): EpisodicMemory[] {
    const stmt = this.db.prepare(`
      SELECT id, source_id as sourceId, timestamp, query, response, session_id as sessionId, metadata
      FROM episodic_memory
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(startTime, endTime, limit) as EpisodicRow[];

    return rows.map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }
}
