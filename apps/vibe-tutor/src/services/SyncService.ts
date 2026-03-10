/**
 * Sync Service (Android)
 * Offline-first local memory logging + export for Windows hub ingestion.
 *
 * - Persists events to local SQLite (device sandbox)
 * - Exports unsynced rows to a JSON file in device storage
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { CapacitorSQLite, SQLiteConnection, type SQLiteDBConnection } from '@capacitor-community/sqlite';

export interface LocalMemoryEvent {
  id: string;
  summary: string;
  tags: string[];
  timestamp: number;
  synced_to_hub: number;
}

export interface SyncExportPayload {
  export_timestamp: string;
  device_id: string;
  events: Array<{
    id: string;
    summary: string;
    tags: string[];
    timestamp: number;
  }>;
}

export interface ExportForHubResult {
  exportedCount: number;
  directory: Directory;
  relativePath: string;
  uri?: string;
}

const DB_NAME = 'vibe_tutor_sync.db';
const DB_VERSION = 1;

const TABLE_LOCAL_MEMORIES = 'local_memories';

function getDeviceId(): string {
  // Keep this stable and user-configurable.
  // Optional override via global config: window.__DEVICE_ID__.
  const configured = (globalThis as unknown as { __DEVICE_ID__?: string }).__DEVICE_ID__;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }

  return 'android_01';
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class SyncService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private initialized = false;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
      throw new Error('SyncService requires a native runtime (Android).');
    }

    try {
      const checkConsistency = await this.sqlite.checkConnectionsConsistency();
      const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

      if (checkConsistency.result && isConn) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        this.db = await this.sqlite.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          DB_VERSION,
          false
        );
      }

      await this.db.open();

      // Pragmas for better reliability on mobile.
      // WAL is generally safe and improves concurrent reads.
      await this.db.execute('PRAGMA journal_mode=WAL;');
      await this.db.execute('PRAGMA busy_timeout=5000;');

      await this.createTables();
      this.initialized = true;
    } catch (error) {
      console.error('SyncService initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    await this.db.execute(
      `CREATE TABLE IF NOT EXISTS ${TABLE_LOCAL_MEMORIES} (
        id TEXT PRIMARY KEY,
        summary TEXT NOT NULL,
        tags TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        synced_to_hub INTEGER NOT NULL DEFAULT 0
      );`
    );

    await this.db.execute(
      `CREATE INDEX IF NOT EXISTS idx_${TABLE_LOCAL_MEMORIES}_synced_timestamp
       ON ${TABLE_LOCAL_MEMORIES}(synced_to_hub, timestamp DESC);`
    );
  }

  /**
   * Log a memory/event locally for later export.
   */
  async logEvent(summary: string, tags: string[]): Promise<LocalMemoryEvent> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not connected');

    const normalizedSummary = (summary || '').trim();
    if (!normalizedSummary) {
      throw new Error('logEvent(summary, tags) requires a non-empty summary');
    }

    const event: LocalMemoryEvent = {
      id: generateId('mem'),
      summary: normalizedSummary,
      tags: Array.isArray(tags) ? tags.map(t => String(t)).filter(Boolean) : [],
      timestamp: Date.now(),
      synced_to_hub: 0,
    };

    try {
      await this.db.run(
        `INSERT INTO ${TABLE_LOCAL_MEMORIES} (id, summary, tags, timestamp, synced_to_hub)
         VALUES (?, ?, ?, ?, ?);`,
        [event.id, event.summary, JSON.stringify(event.tags), event.timestamp, event.synced_to_hub]
      );

      return event;
    } catch (error) {
      console.error('Failed to log event:', error);
      throw error;
    }
  }

  /**
   * Export unsynced memories/events to a JSON file for Windows hub pickup.
   *
   * Marks exported rows as pending-ack (synced_to_hub = 1) after a successful write.
   */
  async exportForHub(): Promise<ExportForHubResult> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database not connected');

    try {
      const queryResult = await this.db.query(
        `SELECT id, summary, tags, timestamp, synced_to_hub
         FROM ${TABLE_LOCAL_MEMORIES}
         WHERE synced_to_hub = 0
         ORDER BY timestamp ASC;`
      );

      interface LocalMemoryRow {
        id: string | number;
        summary: string;
        tags: string | string[];
        timestamp: number;
        synced_to_hub: number;
      }
      const rows = (queryResult.values ?? []) as LocalMemoryRow[];
      if (rows.length === 0) {
        // Still produce a file? Usually not necessary.
        throw new Error('No unsynced events to export');
      }

      const payload: SyncExportPayload = {
        export_timestamp: new Date().toISOString(),
        device_id: getDeviceId(),
        events: rows.map(r => {
          let parsedTags: string[] = [];
          try {
            const raw = typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags;
            if (Array.isArray(raw)) parsedTags = raw.map(t => String(t));
          } catch {
            parsedTags = [];
          }

          return {
            id: String(r.id),
            summary: String(r.summary),
            tags: parsedTags,
            timestamp: Number(r.timestamp) || Date.now(),
          };
        }),
      };

      const json = JSON.stringify(payload, null, 2);

      // Try ExternalStorage first for easiest USB/network pickup.
      const fileName = `vibe_tutor_export_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      const relativePath = `VibeTutor/exports/${fileName}`;

      const { directory, uri } = await this.writeExportFile(relativePath, json);

      // Mark exported rows as pending-ack.
      const ids = rows.map(r => String(r.id));
      await this.markExported(ids);

      return {
        exportedCount: rows.length,
        directory,
        relativePath,
        uri,
      };
    } catch (error) {
      console.error('Export for hub failed:', error);
      throw error;
    }
  }

  private async writeExportFile(relativePath: string, contents: string): Promise<{ directory: Directory; uri?: string }> {
    // Request permissions first (Android may require this for external locations).
    try {
      await Filesystem.requestPermissions();
    } catch (error) {
      console.warn('Filesystem permission request failed or not supported:', error);
    }

    const directoryCandidates: Directory[] = [Directory.ExternalStorage, Directory.Documents];
    let lastError: unknown;

    for (const directory of directoryCandidates) {
      try {
        // Ensure parent folders exist.
        const dirPath = relativePath.split('/').slice(0, -1).join('/');
        if (dirPath) {
          await Filesystem.mkdir({ directory, path: dirPath, recursive: true });
        }

        await Filesystem.writeFile({
          directory,
          path: relativePath,
          data: contents,
          encoding: Encoding.UTF8,
        });

        try {
          const fileUri = await Filesystem.getUri({ directory, path: relativePath });
          return { directory, uri: fileUri?.uri };
        } catch {
          return { directory };
        }
      } catch (error) {
        lastError = error;
        // Continue to fallback directory.
      }
    }

    // If we got here, all candidates failed.
    const message =
      lastError instanceof Error
        ? lastError.message
        : 'Unknown error writing export file';

    throw new Error(`Failed to write export file. ${message}`);
  }

  private async markExported(ids: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    if (ids.length === 0) return;

    // Use parameterized placeholders.
    const placeholders = ids.map(() => '?').join(', ');
    const sql = `UPDATE ${TABLE_LOCAL_MEMORIES} SET synced_to_hub = 1 WHERE id IN (${placeholders});`;

    try {
      await this.db.run(sql, ids);
    } catch (error) {
      console.error('Failed to mark exported rows:', error);
      throw error;
    }
  }
}

export const syncService = new SyncService();
