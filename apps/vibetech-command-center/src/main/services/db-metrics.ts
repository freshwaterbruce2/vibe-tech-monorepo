import Database from 'better-sqlite3';
import { statSync, existsSync } from 'node:fs';
import type { DbMetric } from '../../shared/types';

export interface DbTarget {
  name: string;
  path: string;
}

export const DEFAULT_DB_TARGETS: DbTarget[] = [
  // Core AI / agent infrastructure
  { name: 'nova_activity',           path: 'D:\\databases\\nova_activity.db' },
  { name: 'agent_learning',          path: 'D:\\databases\\agent_learning.db' },
  { name: 'agent_tasks',             path: 'D:\\databases\\agent_tasks.db' },
  { name: 'memory',                  path: 'D:\\databases\\memory.db' },
  { name: 'learning',                path: 'D:\\databases\\learning.db' },

  // Trading
  { name: 'trading',                 path: 'D:\\databases\\trading.db' },
  { name: 'trading_crypto_enhanced', path: 'D:\\databases\\crypto-enhanced\\trading.db' },

  // App-specific
  { name: 'vibe_studio',             path: 'D:\\databases\\vibe_studio.db' },
  { name: 'vibe_justice',            path: 'D:\\databases\\vibe_justice.db' },
  { name: 'vibe_shop',               path: 'D:\\databases\\vibe_shop.db' },
  { name: 'vibe_code_studio_apex',   path: 'D:\\databases\\vibe-code-studio\\vibe_apex.db' },
  { name: 'digital_content_builder', path: 'D:\\databases\\digital-content-builder.db' },
  { name: 'trendmart',               path: 'D:\\databases\\trendmart.db' },

  // Infrastructure / meta
  { name: 'database_main',           path: 'D:\\databases\\database.db' },
  { name: 'chatmessage',             path: 'D:\\databases\\chatmessage.db' },
  { name: 'claude_newchatmessage',   path: 'D:\\databases\\claude_newchatmessage.db' },
  { name: 'cleanup_automation',      path: 'D:\\databases\\cleanup_automation.db' },
  { name: 'feature_flags',           path: 'D:\\databases\\feature_flags.db' },
  { name: 'job_queue',               path: 'D:\\databases\\job_queue.db' },
  { name: 'monitor',                 path: 'D:\\databases\\monitor.db' },

  // Sub-directories
  { name: 'nova_memory',             path: 'D:\\databases\\nova\\nova_memory.db' },
  { name: 'deepcode_database',       path: 'D:\\databases\\shared-memory\\deepcode_database.db' },
  { name: 'tasks_active',            path: 'D:\\databases\\task-registry\\active_tasks.db' },
  { name: 'tasks_history',           path: 'D:\\databases\\task-registry\\task_history.db' }
];

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

      db = new Database(target.path, { readonly: true, fileMustExist: true });
      db.pragma('query_only = ON');

      const pageCount = (db.pragma('page_count', { simple: true }) as number) ?? 0;
      const pageSize = (db.pragma('page_size', { simple: true }) as number) ?? 0;
      const journalMode = String(db.pragma('journal_mode', { simple: true }) ?? 'unknown');

      const tableRows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all() as Array<{ name: string }>;

      const tables = tableRows.map((t) => {
        try {
          const stmt = db!.prepare(`SELECT COUNT(*) as c FROM "${t.name.replace(/"/g, '""')}"`);
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
