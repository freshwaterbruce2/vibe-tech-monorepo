/**
 * Database Service for Vibe Tutor
 * Manages app-local SQLite storage through Capacitor on supported platforms.
 */

import { logger } from '../utils/logger';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

import type { FocusSession, HomeworkItem, LearningSession } from '../types';
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

// The Capacitor SQLite plugin selects the app-local storage location.
const DATABASE_NAME = 'vibe-tutor.db';
const DATABASE_VERSION = 1;
const HOMEWORK_ID = /^[\x21-\x7e]{1,160}$/;
const HOMEWORK_TEXT = /^(?=.*\S)[\x20-\x7e]{1,500}$/;
const FOCUS_ID = /^[\x21-\x7e]{1,160}$/;

function assertFocus(session: FocusSession): void {
  if (
    typeof session.id !== 'string' ||
    !FOCUS_ID.test(session.id) ||
    !Number.isSafeInteger(session.startTime) ||
    session.startTime < 0 ||
    session.endTime === undefined ||
    !Number.isSafeInteger(session.endTime) ||
    session.endTime < session.startTime ||
    !Number.isSafeInteger(session.duration) ||
    session.duration <= 0 ||
    session.completed !== true ||
    (session.points !== undefined && (!Number.isSafeInteger(session.points) || session.points < 0))
  )
    throw new Error('Focus session is malformed');
}

