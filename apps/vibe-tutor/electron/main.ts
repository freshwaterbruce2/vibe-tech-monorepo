/*
 * Electron Main Process (Vibe Tutor)
 *
 * Ingestion Bridge: Android JSON exports -> Hub DB (D:\databases\database.db)
 *
 * Critical constraint: Main process is the sole writer to database.db.
 */

import Database from 'better-sqlite3';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import Store from 'electron-store';
import { mkdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// better-sqlite3 is preferred for Electron (sync + fast transactions).
// NOTE: Requires dependency + rebuild for Electron.

const HUB_DB_PATH = String.raw`D:\databases\database.db`;

const DEV_SERVER_URL = 'http://localhost:5173';
function isDevMode(): boolean {
  return !app.isPackaged || process.env.NODE_ENV === 'development';
}

const ALLOWED_DEV_ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

function isAllowedRendererUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (isDevMode()) {
      return ALLOWED_DEV_ORIGINS.has(parsed.origin);
    }

    // In production we load local files.
    return parsed.protocol === 'file:';
  } catch {
    return false;
  }
}

function assertTrustedIpcSender(event: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const senderUrl: string | undefined = (event as any)?.senderFrame?.url;
  if (!senderUrl || !isAllowedRendererUrl(senderUrl)) {
    throw new Error('Blocked IPC from untrusted sender');
  }
}

type IngestExportArgs =
  | { filePath: string; jsonBlob?: never }
  | { jsonBlob: string; filePath?: never };

interface AndroidExportPayload {
  export_timestamp?: string;
  device_id?: string;
  events?: Array<{
    summary: string;
    tags?: string[];
    timestamp: number;
  }>;
}

interface IngestResult {
  inserted: number;
  skipped: number;
  total: number;
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value;
}

function ensureHubDbDirectoryExists(): void {
  const dir = path.dirname(HUB_DB_PATH);
  // Use sync here; this is startup/handler-level and keeps behavior deterministic.
  mkdirSync(dir, { recursive: true });
}

