/**
 * DatabaseService - Centralized database integration
 *
 * Integrates DeepCode Editor with the centralized D:\\databases\\database.db
 * following monorepo best practices.
 *
 * Features:
 * - Chat history persistence across sessions
 * - Code snippets library with search
 * - Application settings storage
 * - Analytics and telemetry tracking
 * - Strategy memory migration from localStorage
 *
 * Platform Support:
 * - Electron: Native SQLite via better-sqlite3
 * - Web: In-memory SQLite via sql.js
 * - Graceful fallback to localStorage when database unavailable
 */

import { logger } from './Logger';
import { runMigration } from './migrationRunner';

// -----------------------------------------------------------------------------
// Constants & Helpers
// -----------------------------------------------------------------------------
const getDatabasePath = (): string => {
  // Detect Electron environment - use unified hub DB
  if (typeof window !== 'undefined' && (window as any).electron?.isElectron) {
    // Always use D:\databases\database.db for unified integration
    const centralized = 'D:\\databases\\database.db';
    logger.debug(`[DatabaseService] Using unified hub DB at ${centralized}`);
    return centralized;
  }

  // Web / fallback – empty string signals localStorage mode
  logger.debug('[DatabaseService] Web environment – localStorage fallback');
  return '';
};

export const DATABASE_PATH = getDatabasePath();
export const STORAGE_FALLBACK_PREFIX = 'deepcode_fallback_';

// -----------------------------------------------------------------------------
// Type Definitions (exactOptionalPropertyTypes compliance)
// -----------------------------------------------------------------------------
export interface ChatMessage {
  id?: number;
  timestamp?: Date;
  workspace_path: string;
  user_message: string;
  ai_response: string;
  model_used: string;
  tokens_used?: number | null;
  workspace_context?: string | null; // JSON blob
}

export interface CodeSnippet {
  id?: number;
  language: string;
  code: string;
  description?: string | null;
  tags?: string | null; // JSON array string
  created_at?: Date;
  usage_count?: number;
  last_used?: Date | null;
}

export interface AnalyticsEvent {
  id?: number;
  event_type: string;
  event_data?: string; // JSON blob
  timestamp?: Date;
}

export interface StrategyMemoryRecord {
  id?: number;
  pattern_hash: string;
  pattern_data: string; // JSON blob
  success_rate: number;
  usage_count: number;
  last_used?: Date;
  created_at?: Date;
}

