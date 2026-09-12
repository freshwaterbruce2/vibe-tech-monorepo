import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface AppDatabaseConfig {
  path?: string;
  readOnly?: boolean;
  verbose?: boolean;
}

export class AppDatabase {
  private db: Database.Database;
  private static instance: AppDatabase | null = null;

  constructor(config: AppDatabaseConfig = {}) {
    const defaultPath = process.env.APP_DB_PATH || resolve(process.cwd(), 'data', 'ai-avatar.db');
    let dbPath = config.path ?? defaultPath;

    if (dbPath !== ':memory:') {
      try {
        const dir = dirname(dbPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      } catch {
        // If configured path (e.g. unavailable drive) is inaccessible, fallback to local data folder
        const fallbackPath = resolve(process.cwd(), 'data', 'ai-avatar.db');
        const fallbackDir = dirname(fallbackPath);
        if (!existsSync(fallbackDir)) {
          mkdirSync(fallbackDir, { recursive: true });
        }
        dbPath = fallbackPath;
      }
    }

    this.db = new Database(dbPath, {
      readonly: config.readOnly ?? false,
      verbose: config.verbose ? (msg: unknown) => process.stdout.write(`[db-app] ${String(msg)}\n`) : undefined,
    });

    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Enable WAL mode for high concurrency
    try {
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('busy_timeout = 5000');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('foreign_keys = ON');
    } catch {
      // Memory or restricted environments might ignore some pragmas
    }
  }

  public static getInstance(config?: AppDatabaseConfig): AppDatabase {
    if (!AppDatabase.instance) {
      AppDatabase.instance = new AppDatabase(config);
    } else if (config) {
      console.warn('[AppDatabase] getInstance() called with config but instance already exists.');
    }
    return AppDatabase.instance;
  }

  public static resetInstance(): void {
    if (AppDatabase.instance) {
      AppDatabase.instance.close();
    }
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  public async backup(destination: string): Promise<unknown> {
    return await this.db.backup(destination);
  }

  public vacuum(): void {
    this.db.exec('VACUUM');
  }

  public analyze(): void {
    this.db.exec('ANALYZE');
  }

  public checkpoint(): void {
    this.db.pragma('wal_checkpoint(TRUNCATE)');
  }

  public close(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
    AppDatabase.instance = null;
  }
}

export default AppDatabase;
