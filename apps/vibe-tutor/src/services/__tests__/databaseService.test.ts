import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeworkItem } from '../../types';

// Shared fake SQLite connection + db used by all tests in this file.
const fakeDb = {
  open: vi.fn().mockResolvedValue(undefined),
  execute: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ values: [{ integrity_check: 'ok' }] }),
  run: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  commitTransaction: vi.fn().mockResolvedValue(undefined),
  rollbackTransaction: vi.fn().mockResolvedValue(undefined),
};

const fakeSqlite = {
  checkConnectionsConsistency: vi.fn().mockResolvedValue({ result: false }),
  isConnection: vi.fn().mockResolvedValue({ result: false }),
  retrieveConnection: vi.fn().mockResolvedValue(fakeDb),
  createConnection: vi.fn().mockResolvedValue(fakeDb),
  closeConnection: vi.fn().mockResolvedValue(undefined),
  initWebStore: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  // Returning an object from a constructor makes `new SQLiteConnection()` yield
  // our fake (arrow functions cannot be used as constructors).
  SQLiteConnection: class {
    constructor() {
      return fakeSqlite;
    }
  },
  SQLiteDBConnection: class {},
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
}));

vi.mock('../migrationService', () => ({
  migrationService: {
    restoreFromBackup: vi.fn().mockResolvedValue(undefined),
    resetForRecovery: vi.fn(),
  },
}));

vi.mock('../../utils/electronStore', () => ({
  appStore: { get: () => null, set: () => {}, delete: () => {}, remove: () => {} },
}));

const { DatabaseService } = await import('../databaseService');

describe('databaseService', () => {
  beforeEach(() => {
    Object.values(fakeDb).forEach((fn) => fn.mockClear());
    fakeDb.query.mockResolvedValue({ values: [{ integrity_check: 'ok' }] });
  });

  it('applies WAL + busy_timeout pragmas on init (concurrency/durability)', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    expect(fakeDb.execute).toHaveBeenCalledWith('PRAGMA journal_mode=WAL;');
    expect(fakeDb.execute).toHaveBeenCalledWith('PRAGMA busy_timeout=5000;');
  });

  it('runs the integrity check and creates the core tables', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    expect(fakeDb.query).toHaveBeenCalledWith('PRAGMA integrity_check;');
    expect(fakeDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS rewards'),
    );
    expect(fakeDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS homework_items'),
    );
  });

  it('saves and reads homework through the connection', async () => {
    const svc = new DatabaseService();
    await svc.initialize();

    const item: HomeworkItem = {
      id: 'h1',
      subject: 'Math',
      title: 'Fractions',
      dueDate: '2026-07-01',
      completed: false,
    };
    await svc.saveHomeworkItem(item);
    expect(fakeDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO homework_items'),
      expect.arrayContaining(['h1', 'Math', 'Fractions', '2026-07-01', 0]),
    );

    fakeDb.query.mockResolvedValueOnce({ values: [{ ...item, completed: false }] });
    const items = await svc.getHomeworkItems();
    expect(items).toHaveLength(1);
  });

  it('records a learning session', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    await svc.recordLearningSession({
      type: 'focus',
      duration: 25,
      focusScore: 80,
      tasksCompleted: 0,
    });
    expect(fakeDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO learning_sessions'),
      ['focus', 25, 80, 0],
    );
  });

  it('exposes the open connection and closes it', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    expect(svc.getConnection()).toBe(fakeDb);
    await svc.close();
    expect(fakeSqlite.closeConnection).toHaveBeenCalled();
    expect(svc.getConnection()).toBeNull();
  });

  it('runInTransaction commits the work on success', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    const work = vi.fn().mockResolvedValue(undefined);

    await svc.runInTransaction(work);

    expect(fakeDb.beginTransaction).toHaveBeenCalled();
    expect(work).toHaveBeenCalled();
    expect(fakeDb.commitTransaction).toHaveBeenCalled();
    expect(fakeDb.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('runInTransaction rolls back and rethrows on failure', async () => {
    const svc = new DatabaseService();
    await svc.initialize();

    await expect(
      svc.runInTransaction(async () => {
        throw new Error('mid-batch failure');
      }),
    ).rejects.toThrow('mid-batch failure');

    expect(fakeDb.rollbackTransaction).toHaveBeenCalled();
    expect(fakeDb.commitTransaction).not.toHaveBeenCalled();
  });

  it('self-heals on corruption: closes, restores backup, reopens, recreates tables', async () => {
    const { migrationService } = await import('../migrationService');
    // Integrity check reports corruption.
    fakeDb.query.mockResolvedValue({ values: [{ integrity_check: 'malformed database' }] });

    const svc = new DatabaseService();
    await expect(svc.initialize()).resolves.toBeUndefined();

    expect(fakeDb.close).toHaveBeenCalled();
    expect(fakeSqlite.closeConnection).toHaveBeenCalled();
    expect(vi.mocked(migrationService.restoreFromBackup)).toHaveBeenCalled();
    // Recovery must reset the migration flag so dataStore.initialize's next
    // performMigration() repopulates the empty SQLite from the restored backup.
    expect(vi.mocked(migrationService.resetForRecovery)).toHaveBeenCalled();
    // Tables recreated after the reopen — previously threw 'Database not connected'.
    expect(fakeDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS rewards'),
    );
    expect(svc.getConnection()).toBe(fakeDb);
  });
});
