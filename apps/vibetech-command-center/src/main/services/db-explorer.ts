import Database from 'better-sqlite3';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, normalize, relative, isAbsolute } from 'node:path';
import type { DbExplorerDatabase, DbTableSchema, DbExplorerResult } from '../../shared/types';
import { loadDatabaseTargets } from './database-inventory';

export interface DbExplorerOptions {
  allowedRoots: string[]; // e.g., ['D:\\databases', 'C:\\dev']
}

const ROW_LIMIT = 1_000;
const FETCH_LIMIT = ROW_LIMIT + 1;

function normalizeWindowsPath(path: string): string {
  return normalize(path.replace(/\//g, '\\'));
}

function isPathAllowed(targetPath: string, allowedRoots: string[]): boolean {
  const resolved = normalizeWindowsPath(resolve(targetPath)).toLowerCase();
  return allowedRoots.some((root) => {
    const allowedRoot = normalizeWindowsPath(resolve(root)).toLowerCase();
    const rel = relative(allowedRoot, resolved);
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
  });
}

function guardSql(sql: string): void {
  const trimmed = sql.trim();
  if (!/^\s*(SELECT|WITH)\b/i.test(trimmed)) {
    throw new Error('Only SELECT and WITH queries are allowed');
  }
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH|PRAGMA)\b/i.test(trimmed)) {
    throw new Error('Query contains forbidden keywords');
  }
  const withoutTrailingSemicolon = trimmed.replace(/;+\s*$/, '');
  if (withoutTrailingSemicolon.includes(';')) {
    throw new Error('Only one SELECT or WITH query is allowed');
  }
}

function limitSql(sql: string): string {
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  return `SELECT * FROM (${trimmed}) AS command_center_query_limit LIMIT ${FETCH_LIMIT}`;
}

export class DbExplorerService {
  constructor(private opts: DbExplorerOptions) {}

  async listDatabases(): Promise<DbExplorerDatabase[]> {
    const inventory = loadDatabaseTargets();
    const allowedRoots = this.opts.allowedRoots.map((r) => normalizeWindowsPath(resolve(r)));
    const result: DbExplorerDatabase[] = [];
    const seenPaths = new Set<string>();

    for (const target of inventory) {
      const normalizedPath = normalizeWindowsPath(target.path);
      if (!isPathAllowed(normalizedPath, this.opts.allowedRoots)) {
        continue;
      }
      seenPaths.add(normalizedPath.toLowerCase());

      const { sizeBytes, walSizeBytes, lastModifiedAt } = this.statDb(normalizedPath);
      result.push({
        name: target.name,
        path: normalizedPath,
        sizeBytes,
        walSizeBytes,
        lastModifiedAt,
        tables: []
      });
    }

    // Scan allowedRoots for any .db / .sqlite / .sqlite3 files not in inventory
    for (const root of allowedRoots) {
      if (!existsSync(root)) continue;
      try {
        const entries = readdirSync(root, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) continue;
          const name = entry.name;
          if (!/\.(db|sqlite|sqlite3)$/i.test(name)) continue;
          const fullPath = normalizeWindowsPath(resolve(root, name));
          if (seenPaths.has(fullPath.toLowerCase())) continue;
          seenPaths.add(fullPath.toLowerCase());

          const { sizeBytes, walSizeBytes, lastModifiedAt } = this.statDb(fullPath);
          result.push({
            name,
            path: fullPath,
            sizeBytes,
            walSizeBytes,
            lastModifiedAt,
            tables: []
          });
        }
      } catch {
        // ignore unreadable directories
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSchema(dbPath: string): Promise<DbTableSchema[]> {
    if (!isPathAllowed(dbPath, this.opts.allowedRoots)) {
      throw new Error('Database path is outside allowed roots');
    }
    if (!existsSync(dbPath)) {
      throw new Error('Database file not found');
    }

    let db: Database.Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true, fileMustExist: true });
      db.pragma('query_only = ON');

      const tableRows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all() as Array<{ name: string }>;

      const schemas: DbTableSchema[] = [];
      for (const t of tableRows) {
        const tableName = t.name;
        const infoRows = db.prepare(`PRAGMA table_info("${tableName.replace(/"/g, '""')}")`).all() as Array<{
          name: string;
          type: string;
          notnull: number;
          dflt_value: string | null;
        }>;

        const columns = infoRows.map((col) => ({
          name: col.name,
          type: col.type,
          notNull: col.notnull !== 0,
          defaultValue: col.dflt_value ?? null
        }));

        let rowCount = 0;
        try {
          const countRow = db.prepare(`SELECT COUNT(*) as c FROM "${tableName.replace(/"/g, '""')}"`).get() as { c: number };
          rowCount = countRow.c;
        } catch {
          rowCount = -1;
        }

        let estimatedSizeBytes: number | null = null;
        try {
          const sizeRow = db.prepare('SELECT SUM(pgsize) as s FROM dbstat WHERE name = ?').get(tableName) as { s: number } | undefined;
          estimatedSizeBytes = sizeRow?.s ?? null;
        } catch {
          estimatedSizeBytes = null;
        }

        schemas.push({ name: tableName, columns, rowCount, estimatedSizeBytes });
      }

      return schemas;
    } finally {
      db?.close();
    }
  }

  async runQuery(dbPath: string, sql: string): Promise<DbExplorerResult> {
    if (!isPathAllowed(dbPath, this.opts.allowedRoots)) {
      throw new Error('Database path is outside allowed roots');
    }
    if (!existsSync(dbPath)) {
      throw new Error('Database file not found');
    }
    guardSql(sql);

    let db: Database.Database | null = null;
    const startedAt = Date.now();
    try {
      db = new Database(dbPath, { readonly: true, fileMustExist: true });
      db.pragma('query_only = ON');

      const stmt = db.prepare(limitSql(sql));
      const raw = stmt.raw(true);

      const rows = raw.all() as unknown[][];

      const columns = stmt.columns().map((c) => c.name);
      const truncated = rows.length > ROW_LIMIT;
      const limitedRows = truncated ? rows.slice(0, ROW_LIMIT) : rows;

      return {
        columns,
        rows: limitedRows,
        rowCount: limitedRows.length,
        truncated,
        executionMs: Date.now() - startedAt
      };
    } finally {
      db?.close();
    }
  }

  private statDb(dbPath: string): { sizeBytes: number; walSizeBytes: number; lastModifiedAt: number } {
    if (!existsSync(dbPath)) {
      return { sizeBytes: 0, walSizeBytes: 0, lastModifiedAt: 0 };
    }
    const stat = statSync(dbPath);
    const walPath = `${dbPath}-wal`;
    const walSizeBytes = existsSync(walPath) ? statSync(walPath).size : 0;
    return { sizeBytes: stat.size, walSizeBytes, lastModifiedAt: stat.mtimeMs };
  }
}