// -----------------------------------------------------------------------------
// DatabaseService Implementation
// -----------------------------------------------------------------------------
export class DatabaseService {
  private db: any = null;
  private isElectron: boolean = false;
  private useFallback: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.isElectron = this.detectElectron();
  }

  /** Detect Electron runtime */
  private detectElectron(): boolean {
    return typeof window !== 'undefined' && !!(window as any).electron?.isElectron;
  }

  /** Public initializer */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('[DatabaseService] Already initialized');
      return;
    }
    try {
      await this.connect();
      await this.initializeSchema();
      this.initialized = true;
      logger.debug('[DatabaseService] ✅ Initialized successfully');
    } catch (e) {
      logger.warn('[DatabaseService] Initialization failed, falling back to localStorage', e);
      this.useFallback = true;
      this.initialized = true;
    }
  }

  /** Connect to the appropriate storage backend */
  private async connect(): Promise<void> {
    if (this.isElectron) {
      // Electron – use IPC to access better-sqlite3 in main process
      // DO NOT import better-sqlite3 directly in renderer (causes "module is not defined")
      try {
        const electron = (window as any).electron;
        if (electron?.db?.initialize) {
          const result = await electron.db.initialize();
          if (result.success) {
            this.db = electron.db; // Use IPC proxy object
            logger.debug('[DatabaseService] Connected via Electron IPC');
            return;
          }
          throw new Error(result.error ?? 'DB initialization failed');
        }
        // Fallback: Electron preload doesn't expose db
        logger.warn('[DatabaseService] Electron db IPC not available, using fallback');
        this.useFallback = true;
      } catch (e) {
        logger.error('[DatabaseService] Electron DB connection failed, using fallback', e);
        this.useFallback = true;
      }
    } else {
      // Web – skip sql.js for now, use localStorage fallback
      // (sql.js requires WASM and adds significant bundle size)
      logger.debug('[DatabaseService] Web environment - using localStorage fallback');
      this.useFallback = true;
    }
  }

  /** Execute migration file inside a transaction */
  private async initializeSchema(): Promise<void> {
    if (this.useFallback) {
      logger.debug('[DatabaseService] Skipping schema init in fallback mode');
      return;
    }
    // In Electron, database-handler.ts (main process) initializes the schema.
    if (this.isElectron) {
      logger.debug('[DatabaseService] Schema initialization handled by main process');
      return;
    }
    try {
      await runMigration(this.db, '001_initial_schema.sql');
      logger.info('[DatabaseService] Schema initialized via migration');
    } catch (e) {
      logger.error('[DatabaseService] Schema migration failed', e);
      throw e;
    }
  }

  // -------------------------------------------------------------------------
  // Example CRUD methods (simplified for brevity)
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Example CRUD methods (simplified for brevity)
  // -------------------------------------------------------------------------
  async saveChatMessage(
    workspace: string,
    userMessage: string,
    aiResponse: string,
    model: string,
    tokens?: number,
    context?: any
  ): Promise<number | null> {
    if (this.useFallback) {
      return await this.saveChatMessageFallback(workspace, userMessage, aiResponse, model, tokens, context);
    }
    // Use 'chat_messages' table to match electron/database-handler.ts
    const sql = `INSERT INTO chat_messages (workspace_path, user_message, ai_response, model_used, tokens_used, workspace_context)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    const ctx = context ? JSON.stringify(context) : null;
    try {
      if (this.isElectron) {
        const result = await this.db.query(sql, [workspace, userMessage, aiResponse, model, tokens ?? null, ctx]);
        // result.data contains the RunResult object from better-sqlite3
        return result.success ? (result.data.lastInsertRowid as number) : null;
      } else {
        this.db.run(sql, [workspace, userMessage, aiResponse, model, tokens ?? null, ctx]);
        await this.saveToLocalStorage();
        return 1;
      }
    } catch (e) {
      logger.error('[DatabaseService] saveChatMessage error', e);
      return null;
    }
  }

  async getChatHistory(workspace: string, limit = 100, offset = 0): Promise<ChatMessage[]> {
    if (this.useFallback) {
      return await this.getChatHistoryFallback(workspace, limit, offset);
    }
    // Use 'chat_messages' table to match electron/database-handler.ts
    const sql = `SELECT * FROM chat_messages WHERE workspace_path = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    try {
      if (this.isElectron) {
        const result = await this.db.query(sql, [workspace, limit, offset]);
        // result.data contains the array of rows
        if (result.success && Array.isArray(result.data)) {
          return result.data.map((row: any) => this.parseChatMessage(row));
        }
        return [];
      } else {
        const result = this.db.exec(sql, [workspace, limit, offset]);
        if (!result[0]) return [];
        return result[0].values.map((row: any[]) => this.parseChatMessage(row));
      }
    } catch (e) {
      logger.error('[DatabaseService] getChatHistory error', e);
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // Fallback implementations (localStorage based)
  // -------------------------------------------------------------------------
  private async saveChatMessageFallback(
    workspace: string,
    userMessage: string,
    aiResponse: string,
    model: string,
    tokens?: number,
    context?: any
  ): Promise<number> {
    const key = `${STORAGE_FALLBACK_PREFIX}chat_${workspace}`;
    let stored = '[]';
    if (typeof window !== 'undefined' && window.electron?.store) {
      stored = await window.electron.store.get(key) ?? '[]';
    } else if (typeof localStorage !== 'undefined') {
      stored = window.electronAPI.store.get(key) ?? '[]';
    }
    const msgs: ChatMessage[] = JSON.parse(stored);
    const newMsg: ChatMessage = {
      id: Date.now(),
      timestamp: new Date(),
      workspace_path: workspace,
      user_message: userMessage,
      ai_response: aiResponse,
      model_used: model,
      tokens_used: tokens ?? null,
      workspace_context: context ? JSON.stringify(context) : null,
    };
    msgs.push(newMsg);

    if (typeof window !== 'undefined' && window.electron?.store) {
      await window.electron.store.set(key, JSON.stringify(msgs));
    } else if (typeof localStorage !== 'undefined') {
      window.electronAPI.store.set(key, JSON.stringify(msgs));
    }
    return newMsg.id!;
  }

  private async getChatHistoryFallback(workspace: string, limit: number, offset: number): Promise<ChatMessage[]> {
    const key = `${STORAGE_FALLBACK_PREFIX}chat_${workspace}`;
    let stored = '[]';
    if (typeof window !== 'undefined' && window.electron?.store) {
      stored = await window.electron.store.get(key) ?? '[]';
    } else if (typeof localStorage !== 'undefined') {
      stored = window.electronAPI.store.get(key) ?? '[]';
    }
    const msgs: ChatMessage[] = JSON.parse(stored);
    return msgs.slice(offset, offset + limit);
  }

  // -------------------------------------------------------------------------
  // Utility parsers
  // -------------------------------------------------------------------------
  private parseChatMessage(row: any): ChatMessage {
    if (Array.isArray(row)) {
      return {
        id: row[0],
        timestamp: new Date(row[1]),
        workspace_path: row[2],
        user_message: row[3],
        ai_response: row[4],
        model_used: row[5],
        tokens_used: row[6] ?? null,
        workspace_context: row[7] ? JSON.parse(row[7]) : null,
      };
    }
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      workspace_path: row.workspace_path,
      user_message: row.user_message,
      ai_response: row.ai_response,
      model_used: row.model_used,
      tokens_used: row.tokens_used ?? null,
      workspace_context: row.workspace_context ? JSON.parse(row.workspace_context) : null,
    };
  }

  // -------------------------------------------------------------------------
  // Persistence for sql.js (optional)
  // -------------------------------------------------------------------------
  private async saveToLocalStorage(): Promise<void> {
    if (this.isElectron || !this.db || typeof this.db.export !== 'function') return;
    try {
      const data = this.db.export();
      const base64 = btoa(String.fromCharCode(...data));
      if (typeof window !== 'undefined' && window.electron?.store) {
        await window.electron.store.set('deepcode_database_blob', base64);
      } else if (typeof localStorage !== 'undefined') {
        window.electronAPI.store.set('deepcode_database_blob', base64);
      }
    } catch (e) {
      logger.error('[DatabaseService] saveToLocalStorage failed', e);
    }
  }

  // -------------------------------------------------------------------------
  // Compatibility helpers for renderer (status, settings, analytics)
  // -------------------------------------------------------------------------
  async getStatus(): Promise<'ready' | 'fallback' | 'initializing'> {
    if (!this.initialized) {
      return 'initializing';
    }
    return this.useFallback ? 'fallback' : 'ready';
  }

  async getSetting(key: string): Promise<string | null> {
    if (this.useFallback) {
      if (typeof window !== 'undefined' && window.electron?.store) {
        return await window.electron.store.get(`${STORAGE_FALLBACK_PREFIX}setting_${key}`) ?? null;
      }
      if (typeof localStorage !== 'undefined') {
        return window.electronAPI.store.get(`${STORAGE_FALLBACK_PREFIX}setting_${key}`);
      }
      return null;
    }

    try {
      if (this.isElectron) {
        const result = await this.db.query('SELECT value FROM settings WHERE key = ?', [key]);
        // result.data contains the array of rows for SELECT queries
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          return result.data[0].value;
        }
        return null;
      }
      const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      const row = stmt.get(key) as { value?: string } | undefined;
      return row?.value ?? null;
    } catch (error) {
      logger.warn('[DatabaseService] getSetting failed, using fallback', error);
      if (typeof window !== 'undefined' && window.electron?.store) {
        return await window.electron.store.get(`${STORAGE_FALLBACK_PREFIX}setting_${key}`) ?? null;
      }
      if (typeof localStorage !== 'undefined') {
        return window.electronAPI.store.get(`${STORAGE_FALLBACK_PREFIX}setting_${key}`);
      }
      return null;
    }
  }

  async logEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
    if (this.useFallback) {
      const key = `${STORAGE_FALLBACK_PREFIX}events`;
      let existing: any[] = [];

      if (typeof window !== 'undefined' && window.electron?.store) {
        const stored = await window.electron.store.get(key) ?? '[]';
        existing = JSON.parse(stored);
        existing.push({ eventType, data, timestamp: new Date().toISOString() });
        await window.electron.store.set(key, JSON.stringify(existing));
      } else if (typeof localStorage !== 'undefined') {
        existing = JSON.parse(window.electronAPI.store.get(key) ?? '[]');
        existing.push({ eventType, data, timestamp: new Date().toISOString() });
        window.electronAPI.store.set(key, JSON.stringify(existing));
      }
      return;
    }

    try {
      if (this.isElectron) {
        await this.db.query(
          'INSERT INTO analytics_events (event_type, event_data, timestamp) VALUES (?, ?, ?)',
          [eventType, JSON.stringify(data || {}), new Date().toISOString()]
        );
        return;
      }
      const stmt = this.db.prepare('INSERT INTO analytics_events (event_type, event_data, timestamp) VALUES (?, ?, ?)');
      stmt.run(eventType, JSON.stringify(data || {}), new Date().toISOString());
    } catch (error) {
      logger.warn('[DatabaseService] logEvent failed, ignoring', error);
    }
  }

  async migrateStrategyMemory(): Promise<{ migrated: number }> {
    // In browser mode this is a no-op; in full DB mode we could pull from localStorage
    try {
      const legacyKey = `${STORAGE_FALLBACK_PREFIX}strategy_memory`;
      let legacy: string | null = null;

      if (typeof window !== 'undefined' && window.electron?.store) {
        legacy = await window.electron.store.get(legacyKey) ?? null;
      } else if (typeof localStorage !== 'undefined') {
        legacy = window.electronAPI.store.get(legacyKey);
      }

      if (!legacy) {
        return { migrated: 0 };
      }
      if (!this.useFallback && this.db) {
        // UPDATE: strategy_memory table added to handler, enabling migration.
        const parsed = JSON.parse(legacy) as Array<Record<string, unknown>>;
        let migrated = 0;

        if (this.isElectron) {
          // Electron: use IPC query method
          for (const entry of parsed) {
            try {
              await this.db.query(
                'INSERT INTO strategy_memory (pattern_hash, pattern_data, success_rate, usage_count, created_at) VALUES (?, ?, ?, ?, ?)',
                [
                  entry['pattern_hash'] ?? '',
                  JSON.stringify(entry['pattern_data'] ?? {}),
                  entry['success_rate'] ?? 0,
                  entry['usage_count'] ?? 0,
                  entry['created_at'] ?? new Date().toISOString()
                ]
              );
              migrated++;
            } catch (err) {
              logger.warn('[DatabaseService] Failed to migrate strategy memory row', err);
            }
          }
        } else {
          // sql.js: use prepare/run pattern
          const stmt = this.db.prepare(
            'INSERT INTO strategy_memory (pattern_hash, pattern_data, success_rate, usage_count, created_at) VALUES (?, ?, ?, ?, ?)'
          );
          parsed.forEach((entry: any) => {
            try {
              stmt.run(
                entry.pattern_hash ?? '',
                JSON.stringify(entry.pattern_data ?? {}),
                entry.success_rate ?? 0,
                entry.usage_count ?? 0,
                entry.created_at ?? new Date().toISOString()
              );
              migrated++;
            } catch (err) {
              logger.warn('[DatabaseService] Failed to migrate strategy memory row', err);
            }
          });
        }

        if (typeof window !== 'undefined' && window.electron?.store) {
          await window.electron.store.delete(legacyKey);
        } else if (typeof localStorage !== 'undefined') {
          window.electronAPI.store.delete(legacyKey);
        }
        return { migrated };
      }
      return { migrated: 0 };
    } catch (error) {
      logger.warn('[DatabaseService] migrateStrategyMemory failed', error);
      return { migrated: 0 };
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  async close(): Promise<void> {
    if (this.db && this.isElectron && typeof this.db.close === 'function') {
      this.db.close();
      logger.debug('[DatabaseService] Database connection closed');
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
