import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { CacheStats, RAGConfig, SearchResult } from './types.js';

export class RAGCache {
  private db: Database.Database;
  private ttlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(config: Pick<RAGConfig, 'cachePath' | 'cacheTtlMs'>) {
    const dir = dirname(config.cachePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.db = new Database(config.cachePath);
    this.ttlMs = config.cacheTtlMs ?? 3600000;
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.exec(`CREATE TABLE IF NOT EXISTS query_cache (key TEXT PRIMARY KEY, query_text TEXT NOT NULL, results TEXT NOT NULL, created_at INTEGER NOT NULL, ttl_ms INTEGER NOT NULL, hit_count INTEGER DEFAULT 0, file_paths TEXT)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_cache_created ON query_cache(created_at)`);
    this.cleanExpired();
  }

  get(queryText: string): SearchResult[] | null {
    const key = this.makeKey(queryText);
    const row = this.db.prepare('SELECT results, created_at, ttl_ms FROM query_cache WHERE key = ?').get(key) as
      { results: string; created_at: number; ttl_ms: number } | undefined;
    if (!row) { this.misses++; return null; }
    if (Date.now() - row.created_at > row.ttl_ms) {
      this.db.prepare('DELETE FROM query_cache WHERE key = ?').run(key);
      this.misses++; return null;
    }
    this.db.prepare('UPDATE query_cache SET hit_count = hit_count + 1 WHERE key = ?').run(key);
    this.hits++;
    return JSON.parse(row.results) as SearchResult[];
  }

  set(queryText: string, results: SearchResult[], ttlMs?: number): void {
    const key = this.makeKey(queryText);
    const filePaths = [...new Set(results.map((r) => r.chunk.filePath))];
    this.db.prepare(`INSERT OR REPLACE INTO query_cache (key, query_text, results, created_at, ttl_ms, hit_count, file_paths) VALUES (?, ?, ?, ?, ?, 0, ?)`)
      .run(key, queryText, JSON.stringify(results), Date.now(), ttlMs ?? this.ttlMs, JSON.stringify(filePaths));
  }

  invalidateByPaths(filePaths: string[]): number {
    const allEntries = this.db.prepare('SELECT key, file_paths FROM query_cache WHERE file_paths IS NOT NULL').all() as
      { key: string; file_paths: string }[];
    const changedSet = new Set(filePaths);
    const keysToDelete = allEntries.filter((e) => {
      try { return (JSON.parse(e.file_paths) as string[]).some((p) => changedSet.has(p)); } catch { return false; }
    }).map((e) => e.key);
    if (keysToDelete.length > 0) {
      const del = this.db.prepare('DELETE FROM query_cache WHERE key = ?');
      this.db.transaction((keys: string[]) => keys.forEach((k) => del.run(k)))(keysToDelete);
    }
    return keysToDelete.length;
  }

  clear(): void { this.db.prepare('DELETE FROM query_cache').run(); this.hits = 0; this.misses = 0; }

  cleanExpired(): number {
    return this.db.prepare('DELETE FROM query_cache WHERE (? - created_at) > ttl_ms').run(Date.now()).changes;
  }

  getStats(): CacheStats {
    const row = this.db.prepare('SELECT COUNT(*) as total, MIN(created_at) as oldest, SUM(LENGTH(results)) as totalSize FROM query_cache').get() as
      { total: number; oldest: number | null; totalSize: number | null };
    return { totalEntries: row.total, hits: this.hits, misses: this.misses, hitRate: this.hits + this.misses > 0 ? this.hits / (this.hits + this.misses) : 0, oldestEntry: row.oldest, totalSizeBytes: row.totalSize ?? 0 };
  }

  close(): void { this.db.close(); }

  private makeKey(q: string): string {
    return createHash('sha256').update(q.toLowerCase().trim().replace(/\s+/g, ' ')).digest('hex');
  }
}