function assertHomework(item: HomeworkItem): void {
  const parts =
    typeof item.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)
      ? item.dueDate.split('-').map(Number)
      : null;
  const [year, month, day] = parts ?? [];
  const leap = year !== undefined && year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (
    typeof item.id !== 'string' ||
    typeof item.subject !== 'string' ||
    typeof item.title !== 'string' ||
    typeof item.dueDate !== 'string' ||
    !HOMEWORK_ID.test(item.id) ||
    !HOMEWORK_TEXT.test(item.subject) ||
    !HOMEWORK_TEXT.test(item.title) ||
    !year ||
    year < 1 ||
    year > 9999 ||
    !month ||
    month < 1 ||
    month > 12 ||
    !day ||
    day < 1 ||
    day > days[month - 1]! ||
    typeof item.completed !== 'boolean' ||
    (item.completedDate !== undefined &&
      (!Number.isSafeInteger(item.completedDate) || item.completedDate < 0 || !item.completed))
  )
    throw new Error('Homework item is malformed');
}

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

        // Open (or retrieve) the connection with WAL + busy-timeout pragmas.
        await this.openConnection();
        const db = this.db;
        if (!db) throw new Error('Database connection failed to open');

        // --- SELF-HEALING INTEGRITY CHECK ---
        try {
          const integrity = await db.query('PRAGMA integrity_check;');
          const status = integrity.values?.[0]?.['integrity_check'];

          if (status !== 'ok') {
            logger.error('[Database] CORRUPTION DETECTED:', status);
            throw new Error('Database integrity check failed');
          }
        } catch (e) {
          logger.warn('[Database] Corruption detected or check failed. Initiating restore...', e);
          // Close the corrupt connection without obscuring the integrity error.
          await this.closeUnusableConnection(db);

          // Restore the source-of-truth (localStorage) from the migration backup.
          await migrationService.restoreFromBackup();

          // The restored data now lives in localStorage while the recreated
          // SQLite is empty. Force the next performMigration() (run by
          // dataStore.initialize right after this) to repopulate SQLite, or the
          // restored data is stranded and the app reads an empty database.
          migrationService.resetForRecovery();

          // Reopen a fresh connection BEFORE recreating tables. The previous
          // code called createTables() on the closed/null handle, so recovery
          // could never complete (it threw 'Database not connected').
          await this.openConnection();
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
   * Create-or-retrieve the SQLite connection and verify its nontransactional
   * WAL + busy-timeout configuration. Both initial and recovery opens use this
   * exact path so a returned connection is known durable before use.
   */
  private async openConnection(): Promise<void> {
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

    const db = this.db;
    if (!db) throw new Error('Database connection failed to open');
    try {
      await db.open();
      await this.configureDurabilityPragmas(db);
    } catch (error) {
      await this.closeUnusableConnection(db);
      throw error;
    }
  }

  private parseBusyTimeoutMs(row: Record<string, unknown> | undefined): number {
    const raw =
      row?.['timeout'] ??
      row?.['busy_timeout'] ??
      (row ? Object.values(row)[0] : undefined);
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw);
    return Number.NaN;
  }

  private async configureDurabilityPragmas(db: SQLiteDBConnection): Promise<void> {
    // Android SQLiteDatabase rejects PRAGMA via execSQL/execute when it returns rows.
    // Keep journal_mode on query (rawQuery). For busy_timeout: non-transactional execute
    // applies the setter on Capacitor/SQLCipher; also run the assignment via query so
    // platforms that only accept PRAGMA setters through rawQuery still apply it, and so
    // we can use the assignment result if a later readback column shape differs.
    await db.query('PRAGMA journal_mode=WAL;');

    let busyTimeoutAssignRow: Record<string, unknown> | undefined;
    try {
      await db.execute('PRAGMA busy_timeout=5000;', false);
    } catch {
      // execSQL rejects some returning PRAGMAs — assignment query below is the fallback.
    }
    const busyTimeoutAssignResult = await db.query('PRAGMA busy_timeout=5000;');
    busyTimeoutAssignRow = busyTimeoutAssignResult.values?.[0] as
      | Record<string, unknown>
      | undefined;

    const journalModeResult = await db.query('PRAGMA journal_mode;');
    const journalMode = journalModeResult.values?.[0]?.['journal_mode'];
    if (typeof journalMode !== 'string' || journalMode.toLowerCase() !== 'wal') {
      throw new Error('SQLite journal_mode readback was not WAL');
    }

    const busyTimeoutResult = await db.query('PRAGMA busy_timeout;');
    // SQLite names this result column "timeout" (pragma.h COLS); wrappers may use
    // "busy_timeout" or an unnamed first cell. Fall back to the assignment query row.
    let parsedBusyTimeout = this.parseBusyTimeoutMs(
      busyTimeoutResult.values?.[0] as Record<string, unknown> | undefined,
    );
    if (!Number.isFinite(parsedBusyTimeout) || parsedBusyTimeout < 5000) {
      parsedBusyTimeout = this.parseBusyTimeoutMs(busyTimeoutAssignRow);
    }
    if (!Number.isFinite(parsedBusyTimeout) || parsedBusyTimeout < 5000) {
      throw new Error('SQLite busy_timeout readback was below 5000ms');
    }
  }

  private async closeUnusableConnection(db: SQLiteDBConnection | null): Promise<void> {
    try {
      await db?.close();
    } catch (closeError) {
      logger.warn('[Database] Failed to close unusable connection:', closeError);
    }
    try {
      await this.sqlite.closeConnection(DATABASE_NAME, false);
    } catch (closeConnectionError) {
      logger.warn('[Database] Failed to release unusable connection:', closeConnectionError);
    } finally {
      if (this.db === db) this.db = null;
    }
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
        completed_date INTEGER,
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
        external_id TEXT UNIQUE,
        started_at INTEGER,
        ended_at INTEGER,
        session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Rewards table. NOTE: `claimed`/`claimed_at` are legacy columns that are
      // NOT read by the app — the pending-claim queue lives in user_settings
      // under 'claimedRewards' (a reward can be claimed while still in the
      // catalog). Kept write-only for backward-compat; do not rely on them.
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
    await this.ensureColumn('homework_items', 'completed_date', 'INTEGER');
    await this.ensureColumn('learning_sessions', 'external_id', 'TEXT');
    await this.ensureColumn('learning_sessions', 'started_at', 'INTEGER');
    await this.ensureColumn('learning_sessions', 'ended_at', 'INTEGER');
    await this.db.execute(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_sessions_external_id ON learning_sessions(external_id)',
      false,
    );

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

  private async ensureColumn(
    table: 'homework_items' | 'learning_sessions',
    column: string,
    type: string,
  ) {
    if (!this.db) throw new Error('Database not connected');
    const result = await this.db.query(`PRAGMA table_info(${table})`);
    if ((result.values ?? []).some((row) => row.name === column)) return;
    await this.db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`, false);
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

  /**
   * Run a unit of work inside a single SQLite transaction, committing on
   * success and rolling back on any error, so batched writes apply atomically.
   */
  async runInTransaction(work: () => Promise<void>): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    await this.db.beginTransaction();
    try {
      await work();
      await this.db.commitTransaction();
    } catch (error) {
      try {
        await this.db.rollbackTransaction();
      } catch (rollbackError) {
        logger.error('[Database] Transaction rollback failed:', rollbackError);
      }
      throw error;
    }
  }

  // CRUD Operations for Homework Items
  async saveHomeworkItem(item: HomeworkItem, transaction = true): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    assertHomework(item);

    const query = `
      INSERT INTO homework_items (id, subject, title, due_date, completed, completed_date)
      SELECT ?, ?, ?, ?, ?, ?
      WHERE EXISTS (SELECT 1 FROM homework_items WHERE id = ?)
         OR (SELECT COUNT(*) FROM homework_items) < ?
      ON CONFLICT(id) DO UPDATE SET
        subject = excluded.subject, title = excluded.title, due_date = excluded.due_date,
        completed = excluded.completed, completed_date = excluded.completed_date
    `;

    const result = await this.db.run(
      query,
      [
        item.id,
        item.subject,
        item.title,
        item.dueDate,
        item.completed ? 1 : 0,
        item.completedDate ?? null,
        item.id,
        500,
      ],
      transaction,
    );
    if (result.changes?.changes !== 1) throw new Error('Homework write was not verified or exceeded the safe limit');
  }

  async getHomeworkItems(): Promise<HomeworkItem[]> {
    if (!this.db) throw new Error('Database not connected');

    const result = await this.db.query(`
      SELECT id, subject, title, due_date as dueDate, completed,
             completed_date as completedDate
      FROM homework_items
      ORDER BY due_date ASC
    `);

    if (result.values !== undefined && !Array.isArray(result.values))
      throw new Error('Stored homework rows are malformed');
    const rows = result.values ?? [];
    if (rows.length > 500) throw new Error('Stored homework rows are malformed');
    const ids = new Set<string>();
    return rows.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row))
        throw new Error('Stored homework rows are malformed');
      const completedDate = row.completedDate;
      if (
        row.completed !== 0 &&
        row.completed !== 1 &&
        row.completed !== true &&
        row.completed !== false
      )
        throw new Error('Stored homework completion is malformed');
      if (
        completedDate !== null &&
        completedDate !== undefined &&
        !Number.isSafeInteger(completedDate)
      ) {
        throw new Error('Stored homework completion date is malformed');
      }
      const { completedDate: _ignoredCompletedDate, ...base } = row;
      const item = {
        ...base,
        completed: row.completed === true || row.completed === 1,
        ...(completedDate === null || completedDate === undefined ? {} : { completedDate }),
      } as HomeworkItem;
      if (ids.has(item.id)) throw new Error('Stored homework rows are malformed');
      ids.add(item.id);
      assertHomework(item);
      return item;
    });
  }

  // Learning Analytics Operations
  async recordLearningSession(session: LearningSession): Promise<number> {
    if (!this.db) throw new Error('Database not connected');

    const query = `
      INSERT INTO learning_sessions
      (session_type, duration_minutes, focus_score, tasks_completed)
      VALUES (?, ?, ?, ?)
    `;

    const result = await this.db.run(query, [
      session.type,
      session.duration,
      session.focusScore,
      session.tasksCompleted,
    ]);
    const lastId = result.changes?.lastId;
    if (typeof lastId !== 'number' || !Number.isSafeInteger(lastId) || lastId <= 0) {
      throw new Error('Learning session insert did not return a verified positive lastId');
    }
    return lastId;
  }

  async saveFocusSession(session: FocusSession): Promise<FocusSession> {
    if (!this.db) throw new Error('Database not connected');
    assertFocus(session);
    const result = await this.db.run(
      `INSERT INTO learning_sessions
       (session_type, duration_minutes, focus_score, tasks_completed, external_id, started_at, ended_at)
       SELECT ?, ?, ?, ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM learning_sessions
         WHERE external_id = ? AND session_type = 'focus'
       ) OR (
         (SELECT COUNT(*) FROM learning_sessions WHERE session_type = 'focus') < ?
         AND NOT EXISTS (SELECT 1 FROM learning_sessions WHERE external_id = ?)
       )
       ON CONFLICT(external_id) DO UPDATE SET
         duration_minutes = excluded.duration_minutes,
         focus_score = excluded.focus_score,
         started_at = excluded.started_at,
         ended_at = excluded.ended_at
       WHERE learning_sessions.session_type = 'focus'`,
      [
        'focus',
        session.duration,
        session.points ?? 0,
        0,
        session.id,
        session.startTime,
        session.endTime,
        session.id,
        500,
        session.id,
      ],
    );
    if (result.changes?.changes !== 1)
      throw new Error('Focus write was not verified or exceeded the safe limit');
    return { ...session };
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
