/**
 * Database Service for Vibe Tutor
 * Manages SQLite database on D: drive for persistent data storage
 * Uses @capacitor-community/sqlite for cross-platform support
 */

import { logger } from '../utils/logger';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

import type { HomeworkItem, LearningSession } from '../types';
import { appStore } from '../utils/electronStore';

import { migrationService } from './migrationService';

export interface UserProgressRecord {
  id?: number;
  subject: string;
  session_date: string;
  correct_answers: number;
  total_attempts: number;
  time_spent?: number;
  difficulty_level?: string;
}

// Database path on D: drive for Windows (matches MCP server config)
// Platform-aware path: Use sandbox for mobile, D: for desktop dev
const DATABASE_NAME = 'vibe-tutor.db';
const DATABASE_VERSION = 1;

export class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isWeb: boolean;
  private initialized = false;
  private initializePromise: Promise<void> | null = null;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.isWeb = Capacitor.getPlatform() === 'web';
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = (async () => {
      try {
        // For web platform, we need to initialize jeep-sqlite
        if (this.isWeb) {
          await this.initWebPlatform();
        }

        // Check connection consistency
        const checkConsistency = await this.sqlite.checkConnectionsConsistency();
        const isConn = (await this.sqlite.isConnection(DATABASE_NAME, false)).result;

        if (checkConsistency.result && isConn) {
          this.db = await this.sqlite.retrieveConnection(DATABASE_NAME, false);
        } else {
          this.db = await this.sqlite.createConnection(
            DATABASE_NAME,
            false,
            'no-encryption',
            DATABASE_VERSION,
            false,
          );
        }

        await this.db.open();

        // --- SELF-HEALING INTEGRITY CHECK ---
        try {
          const integrity = await this.db.query('PRAGMA integrity_check;');
          const status = integrity.values?.[0]?.['integrity_check'];

          if (status !== 'ok') {
            logger.error('[Database] CORRUPTION DETECTED:', status);
            throw new Error('Database integrity check failed');
          }
        } catch (e) {
          logger.warn('[Database] Corruption detected or check failed. Initiating restore...', e);
          // Close and delete corrupt DB
          await this.db.close();
          await this.sqlite.closeConnection(DATABASE_NAME, false);
          // Note: CapacitorSQLite deleteConnection might be needed here, or file deletion

          // Restore from migration backup
          await migrationService.restoreFromBackup();

          // Re-open (migration/restore puts data in appStore/localStorage, migrationService.performMigration will re-populate DB)
          // For now, we assume restoreFromBackup fixes the source of truth (localStorage)
          // and we might need to re-run migration or clear DB tables.
          // Simple approach: Throwing here might crash app loop.
          // Better: Allow performMigration to run next.
        }

        await this.createTables();

        this.initialized = true;
      } catch (error) {
        this.initialized = false;
        logger.error('Failed to initialize database:', error);
        // Last resort: Restore backup if init completely fails
        try {
          await migrationService.restoreFromBackup();
        } catch (restoreErr) {
          logger.error('Fatal: Restore failed', restoreErr);
        }
        throw error;
      }
    })().finally(() => {
      this.initializePromise = null;
    });

    return this.initializePromise;
  }

  /**
   * Initialize jeep-sqlite for web platform
   */
  private async initWebPlatform(): Promise<void> {
    const jeepEl = document.createElement('jeep-sqlite');
    document.body.appendChild(jeepEl);
    await customElements.whenDefined('jeep-sqlite');
    await this.sqlite.initWebStore();
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const schemas = [
      // Homework items table
      `CREATE TABLE IF NOT EXISTS homework_items (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        title TEXT NOT NULL,
        due_date TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // User progress table
      `CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        difficulty_level TEXT,
        stars_earned INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        total_attempts INTEGER DEFAULT 0,
        session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Achievements table
      `CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        unlocked INTEGER DEFAULT 0,
        progress INTEGER DEFAULT 0,
        progress_goal INTEGER,
        points_awarded INTEGER DEFAULT 0,
        unlocked_at TIMESTAMP
      )`,

      // Learning sessions table
      `CREATE TABLE IF NOT EXISTS learning_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_type TEXT NOT NULL,
        duration_minutes INTEGER,
        focus_score INTEGER,
        tasks_completed INTEGER,
        session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Rewards table
      `CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        points_required INTEGER NOT NULL,
        description TEXT,
        claimed INTEGER DEFAULT 0,
        claimed_at TIMESTAMP
      )`,

      // Music playlists table
      `CREATE TABLE IF NOT EXISTS music_playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tracks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    ];

    for (const schema of schemas) {
      await this.db.execute(schema);
    }

    // Create indexes for frequently-queried columns (performance optimization)
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_homework_subject ON homework_items(subject)`,
      `CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework_items(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_homework_completed ON homework_items(completed)`,
      `CREATE INDEX IF NOT EXISTS idx_progress_subject ON user_progress(subject)`,
      `CREATE INDEX IF NOT EXISTS idx_progress_date ON user_progress(session_date)`,
      `CREATE INDEX IF NOT EXISTS idx_achievements_unlocked ON achievements(unlocked)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_type ON learning_sessions(session_type)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_date ON learning_sessions(session_date)`,
    ];

    for (const index of indexes) {
      await this.db.execute(index);
    }
  }

  /**
   * Get database connection
   */
  getConnection(): SQLiteDBConnection | null {
    return this.db;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.sqlite.closeConnection(DATABASE_NAME, false);
      this.db = null;
    }
  }

  // CRUD Operations for Homework Items
  async saveHomeworkItem(item: HomeworkItem): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const query = `
      INSERT OR REPLACE INTO homework_items
      (id, subject, title, due_date, completed)
      VALUES (?, ?, ?, ?, ?)
    `;

    await this.db.run(query, [
      item.id,
      item.subject,
      item.title,
      item.dueDate,
      item.completed ? 1 : 0,
    ]);
  }

  async getHomeworkItems(): Promise<HomeworkItem[]> {
    if (!this.db) throw new Error('Database not connected');

    const result = await this.db.query(`
      SELECT id, subject, title, due_date as dueDate,
             CASE WHEN completed = 1 THEN true ELSE false END as completed
      FROM homework_items
      ORDER BY due_date ASC
    `);

    return (result.values as HomeworkItem[]) ?? [];
  }

  // Learning Analytics Operations
  async recordLearningSession(session: LearningSession): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const query = `
      INSERT INTO learning_sessions
      (session_type, duration_minutes, focus_score, tasks_completed)
      VALUES (?, ?, ?, ?)
    `;

    await this.db.run(query, [
      session.type,
      session.duration,
      session.focusScore,
      session.tasksCompleted,
    ]);
  }

  async getUserProgress(subject?: string): Promise<UserProgressRecord[]> {
    if (!this.db) throw new Error('Database not connected');

    // Use parameterized queries to prevent SQL injection
    if (subject) {
      const query = `SELECT * FROM user_progress WHERE subject = ? ORDER BY session_date DESC`;
      const result = await this.db.query(query, [subject]);
      return (result.values ?? []) as UserProgressRecord[];
    }

    const query = `SELECT * FROM user_progress ORDER BY session_date DESC`;
    const result = await this.db.query(query);
    return (result.values ?? []) as UserProgressRecord[];
  }

  // Achievement Operations
  async updateAchievement(id: string, unlocked: boolean, progress: number): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const query = `
      UPDATE achievements
      SET unlocked = ?, progress = ?, unlocked_at = ?
      WHERE id = ?
    `;

    await this.db.run(query, [
      unlocked ? 1 : 0,
      progress,
      unlocked ? new Date().toISOString() : null,
      id,
    ]);
  }

  // Migration from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    try {
      // Migrate homework items
      const homeworkData = appStore.get('homeworkItems');
      if (homeworkData) {
        const items = JSON.parse(homeworkData);
        for (const item of items) {
          await this.saveHomeworkItem(item);
        }
      }

      // Migrate other data...
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
