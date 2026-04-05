/**
 * Production-ready Logger Service
 * Console output + file persistence for ERROR+ in Tauri builds.
 * Logs written to $APPDATA/vibe-code-studio/logs/app.log (rotated at 5 MB).
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/** Minimum level written to disk (ERROR and above) */
const FILE_LOG_LEVEL = LogLevel.ERROR;
/** Max log file size before rotation (5 MB) */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

class LoggerService {
  private level: LogLevel;
  private isDevelopment: boolean;

  // File sink state (lazy-initialized)
  private logDir: string | null = null;
  private logPath: string | null = null;
  private fsReady = false;
  private fsInitPromise: Promise<void> | null = null;
  private writeQueue: string[] = [];
  private flushing = false;

  constructor() {
    this.isDevelopment = process.env['NODE_ENV'] !== 'production';
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
      this.writeToFile('ERROR', message, args);
    }
  }

  log(message: string, ...args: unknown[]): void {
    this.info(message, ...args);
  }

  // Group console methods
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  // Table for debugging
  table(data: unknown): void {
    if (this.isDevelopment) {
      console.table(data);
    }
  }

  // Time tracking
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // -----------------------------------------------------------------------
  // File persistence (Tauri only, ERROR+ level)
  // -----------------------------------------------------------------------

  /**
   * Lazy-init: resolve the log directory once, then reuse.
   * Silently no-ops in non-Tauri environments (web, dev server).
   */
  private ensureFs(): Promise<void> {
    if (this.fsReady) return Promise.resolve();
    if (this.fsInitPromise) return this.fsInitPromise;

    this.fsInitPromise = this.initFs().then(
      () => { this.fsReady = true; },
      () => { /* not in Tauri — file logging disabled */ },
    );
    return this.fsInitPromise;
  }

  private async initFs(): Promise<void> {
    if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
      throw new Error('Not Tauri');
    }

    const pathMod = await import('@tauri-apps/api/path');
    const appData = await pathMod.appDataDir();
    this.logDir = `${appData}\\logs`;
    this.logPath = `${this.logDir}\\app.log`;

    // Ensure logs directory exists
    const fsMod = await import('@tauri-apps/plugin-fs');
    try {
      await fsMod.mkdir(this.logDir, { recursive: true });
    } catch {
      // directory may already exist
    }
  }

  private writeToFile(level: string, message: string, args: unknown[]): void {
    if (FILE_LOG_LEVEL > LogLevel.ERROR) return; // compile-time guard

    const timestamp = new Date().toISOString();
    const extra = args.length
      ? ' ' + args.map(a => {
          try { return typeof a === 'string' ? a : JSON.stringify(a); }
          catch { return String(a); }
        }).join(' ')
      : '';
    const line = `${timestamp} [${level}] ${message}${extra}\n`;

    this.writeQueue.push(line);
    this.flushQueue();
  }

  private async flushQueue(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;

    try {
      await this.ensureFs();
      if (!this.fsReady || !this.logPath || !this.logDir) {
        this.writeQueue.length = 0;
        return;
      }

      const fsMod = await import('@tauri-apps/plugin-fs');

      // Rotate if log file exceeds max size
      try {
        const stat = await fsMod.stat(this.logPath);
        if (stat.size > MAX_FILE_BYTES) {
          const rotated = `${this.logDir}\\app.log.1`;
          try { await fsMod.remove(rotated); } catch { /* ok */ }
          await fsMod.rename(this.logPath, rotated);
        }
      } catch {
        // file doesn't exist yet — that's fine
      }

      // Write all queued lines
      while (this.writeQueue.length > 0) {
        const batch = this.writeQueue.splice(0, 50).join('');
        await fsMod.writeTextFile(this.logPath, batch, { append: true });
      }
    } catch {
      // Silently drop — don't let file logging break the app
      this.writeQueue.length = 0;
    } finally {
      this.flushing = false;
      // If new items arrived while flushing, flush again
      if (this.writeQueue.length > 0) {
        this.flushQueue();
      }
    }
  }
}

// Export singleton instance
export const logger = new LoggerService();
export default logger;
