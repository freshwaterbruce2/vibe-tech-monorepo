import Database from 'better-sqlite3';
import { statSync, existsSync } from 'node:fs';
import type { DbMetric } from '../../shared/types';
import { loadDatabaseTargets } from './database-inventory';

export interface DbTarget {
  name: string;
  path: string;
}

export const DEFAULT_DB_TARGETS: DbTarget[] = loadDatabaseTargets().map((entry) => ({
  name: entry.name,
  path: entry.path,
}));

export interface DbMetricsOptions {
  targets?: DbTarget[];
}

export class DbMetricsService {
  private readonly targets: DbTarget[];

  constructor(opts: DbMetricsOptions = {}) {
    this.targets = opts.targets ?? DEFAULT_DB_TARGETS;
  }

  async collectAll(): Promise<DbMetric[]> {
    return this.targets.map((t) => this.collectOne(t));
  }

  collectOne(target: DbTarget): DbMetric {
    const baseline: DbMetric = {
      name: target.name,
      path: target.path,
      sizeBytes: 0,
      walSizeBytes: 0,
      pageCount: 0,
      pageSize: 0,
      tables: [],
      journalMode: 'unknown',
      lastCheckedAt: Date.now()
    };

    if (!existsSync(target.path)) {
      return { ...baseline, error: 'file not found' };
    }

    let db: Database.Database | null = null;
    try {
      const sizeBytes = statSync(target.path).size;
      const walPath = `${target.path}-wal`;
      const walSizeBytes = existsSync(walPath) ? statSync(walPath).size : 0;

      const database = (db = new Database(target.path, { readonly: true, fileMustExist: true }));
      database.pragma('query_only = ON');

      const pageCount = (database.pragma('page_count', { simple: true }) as number) ?? 0;
      const pageSize = (database.pragma('page_size', { simple: true }) as number) ?? 0;
      const journalMode = String(database.pragma('journal_mode', { simple: true }) ?? 'unknown');

      const tableRows = database
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as Array<{ name: string }>;

      const tables = tableRows.map((t) => {
        try {
          const stmt = database.prepare(`SELECT COUNT(*) as c FROM "${t.name.replace(/"/g, '""')}"`);
          const row = stmt.get() as { c: number };
          return { name: t.name, rowCount: row.c };
        } catch {
          return { name: t.name, rowCount: -1 };
        }
      });

      return {
        ...baseline,
        sizeBytes,
        walSizeBytes,
        pageCount,
        pageSize,
        tables,
        journalMode
      };
    } catch (err) {
      return { ...baseline, error: err instanceof Error ? err.message : String(err) };
    } finally {
      db?.close();
    }
  }
}
