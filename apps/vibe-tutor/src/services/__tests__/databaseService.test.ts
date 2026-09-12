import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeworkItem } from '../../types';

// Shared fake SQLite connection + db used by all tests in this file.
const fakeDb = {
  open: vi.fn().mockResolvedValue(undefined),
  execute: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({ values: [{ integrity_check: 'ok' }] }),
  run: vi.fn().mockResolvedValue({ changes: { changes: 1, lastId: 1 } }),
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

function setVerifiedPragmaReadbacks(integrityStatus = 'ok') {
  fakeDb.query.mockImplementation(async (statement: string) => {
    if (statement === 'PRAGMA journal_mode;') return { values: [{ journal_mode: 'wal' }] };
    if (statement === 'PRAGMA busy_timeout;') return { values: [{ busy_timeout: '5000' }] };
    if (statement === 'PRAGMA integrity_check;')
      return { values: [{ integrity_check: integrityStatus }] };
    return { values: [] };
  });
}

function setSchemaColumns(homework: string[], sessions: string[]) {
  fakeDb.query.mockImplementation(async (statement: string) => {
    if (statement === 'PRAGMA journal_mode;') return { values: [{ journal_mode: 'wal' }] };
    if (statement === 'PRAGMA busy_timeout;') return { values: [{ busy_timeout: '5000' }] };
    if (statement === 'PRAGMA integrity_check;') return { values: [{ integrity_check: 'ok' }] };
    if (statement === 'PRAGMA table_info(homework_items)')
      return { values: homework.map((name) => ({ name })) };
    if (statement === 'PRAGMA table_info(learning_sessions)')
      return { values: sessions.map((name) => ({ name })) };
    return { values: [] };
  });
}

describe('databaseService', () => {
  beforeEach(() => {
    Object.values(fakeDb).forEach((fn) => fn.mockClear());
    setVerifiedPragmaReadbacks();
    fakeDb.run.mockResolvedValue({ changes: { changes: 1, lastId: 1 } });
  });

  it('sets and verifies nontransactional WAL + busy_timeout before the integrity check', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    expect(fakeDb.execute).toHaveBeenNthCalledWith(1, 'PRAGMA journal_mode=WAL;', false);
    expect(fakeDb.execute).toHaveBeenNthCalledWith(2, 'PRAGMA busy_timeout=5000;', false);
    expect(fakeDb.query).toHaveBeenNthCalledWith(1, 'PRAGMA journal_mode;');
    expect(fakeDb.query).toHaveBeenNthCalledWith(2, 'PRAGMA busy_timeout;');
    expect(fakeDb.query).toHaveBeenNthCalledWith(3, 'PRAGMA integrity_check;');
  });

  it('fails closed and releases the connection when nontransactional PRAGMA execution fails', async () => {
    fakeDb.execute.mockRejectedValueOnce(
      new Error('cannot change into wal mode from within a transaction'),
    );
    const svc = new DatabaseService();

    await expect(svc.initialize()).rejects.toThrow('cannot change into wal mode');
    expect(fakeDb.close).toHaveBeenCalled();
    expect(fakeSqlite.closeConnection).toHaveBeenCalledWith('vibe-tutor.db', false);
    expect(svc.getConnection()).toBeNull();
  });

  it('fails closed when PRAGMA readback fails', async () => {
    fakeDb.query.mockRejectedValueOnce(new Error('readback unavailable'));
    const svc = new DatabaseService();

    await expect(svc.initialize()).rejects.toThrow('readback unavailable');
    expect(svc.getConnection()).toBeNull();
  });

  it('fails closed when journal_mode readback is not WAL', async () => {
    fakeDb.query.mockResolvedValueOnce({ values: [{ journal_mode: 'delete' }] });
    const svc = new DatabaseService();

    await expect(svc.initialize()).rejects.toThrow('journal_mode readback was not WAL');
    expect(svc.getConnection()).toBeNull();
  });

  it('fails closed when busy_timeout readback is below the durable minimum', async () => {
    fakeDb.query
      .mockResolvedValueOnce({ values: [{ journal_mode: 'WAL' }] })
      .mockResolvedValueOnce({ values: [{ busy_timeout: 4999 }] });
    const svc = new DatabaseService();

    await expect(svc.initialize()).rejects.toThrow('busy_timeout readback was below 5000ms');
    expect(svc.getConnection()).toBeNull();
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
    const [statement, parameters, transaction] = fakeDb.run.mock.calls.at(-1)!;
    expect(statement).toContain('INSERT INTO homework_items');
    expect(statement).toContain('WHERE EXISTS (SELECT 1 FROM homework_items WHERE id = ?)');
    expect(statement).toContain('(SELECT COUNT(*) FROM homework_items) < ?');
    expect(statement).toContain('ON CONFLICT(id) DO UPDATE');
    expect(parameters).toEqual(['h1', 'Math', 'Fractions', '2026-07-01', 0, null, 'h1', 500]);
    expect(transaction).toBe(true);

    fakeDb.query.mockResolvedValueOnce({ values: [{ ...item, completed: false }] });
    const items = await svc.getHomeworkItems();
    expect(items).toHaveLength(1);
  });

  it('binds an exact completedDate and clears it to NULL when uncompleted', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    await svc.saveHomeworkItem({
      id: 'h-date',
      subject: 'Math',
      title: 'A',
      dueDate: '2026-07-01',
      completed: true,
      completedDate: 1234,
    });
    expect(fakeDb.run).toHaveBeenLastCalledWith(
      expect.stringContaining('completed_date'),
      expect.arrayContaining([1234]),
      true,
    );
    await svc.saveHomeworkItem({
      id: 'h-date',
      subject: 'Math',
      title: 'A',
      dueDate: '2026-07-01',
      completed: false,
    });
    expect(fakeDb.run).toHaveBeenLastCalledWith(
      expect.stringContaining('completed_date'),
      expect.arrayContaining([null]),
      true,
    );
  });

  it('retains legacy completed rows without inventing a date and rejects malformed dates', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.query.mockResolvedValueOnce({
      values: [
        {
          id: 'legacy',
          subject: 'Math',
          title: 'A',
          dueDate: '2026-07-01',
          completed: true,
          completedDate: null,
        },
      ],
    });
    const [legacy] = await svc.getHomeworkItems();
    expect(legacy).toEqual(expect.objectContaining({ completed: true }));
    expect(legacy).not.toHaveProperty('completedDate');
    fakeDb.query.mockResolvedValueOnce({
      values: [
        {
          id: 'bad',
          subject: 'Math',
          title: 'A',
          dueDate: '2026-07-01',
          completed: true,
          completedDate: 'today',
        },
      ],
    });
    await expect(svc.getHomeworkItems()).rejects.toThrow('completion date is malformed');
  });

  it('records a learning session and returns its verified SQLite row id', async () => {
    fakeDb.run.mockResolvedValueOnce({ changes: { lastId: 42 } });
    const svc = new DatabaseService();
    await svc.initialize();
    await expect(
      svc.recordLearningSession({
        type: 'focus',
        duration: 25,
        focusScore: 80,
        tasksCompleted: 0,
      }),
    ).resolves.toBe(42);
    expect(fakeDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO learning_sessions'),
      ['focus', 25, 80, 0],
    );
  });

  it('atomically admits an existing Focus identity at the cap without replacing its row or preflight', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.query.mockClear();
    const session = {
      id: 'session_7',
      startTime: 1000,
      endTime: 1501000,
      duration: 25,
      completed: true,
      points: 4,
    };
    await expect(svc.saveFocusSession(session)).resolves.toEqual(session);
    const [statement, parameters] = fakeDb.run.mock.calls.at(-1)!;
    expect(statement).toContain('SELECT ?, ?, ?, ?, ?, ?, ?');
    expect(statement).toContain("external_id = ? AND session_type = 'focus'");
    expect(statement).toContain("COUNT(*) FROM learning_sessions WHERE session_type = 'focus') < ?");
    expect(statement).toContain('NOT EXISTS (SELECT 1 FROM learning_sessions WHERE external_id = ?)');
    expect(statement).toContain('ON CONFLICT(external_id) DO UPDATE');
    expect(statement).toContain("WHERE learning_sessions.session_type = 'focus'");
    expect(parameters).toEqual(['focus', 25, 4, 0, 'session_7', 1000, 1501000, 'session_7', 500, 'session_7']);
    expect(statement).not.toContain('REPLACE');
    expect(fakeDb.query).not.toHaveBeenCalled();
  });

  it.each([
    ['a new Focus identity at the cap', 'focus-at-cap'],
    ['a Focus identity colliding with a non-Focus row', 'shared-non-focus-id'],
  ])('fails closed when %s produces no conditional upsert change', async (_caseName, id) => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.run.mockResolvedValueOnce({ changes: { changes: 0, lastId: 1 } });

    await expect(
      svc.saveFocusSession({
        id,
        startTime: 1000,
        endTime: 61_000,
        duration: 1,
        completed: true,
        points: 0,
      }),
    ).rejects.toThrow('Focus write was not verified or exceeded the safe limit');
  });

  it('fails closed when the conditional Focus upsert cannot verify its change count', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.run.mockResolvedValueOnce({ changes: { lastId: 1 } });

    await expect(
      svc.saveFocusSession({
        id: 'focus-unverified',
        startTime: 1000,
        endTime: 61_000,
        duration: 1,
        completed: true,
        points: 0,
      }),
    ).rejects.toThrow('Focus write was not verified or exceeded the safe limit');
  });

  it('rejects malformed direct Focus writes before db.run', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.run.mockClear();
    const valid = {
      id: 'focus-1',
      startTime: 1,
      endTime: 2,
      duration: 1,
      completed: true,
      points: 0,
    };
    for (const invalid of [
      { ...valid, id: 1 as never },
      { ...valid, id: 'bad id' },
      { ...valid, startTime: -1 },
      { ...valid, endTime: undefined },
      { ...valid, endTime: 0 },
      { ...valid, duration: 0 },
      { ...valid, duration: 1.5 },
      { ...valid, completed: false },
      { ...valid, points: -1 },
      { ...valid, points: 1.5 },
    ])
      await expect(svc.saveFocusSession(invalid)).rejects.toThrow('malformed');
    expect(fakeDb.run).not.toHaveBeenCalled();
  });

  it('rejects numeric Homework identity/text before db.run', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.run.mockClear();
    await expect(
      svc.saveHomeworkItem({
        id: 1 as never,
        subject: 'Math',
        title: 'A',
        dueDate: '2026-07-01',
        completed: false,
      }),
    ).rejects.toThrow('malformed');
    await expect(
      svc.saveHomeworkItem({
        id: 'h1',
        subject: 1 as never,
        title: 'A',
        dueDate: '2026-07-01',
        completed: false,
      }),
    ).rejects.toThrow('malformed');
    expect(fakeDb.run).not.toHaveBeenCalled();
  });

  it('rejects whitespace Homework subject and title before native writes', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.run.mockClear();
    for (const field of ['subject', 'title'] as const) {
      await expect(
        svc.saveHomeworkItem({
          id: 'h1',
          subject: 'Math',
          title: 'A',
          dueDate: '2026-07-01',
          completed: false,
          [field]: '   ',
        }),
      ).rejects.toThrow('malformed');
    }
    expect(fakeDb.run).not.toHaveBeenCalled();
  });

  it('accepts exact boundary and leap Homework dates but rejects impossible native writes', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    await expect(
      svc.saveHomeworkItem({
        id: 'year-one',
        subject: 'Math',
        title: 'A',
        dueDate: '0001-01-01',
        completed: false,
      }),
    ).resolves.toBeUndefined();
    await expect(
      svc.saveHomeworkItem({
        id: 'leap',
        subject: 'Math',
        title: 'A',
        dueDate: '2024-02-29',
        completed: false,
      }),
    ).resolves.toBeUndefined();
    fakeDb.run.mockClear();
    for (const dueDate of ['0000-01-01', '2023-02-29', '2026-13-01', '2026-04-31']) {
      await expect(
        svc.saveHomeworkItem({ id: 'bad-date', subject: 'Math', title: 'A', dueDate, completed: false }),
      ).rejects.toThrow('malformed');
    }
    expect(fakeDb.run).not.toHaveBeenCalled();
  });

  it('creates fresh columns and index without destructive or transactional schema repair', async () => {
    setSchemaColumns(['completed_date'], ['external_id', 'started_at', 'ended_at']);
    const svc = new DatabaseService();
    await svc.initialize();

    expect(fakeDb.execute).toHaveBeenCalledWith(
      expect.stringContaining(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_sessions_external_id',
      ),
      false,
    );
    expect(fakeDb.execute.mock.calls.some(([sql]) => String(sql).startsWith('ALTER TABLE'))).toBe(
      false,
    );
    expect(
      fakeDb.execute.mock.calls.some(([sql]) => /DROP|DELETE|REPLACE/i.test(String(sql))),
    ).toBe(false);
    expect(fakeDb.beginTransaction).not.toHaveBeenCalled();
    expect(fakeDb.commitTransaction).not.toHaveBeenCalled();
  });

  it('repairs each missing legacy column once and a second initialize is a no-op', async () => {
    setSchemaColumns([], []);
    const svc = new DatabaseService();
    await svc.initialize();
    const alters = fakeDb.execute.mock.calls.filter(([sql]) =>
      String(sql).startsWith('ALTER TABLE'),
    );
    expect(alters).toHaveLength(4);
    expect(alters.map(([sql]) => sql)).toEqual(
      expect.arrayContaining([
        'ALTER TABLE homework_items ADD COLUMN completed_date INTEGER',
        'ALTER TABLE learning_sessions ADD COLUMN external_id TEXT',
        'ALTER TABLE learning_sessions ADD COLUMN started_at INTEGER',
        'ALTER TABLE learning_sessions ADD COLUMN ended_at INTEGER',
      ]),
    );
    expect(alters.every(([, transaction]) => transaction === false)).toBe(true);
    await svc.initialize();
    expect(
      fakeDb.execute.mock.calls.filter(([sql]) => String(sql).startsWith('ALTER TABLE')),
    ).toHaveLength(4);
  });

  it('fails a partial legacy repair and retries by re-probing before resuming', async () => {
    setSchemaColumns([], []);
    fakeDb.execute.mockImplementationOnce(async () => undefined);
    // WAL, timeout, base schemas and the first two schema repairs precede this injected failure.
    const original = fakeDb.execute.getMockImplementation();
    let alterAttempts = 0;
    fakeDb.execute.mockImplementation(async (sql: string) => {
      if (sql.startsWith('ALTER TABLE') && ++alterAttempts === 2) throw new Error('alter failed');
      return original?.(sql);
    });
    const svc = new DatabaseService();
    await expect(svc.initialize()).rejects.toThrow('alter failed');
    setSchemaColumns(['completed_date'], ['external_id']);
    await expect(svc.initialize()).resolves.toBeUndefined();
    expect(
      fakeDb.query.mock.calls.filter(([sql]) => sql === 'PRAGMA table_info(homework_items)').length,
    ).toBeGreaterThan(1);
  });

  it('allows a transaction owner to save homework without nesting a SQLite transaction', async () => {
    const svc = new DatabaseService();
    await svc.initialize();

    await svc.saveHomeworkItem(
      { id: 'h2', subject: 'Science', title: 'Lab', dueDate: '2026-07-02', completed: true },
      false,
    );

    expect(fakeDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO homework_items'),
      expect.arrayContaining(['h2', 'Science', 'Lab', '2026-07-02', 1]),
      false,
    );
  });

  it('fails closed when the atomic Homework cap upsert reports zero changes', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.run.mockResolvedValueOnce({ changes: { changes: 0, lastId: 1 } });

    await expect(
      svc.saveHomeworkItem({
        id: 'at-cap-new',
        subject: 'Math',
        title: 'Fractions',
        dueDate: '2026-07-01',
        completed: false,
      }),
    ).rejects.toThrow('Homework write was not verified or exceeded the safe limit');
  });

  it('fails closed when the SQLite Homework cap upsert cannot verify its change count', async () => {
    const svc = new DatabaseService();
    await svc.initialize();
    fakeDb.run.mockResolvedValueOnce({ changes: { lastId: 1 } });

    await expect(
      svc.saveHomeworkItem({
        id: 'unverified',
        subject: 'Math',
        title: 'Fractions',
        dueDate: '2026-07-01',
        completed: false,
      }),
    ).rejects.toThrow('Homework write was not verified or exceeded the safe limit');
  });

  it('fails honestly when a learning-session insert has no verified positive row id', async () => {
    fakeDb.run.mockResolvedValueOnce({ changes: {} });
    const svc = new DatabaseService();
    await svc.initialize();

    await expect(
      svc.recordLearningSession({
        type: 'focus',
        duration: 25,
        focusScore: 80,
        tasksCompleted: 0,
      }),
    ).rejects.toThrow('verified positive lastId');
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
    setVerifiedPragmaReadbacks('malformed database');

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
    expect(
      fakeDb.execute.mock.calls.filter(
        ([statement, transaction]) =>
          statement === 'PRAGMA journal_mode=WAL;' && transaction === false,
      ),
    ).toHaveLength(2);
    expect(
      fakeDb.execute.mock.calls.filter(
        ([statement, transaction]) =>
          statement === 'PRAGMA busy_timeout=5000;' && transaction === false,
      ),
    ).toHaveLength(2);
    expect(svc.getConnection()).toBe(fakeDb);
  });
});
