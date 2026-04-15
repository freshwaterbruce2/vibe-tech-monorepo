import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { logger } from '../utils/logger';

export interface MusicTrackDB {
  id: string;
  name: string;
  artist?: string;
  downloadUrl: string;
  localPath?: string;
  metadata: string; // JSON
  fileSize?: number;
  lastPlayedAt?: number;
  createdAt: number;
}

class MusicDatabase {
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;
  private sqlite: SQLiteConnection;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    await this.sqlite.initWebStore();

    // Try to connect to unified D: DB (alias in-app)
    try {
      this.db = await this.sqlite.createConnection(
        'vibetutor_music',
        false,
        'no-encryption',
        1,
        false,
      );
      await this.db.open();

      // Create table
      await this.db?.execute(`
        CREATE TABLE IF NOT EXISTS music_tracks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          artist TEXT,
          downloadUrl TEXT UNIQUE NOT NULL,
          localPath TEXT,
          metadata TEXT,
          fileSize INTEGER,
          lastPlayedAt INTEGER,
          createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )
      `);

      // Indexes
      await this.db?.execute(
        'CREATE INDEX IF NOT EXISTS idx_downloadUrl ON music_tracks(downloadUrl)',
      );
      await this.db?.execute(
        'CREATE INDEX IF NOT EXISTS idx_lastPlayed ON music_tracks(lastPlayedAt)',
      );

    } catch (err) {
      logger.warn('[MusicDB] Fallback to in-app DB:', err);
      // Fallback: Create in-app DB
      this.db = await this.sqlite.createConnection('music_local', false, 'no-encryption', 1, false);
      await this.db?.open();
      // Recreate table
      await this.db?.execute(`
        CREATE TABLE IF NOT EXISTS music_tracks (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          artist TEXT,
          downloadUrl TEXT UNIQUE NOT NULL,
          localPath TEXT,
          metadata TEXT,
          fileSize INTEGER,
          lastPlayedAt INTEGER,
          createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
        )
      `);
    }

    this.isInitialized = true;
  }

  async saveTrack(track: MusicTrackDB): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not ready');

    await this.db.run(
      `
      INSERT OR REPLACE INTO music_tracks
      (id, name, artist, downloadUrl, localPath, metadata, fileSize, lastPlayedAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        track.id,
        track.name,
        track.artist,
        track.downloadUrl,
        track.localPath,
        JSON.stringify(track.metadata),
        track.fileSize,
        track.lastPlayedAt ? Math.floor(track.lastPlayedAt / 1000) : null,
        track.createdAt,
      ],
    );
  }

  async getAllTracks(): Promise<MusicTrackDB[]> {
    await this.init();
    if (!this.db) throw new Error('DB not ready');

    const result = await this.db.query('SELECT * FROM music_tracks ORDER BY createdAt DESC');
    interface MusicTrackRow {
      id: string;
      name: string;
      artist?: string;
      downloadUrl: string;
      localPath?: string;
      metadata?: string;
      fileSize?: number;
      lastPlayedAt?: number;
      createdAt: number;
    }
    return (result.values as MusicTrackRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      artist: row.artist,
      downloadUrl: row.downloadUrl,
      localPath: row.localPath,
      metadata: JSON.parse(row.metadata ?? '{}'),
      fileSize: row.fileSize,
      lastPlayedAt: row.lastPlayedAt ? row.lastPlayedAt * 1000 : undefined,
      createdAt: row.createdAt,
    })) as MusicTrackDB[];
  }

  async deleteTrack(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not ready');

    await this.db.run('DELETE FROM music_tracks WHERE id = ?', [id]);
  }

  async updateLastPlayed(id: string, timestamp: number): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('DB not ready');

    await this.db.run('UPDATE music_tracks SET lastPlayedAt = ? WHERE id = ?', [
      Math.floor(timestamp / 1000),
      id,
    ]);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export const musicDB = new MusicDatabase();
