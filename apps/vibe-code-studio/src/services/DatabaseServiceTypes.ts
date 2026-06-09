/**
 * DatabaseServiceTypes - Shared type definitions for DatabaseService
 *
 * Extracted from DatabaseService.ts to keep that file under 480 lines.
 * All symbols are re-exported from DatabaseService.ts so importers are unaffected.
 */

// -----------------------------------------------------------------------------
// Constants & Helpers
// -----------------------------------------------------------------------------
const getDatabasePath = (): string => {
  // Detect Electron environment - use unified hub DB
  if (typeof window !== 'undefined' && window.electron?.isElectron) {
    // Always use D:\databases\vibe_studio.db for unified integration
    const centralized = import.meta.env.VITE_DATABASE_PATH || 'D:\\databases\\vibe_studio.db';
    return centralized;
  }

  // Web / fallback - empty string signals localStorage mode
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

// Electron IPC proxy shape (async, used in renderer)
export interface ElectronDbProxy {
  initialize: () => Promise<{ success: boolean; error?: string }>;
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ success: boolean; data: unknown; error?: string }>;
  close?: () => void;
}

// sql.js Database shape (sync, used in web mode)
export interface SqlJsDb {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string, params?: unknown[]) => Array<{ values: unknown[] }>;
  prepare: (sql: string) => {
    run: (...args: unknown[]) => void;
    get: (key: string) => { value?: string } | undefined;
  };
  export: () => Uint8Array;
}

export type DatabaseHandle = ElectronDbProxy | SqlJsDb;