function openHubDb() {
  ensureHubDbDirectoryExists();

  const db = new Database(HUB_DB_PATH);

  console.info(`[hub-db] opened ${HUB_DB_PATH}`);

  // Pragmas: optimize for single-writer, many-readers, safe-ish performance.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  return db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureLearningEventsSchema(db: any): void {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_events'")
    .get();

  if (row) return;

  // Create minimal schema matching databases/migrations/002_learning_events.sql.
  // IMPORTANT: event_type is constrained; Android chat imports will be stored as event_type='insight'.
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL CHECK(event_type IN ('error', 'success', 'pattern', 'insight')),
      app_source TEXT NOT NULL CHECK(app_source IN ('nova', 'vibe')),
      source_file TEXT,
      source_function TEXT,
      project_id TEXT,
      session_id TEXT,
      timestamp INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      stack_trace TEXT,
      code_snippet TEXT,
      root_cause TEXT,
      solution TEXT,
      prevention_strategy TEXT,
      severity TEXT CHECK(severity IN ('info', 'warning', 'error', 'critical')),
      impact_score REAL DEFAULT 0.0,
      applies_to TEXT,
      confidence REAL DEFAULT 0.5,
      success_rate REAL DEFAULT 0.0,
      times_applied INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'archived')),
      resolved_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_learning_events_type
    ON learning_events(event_type, timestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_learning_events_project
    ON learning_events(project_id);

    CREATE INDEX IF NOT EXISTS idx_learning_events_status
    ON learning_events(status, severity);

    CREATE INDEX IF NOT EXISTS idx_learning_events_session
    ON learning_events(session_id, timestamp);

    CREATE INDEX IF NOT EXISTS idx_learning_events_app_source
    ON learning_events(app_source, event_type, timestamp DESC);

    CREATE TRIGGER IF NOT EXISTS trg_learning_events_updated_at
    AFTER UPDATE ON learning_events
    FOR EACH ROW
    BEGIN
      UPDATE learning_events
      SET updated_at = strftime('%s', 'now')
      WHERE id = NEW.id;
    END;
  `);
}

async function readExportPayload(args: IngestExportArgs): Promise<AndroidExportPayload> {
  if ('filePath' in args) {
    const filePath = assertString(args.filePath, 'filePath');

    if (!filePath.toLowerCase().endsWith('.json')) {
      throw new Error('Only .json export files are supported');
    }

    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  const jsonBlob = assertString(args.jsonBlob, 'jsonBlob');
  return JSON.parse(jsonBlob);
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0)
    .slice(0, 20);
}

function makeTitle(summary: string): string {
  const trimmed = summary.trim();
  if (trimmed.length <= 80) return trimmed;
  return `${trimmed.slice(0, 77)}...`;
}

interface NormalizedAndroidEvent {
  summary: string;
  timestamp: number;
  tags: string[];
  sessionId: string;
}

function normalizeAndroidExport(payload: AndroidExportPayload): NormalizedAndroidEvent[] {
  const rawEvents = Array.isArray(payload.events) ? payload.events : [];
  const deviceId = typeof payload.device_id === 'string' ? payload.device_id : 'android_01';

  const normalized: NormalizedAndroidEvent[] = [];
  for (const ev of rawEvents) {
    const summary = typeof ev?.summary === 'string' ? ev.summary.trim() : '';
    const timestamp = Number(ev?.timestamp);
    if (!summary || !Number.isFinite(timestamp)) continue;

    normalized.push({
      summary,
      timestamp,
      tags: normalizeTags(ev?.tags),
      sessionId: deviceId,
    });
  }

  return normalized;
}

function commitToDatabase(events: NormalizedAndroidEvent[]): IngestResult {
  if (!events || events.length === 0) {
    return { inserted: 0, skipped: 0, total: 0 };
  }

  const db = openHubDb();

  try {
    ensureLearningEventsSchema(db);

    // De-dupe strategy: (timestamp, description) uniqueness.
    const existsStmt = db.prepare(
      'SELECT id FROM learning_events WHERE timestamp = ? AND description = ? LIMIT 1',
    );

    const insertStmt = db.prepare(
      `INSERT INTO learning_events (
        event_type,
        app_source,
        source_file,
        source_function,
        project_id,
        session_id,
        timestamp,
        title,
        description,
        severity,
        applies_to,
        status
      ) VALUES (
        @event_type,
        @app_source,
        @source_file,
        @source_function,
        @project_id,
        @session_id,
        @timestamp,
        @title,
        @description,
        @severity,
        @applies_to,
        @status
      )`,
    );

    let inserted = 0;
    let skipped = 0;

    const tx = db.transaction(() => {
      for (const ev of events) {
        const already = existsStmt.get(ev.timestamp, ev.summary);
        if (already) {
          skipped++;
          continue;
        }

        // NOTE: learning_events.event_type is constrained.
        // We store chat exports as 'insight' and preserve chat semantics in tags/title.
        insertStmt.run({
          event_type: 'insight',
          app_source: 'vibe',
          source_file: null,
          source_function: 'vibe_tutor:ingest-export',
          project_id: 'vibe_tutor',
          session_id: ev.sessionId,
          timestamp: ev.timestamp,
          title: makeTitle(`Chat: ${ev.summary}`),
          description: ev.summary,
          severity: 'info',
          applies_to: JSON.stringify(ev.tags),
          status: 'active',
        });

        inserted++;
      }
    });

    tx();

    return { inserted, skipped, total: events.length };
  } finally {
    try {
      db.close();
    } catch {
      // ignore
    }
  }
}

async function ingestMemories(args: IngestExportArgs): Promise<IngestResult> {
  const payload = await readExportPayload(args);
  const events = normalizeAndroidExport(payload);
  return commitToDatabase(events);
}

function registerIpcHandlers(): void {
  ipcMain.handle('dialog:openFile', async (event) => {
    try {
      assertTrustedIpcSender(event);

      const result = await dialog.showOpenDialog({
        title: 'Import Android Export',
        properties: ['openFile'],
        filters: [{ name: 'JSON Exports', extensions: ['json'] }],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to open file picker: ${message}`);
    }
  });

  ipcMain.handle('ingest-export', async (_event, args: IngestExportArgs) => {
    try {
      assertTrustedIpcSender(_event);

      if (!args || typeof args !== 'object') {
        throw new Error('ingest-export requires args { filePath } or { jsonBlob }');
      }

      const result = await ingestMemories(args);
      console.log(`[ingest] Finished: ${result.inserted} inserted, ${result.skipped} skipped.`);
      return { ok: true, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, error: message };
    }
  });

  // Electron-store IPC handlers (synchronous)
  const store = new Store() as unknown as {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    delete: (key: string) => void;
    clear: () => void;
  };

  ipcMain.on('store:get', (event, key: string) => {
    try {
      assertTrustedIpcSender(event);
      event.returnValue = store.get(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Store] Failed to get key '${key}':`, message);
      event.returnValue = null;
    }
  });

  ipcMain.on('store:set', (event, key: string, value: unknown) => {
    try {
      assertTrustedIpcSender(event);
      store.set(key, value);
      event.returnValue = undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Store] Failed to set key '${key}':`, message);
    }
  });

  ipcMain.on('store:delete', (event, key: string) => {
    try {
      assertTrustedIpcSender(event);
      store.delete(key);
      event.returnValue = undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Store] Failed to delete key '${key}':`, message);
    }
  });

  ipcMain.on('store:clear', (event) => {
    try {
      assertTrustedIpcSender(event);
      store.clear();
      event.returnValue = undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Store] Failed to clear store:`, message);
    }
  });
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Your preload/IPC bridge should live here.
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  return win;
}

function registerWebContentsGuards(): void {
  app.on('web-contents-created', (_event, contents) => {
    // Prevent unexpected navigations (common attack vector).
    contents.on('will-navigate', (navEvent, navigationUrl) => {
      if (!isAllowedRendererUrl(navigationUrl)) {
        navEvent.preventDefault();
      }
    });

    // Prevent window.open / new-window popups.
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}

async function loadRenderer(win: BrowserWindow): Promise<void> {
  if (isDevMode()) {
    await win.loadURL(DEV_SERVER_URL);
    return;
  }

  await win.loadFile(path.join(__dirname, '../dist/index.html'));
}

void app.whenReady().then(() => {
  console.info(`[main] ready (devMode=${String(isDevMode())})`);
  registerWebContentsGuards();
  registerIpcHandlers();

  const win = createMainWindow();

  void loadRenderer(win);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
