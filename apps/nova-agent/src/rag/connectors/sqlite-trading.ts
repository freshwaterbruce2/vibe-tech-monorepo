/**
 * Trading Database Connector
 * Read-only access to D:\databases\trading.db for RAG context enrichment.
 * Provides schema introspection and structured query support.
 */

import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import type { ConnectorQuery, DatabaseSchema } from '../types.js';

const DEFAULT_DB_PATH = 'D:\\databases\\trading.db';

export class TradingConnector {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath ?? process.env.TRADING_DB_PATH ?? DEFAULT_DB_PATH;
  }

  /**
   * Open read-only connection to trading database
   */
  connect(): boolean {
    if (!existsSync(this.dbPath)) {
      console.error(`[TradingConnector] Database not found: ${this.dbPath}`);
      return false;
    }

    try {
      this.db = new Database(this.dbPath, { readonly: true });
      this.db.pragma('busy_timeout = 5000');
      return true;
    } catch (error) {
      console.error(`[TradingConnector] Connection failed:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Get schema information for all tables
   */
  getSchema(): DatabaseSchema[] {
    if (!this.db) return [];

    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    ).all() as Array<{ name: string }>;

    return tables.map((t) => {
      const columns = this.db!.prepare(`PRAGMA table_info('${t.name}')`).all() as Array<{
        name: string;
        type: string;
        notnull: number;
        pk: number;
      }>;

      const countRow = this.db!.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get() as { count: number };

      return {
        tableName: t.name,
        columns: columns.map((c) => ({
          name: c.name,
          type: c.type,
          nullable: c.notnull === 0,
          primaryKey: c.pk > 0,
        })),
        rowCount: countRow.count,
      };
    });
  }

  /**
   * Execute a read-only SQL query
   */
  query(sql: string, params?: unknown[]): ConnectorQuery {
    if (!this.db) {
      return { question: '', sql, error: 'Not connected' };
    }

    // Safety: only allow SELECT statements
    const trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH') && !trimmed.startsWith('PRAGMA')) {
      return { question: '', sql, error: 'Only SELECT/WITH/PRAGMA queries are allowed (read-only)' };
    }

    try {
      const results = this.db.prepare(sql).all(...(params ?? [])) as Record<string, unknown>[];
      return { question: '', sql, results };
    } catch (error) {
      return { question: '', sql, error: (error as Error).message };
    }
  }

  /**
   * Get recent trading activity summary
   */
  getRecentActivity(limit = 10): Record<string, unknown>[] {
    if (!this.db) return [];

    try {
      return this.db.prepare(`
        SELECT * FROM orders
        ORDER BY created_at DESC
        LIMIT ?
      `).all(limit) as Record<string, unknown>[];
    } catch {
      return [];
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db?.close();
    this.db = null;
  }
}
