/**
 * Production-safe logger for vibe-tutor.
 *
 * - debug/info: development only (stripped in production builds)
 * - warn/error: always active; persisted to a 50-entry ring buffer in appStore
 *   so errors are retrievable even when DevTools is not attached (Android/Capacitor)
 *
 * Retrieve persisted errors:
 *   import { logger } from '@/utils/logger';
 *   const entries = logger.getLog();   // LogEntry[]
 *   logger.clearLog();
 */

import { appStore } from './electronStore';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: string;   // JSON-serialized, kept small
  timestamp: string;
}

const STORE_KEY = 'appErrorLog';
const BUFFER_SIZE = 50;
const isDev = import.meta.env.DEV;

function persist(level: LogLevel, message: string, extra?: unknown): void {
  try {
    const existing = appStore.get<LogEntry[]>(STORE_KEY) ?? [];
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(extra !== undefined && { data: JSON.stringify(extra).slice(0, 500) }),
    };
    existing.push(entry);
    if (existing.length > BUFFER_SIZE) {
      existing.splice(0, existing.length - BUFFER_SIZE);
    }
    appStore.set(STORE_KEY, existing);
  } catch {
    // Storage unavailable — fail silently to avoid infinite loops
  }
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (isDev) console.debug(`[DEBUG] ${message}`, ...args);
  },

  info(message: string, ...args: unknown[]): void {
    if (isDev) console.info(`[INFO] ${message}`, ...args);
  },

  warn(message: string, ...args: unknown[]): void {
    if (isDev) console.warn(`[WARN] ${message}`, ...args);
    persist('warn', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
  },

  error(message: string, ...args: unknown[]): void {
    // Always log errors — DevTools will show them when attached
    console.error(`[ERROR] ${message}`, ...args);
    persist('error', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
  },

  /** Retrieve persisted warn/error entries from appStore. */
  getLog(): LogEntry[] {
    return appStore.get<LogEntry[]>(STORE_KEY) ?? [];
  },

  /** Clear the persisted log. */
  clearLog(): void {
    appStore.delete(STORE_KEY);
  },
};
