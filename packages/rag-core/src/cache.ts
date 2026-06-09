/**
 * Query Cache for RAG Pipeline
 * SQLite-backed TTL cache for search results.
 * Auto-invalidates when the indexer detects changes in relevant file paths.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { CacheStats, RAGConfig, SearchResult } from './types.js';

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

export class RAGCache {
  private db: Database.Database;
  private ttlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(config: Pick<RAGConfig, 'cachePath' | 'cacheTtlMs'>) {
    const dir = dirname(config.cachePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(config.cachePath);
    this.ttlMs = config.cacheTtlMs ?? DEFAULT_TTL_MS;
    this.init();
  }

  private init(): void {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS query_cache (
        key TEXT PRIMARY KEY,
        query_text TEXT NOT NULL,
        results TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        ttl_ms INTEGER NOT NULL,
        hit_count INTEGER DEFAULT 0,
        file_paths TEXT
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cache_created ON query_cache(created_at)
    `);

    // Clean expired entries on startup
    this.cleanExpired();
  }

  /**
   * Get cached results for a query
   */
  get(queryText: string): SearchResult[] | null {
    const key = this.makeKey(queryText);
    const now = Date.now();

    const row = this.db.prepare(
      'SELECT results, created_at, ttl_ms FROM query_cache WHERE key = ?',
    ).get(key) as { results: string; created_at: number; ttl_ms: number } | undefined;

    if (!row) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (now - row.created_at > row.ttl_ms) {
      this.db.prepare('DELETE FROM query_cache WHERE key = ?').run(key);
      this.misses++;
      return null;
    }

    // Update hit count
    this.db.prepare(
      'UPDATE query_cache SET hit_count = hit_count + 1 WHERE key = ?',
    ).run(key);

    this.hits++;
    return JSON.parse(row.results) as SearchResult[];
  }

  /**
   * Store search results in cache
   */
  set(queryText: string, results: SearchResult[], ttlMs?: number): void {
    const key = this.makeKey(queryText);
    const filePaths = [...new Set(results.map((r) => r.chunk.filePath))];

    this.db.prepare(`
      INSERT OR REPLACE INTO query_cache (key, query_text, results, created_at, ttl_ms, hit_count, file_paths)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(
      key,
      queryText,
      JSON.stringify(results),
      Date.now(),
      ttlMs ?? this.ttlMs,
      JSON.stringify(filePaths),
    );
  }

  /**
   * Invalidate cache entries that reference specific file paths
   */
  invalidateByPaths(filePaths: string[]): number {
    let invalidated = 0;

    // Get all cache entries that reference any of the changed paths
    const allEntries = this.db.prepare(
      'SELECT key, file_paths FROM query_cache WHERE file_paths IS NOT NULL',
    ).all() as Array<{ key: string; file_paths: string }>;

    const changedSet = new Set(filePaths);
    const keysToDelete: string[] = [];

    for (const entry of allEntries) {
      try {
        const cached = JSON.parse(entry.file_paths) as string[];
        if (cached.some((p) => changedSet.has(p))) {
          keysToDelete.push(entry.key);
        }
      } catch { /* ignore parse errors */ }
    }

    if (keysToDelete.length > 0) {
      const deleteStmt = this.db.prepare('DELETE FROM query_cache WHERE key = ?');
      const deleteAll = this.db.transaction((keys: string[]) => {
        for (const key of keys) {
          deleteStmt.run(key);
          invalidated++;
        }
      });
      deleteAll(keysToDelete);
    }

    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.db.prepare('DELETE FROM query_cache').run();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Remove expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    const result = this.db.prepare(
      'DELETE FROM query_cache WHERE (? - created_at) > ttl_ms',
    ).run(now);
    return result.changes;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        MIN(created_at) as oldest,
        SUM(LENGTH(results)) as totalSize
      FROM query_cache
    `).get() as { total: number; oldest: number | null; totalSize: number | null };

    return {
      totalEntries: row.total,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? this.hits / (this.hits + this.misses)
        : 0,
      oldestEntry: row.oldest,
      totalSizeBytes: row.totalSize ?? 0,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  private makeKey(queryText: string): string {
    // Normalize: lowercase, trim, collapse whitespace
    const normalized = queryText.toLowerCase().trim().replace(/\s+/g, ' ');
    return createHash('sha256').update(normalized).digest('hex');
  }
}
