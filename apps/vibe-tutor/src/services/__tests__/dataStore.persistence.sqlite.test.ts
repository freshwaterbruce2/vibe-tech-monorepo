import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeworkItem } from '../../types';

// Exercise the SQLite (Android/Windows = production) branch for homework saves
// (transactional) and focus-session round-trip mapping.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'android',
    isNativePlatform: () => true,
  },
}));

const query = vi.fn();
const fakeDb = { run: vi.fn().mockResolvedValue(undefined), query };
const getConnection = vi.fn(() => fakeDb);
const databaseInitialize = vi.fn().mockResolvedValue(undefined);
const isMigrationComplete = vi.fn().mockResolvedValue(true);
const performMigration = vi.fn().mockResolvedValue(undefined);
const runInTransaction = vi.fn(async (work: () => Promise<void>) => {
  await work();
});
const saveHomeworkItem = vi.fn().mockResolvedValue(undefined);
const getHomeworkItems = vi.fn().mockResolvedValue([]);
const saveFocusSession = vi.fn(async (session: unknown) => session);

vi.mock('../databaseService', () => ({
  databaseService: {
    initialize: databaseInitialize,
    getConnection,
    runInTransaction,
    saveHomeworkItem,
    getHomeworkItems,
    saveFocusSession,
    recordLearningSession: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../migrationService', () => ({
  migrationService: {
    isMigrationComplete,
    performMigration,
  },
}));

vi.mock('../../utils/electronStore', () => ({
  appStore: { get: () => null, set: () => {}, delete: () => {}, remove: () => {} },
}));

const { DataStore, dataStore } = await import('../dataStore');

describe('dataStore persistence (SQLite path)', () => {
  beforeEach(() => {
    query.mockReset();
    query.mockResolvedValue({ values: [] });
    fakeDb.run.mockReset();
    fakeDb.run.mockResolvedValue(undefined);
    getConnection.mockReset();
    getConnection.mockReturnValue(fakeDb);
    runInTransaction.mockClear();
    saveHomeworkItem.mockReset();
    saveHomeworkItem.mockResolvedValue(undefined);
    getHomeworkItems.mockReset();
    getHomeworkItems.mockResolvedValue([]);
    saveFocusSession.mockReset();
    saveFocusSession.mockImplementation(async (session: unknown) => session);
    databaseInitialize.mockReset();
    databaseInitialize.mockResolvedValue(undefined);
    isMigrationComplete.mockReset();
    isMigrationComplete.mockResolvedValue(true);
    performMigration.mockReset();
    performMigration.mockResolvedValue(undefined);
  });

  it('rejects native database initialization failures without falling back and can retry', async () => {
    const store = new DataStore();
    databaseInitialize
      .mockRejectedValueOnce(new Error('open failed'))
      .mockResolvedValueOnce(undefined);

    await expect(store.initialize()).rejects.toThrow('open failed');
    getConnection.mockReturnValue(null);
    await expect(store.getUserSettings('onboarding_completed')).rejects.toThrow(
      'Native SQLite storage is unavailable',
    );

    getConnection.mockReturnValue(fakeDb);
    await expect(store.initialize()).resolves.toBeUndefined();
    expect(databaseInitialize).toHaveBeenCalledTimes(2);
  });

  it('rejects native migration failures without falling back and can retry', async () => {
    const store = new DataStore();
    isMigrationComplete.mockResolvedValueOnce(false);
    performMigration.mockRejectedValueOnce(new Error('migration failed'));

    await expect(store.initialize()).rejects.toThrow('migration failed');
    await expect(store.initialize()).resolves.toBeUndefined();
    expect(databaseInitialize).toHaveBeenCalledTimes(2);
  });

  it('rejects every native getter, save, and delete when SQLite is unavailable', async () => {
    const store = new DataStore();
    getConnection.mockReturnValue(null);
    const homework = {
      id: 'h1',
      subject: 'Math',
      title: 'A',
      dueDate: '2026-07-01',
      completed: false,
    } as HomeworkItem;

    const operations: Array<() => Promise<unknown>> = [
      async () => store.getHomeworkItems(),
      async () => store.getCompletionDeliveryRecord(),
      async () => store.saveCompletionDeliveryRecord('{}'),
      async () => store.saveHomeworkItems([]),
      async () => store.saveHomeworkItem(homework),
      async () => store.deleteHomeworkItem('h1'),
      async () => store.getStudentPoints(),
      async () => store.saveStudentPoints(1),
      async () => store.getAchievements(),
      async () => store.saveAchievements([]),
      async () => store.getRewards(),
      async () => store.saveRewards([]),
      async () => store.getClaimedRewards(),
      async () => store.saveClaimedRewards([]),
      async () => store.getMusicPlaylists(),
      async () => store.saveMusicPlaylists([]),
      async () => store.getFocusSessions(),
      async () =>
        store.saveFocusSession({
          id: 'f1',
          startTime: 0,
          endTime: 1,
          duration: 1,
          completed: true,
          points: 1,
        }),
      async () => store.getAvatarState(),
      async () =>
        store.saveAvatarState({
          equippedItems: {},
          ownedItems: [],
          unlockedAvatars: ['avatar-boy-headphones'],
          selectedAvatarId: 'avatar-boy-headphones',
        }),
      async () => store.getUserSettings('key'),
      async () => store.saveUserSettings('key', 'value'),
      async () => store.getChatHistory('tutor'),
      async () => store.saveChatHistory('tutor', []),
      async () => store.getBrainGameStats(),
      async () => store.saveBrainGameStats({} as never),
      async () => store.getSchedule(),
      async () => store.saveSchedule([]),
      async () => store.getSensoryPreferences(),
      async () => store.saveSensoryPreferences({} as never),
    ];

    for (const operation of operations) {
      await expect(operation()).rejects.toThrow('Native SQLite storage is unavailable');
    }
  });

  it('atomically replaces homework with non-nested item writes (SVC-05)', async () => {
    const items = [
      { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
      { id: 'h2', subject: 'Science', title: 'B', dueDate: '2026-07-02', completed: true },
    ] as HomeworkItem[];

    await dataStore.saveHomeworkItems(items);

    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(fakeDb.run).toHaveBeenCalledWith('DELETE FROM homework_items', [], false);
    expect(saveHomeworkItem).toHaveBeenNthCalledWith(1, items[0], false);
    expect(saveHomeworkItem).toHaveBeenNthCalledWith(2, items[1], false);
  });

  it('accepts a complete native Homework set at 500 but rejects 501 before deletion', async () => {
    const atCap = Array.from({ length: 500 }, (_, index) => ({
      id: `h-${index}`,
      subject: 'Math',
      title: `Task ${index}`,
      dueDate: '2026-07-01',
      completed: false,
    })) as HomeworkItem[];
    await expect(dataStore.saveHomeworkItems(atCap)).resolves.toBeUndefined();
    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(fakeDb.run).toHaveBeenCalledWith('DELETE FROM homework_items', [], false);
    expect(saveHomeworkItem).toHaveBeenCalledTimes(500);

    runInTransaction.mockClear();
    fakeDb.run.mockClear();
    saveHomeworkItem.mockClear();
    await expect(
      dataStore.saveHomeworkItems([
        ...atCap,
        { id: 'h-500', subject: 'Math', title: 'Too many', dueDate: '2026-07-01', completed: false },
      ]),
    ).rejects.toThrow('malformed');
    expect(runInTransaction).not.toHaveBeenCalled();
    expect(fakeDb.run).not.toHaveBeenCalled();
    expect(saveHomeworkItem).not.toHaveBeenCalled();
  });

  it('clears the complete homework set when saving an empty list', async () => {
    await dataStore.saveHomeworkItems([]);

    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(fakeDb.run).toHaveBeenCalledTimes(1);
    expect(fakeDb.run).toHaveBeenCalledWith('DELETE FROM homework_items', [], false);
    expect(saveHomeworkItem).not.toHaveBeenCalled();
  });

  it('propagates the atomic native single-item Homework cap rejection without a separate preflight', async () => {
    saveHomeworkItem.mockRejectedValueOnce(
      new Error('Homework write was not verified or exceeded the safe limit'),
    );

    await expect(
      dataStore.saveHomeworkItem({
        id: 'at-cap-new',
        subject: 'Math',
        title: 'Fractions',
        dueDate: '2026-07-01',
        completed: false,
      }),
    ).rejects.toThrow('Homework write was not verified or exceeded the safe limit');
    expect(saveHomeworkItem).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'at-cap-new' }),
    );
  });

  it('does not resurrect removed homework after the next complete-set save', async () => {
    let rows: HomeworkItem[] = [];
    fakeDb.run.mockImplementation(async (statement: string) => {
      if (statement === 'DELETE FROM homework_items') rows = [];
    });
    saveHomeworkItem.mockImplementation(async (item: HomeworkItem) => {
      rows.push(item);
    });
    getHomeworkItems.mockImplementation(async () => rows);

    await dataStore.saveHomeworkItems([
      { id: 'removed', subject: 'Math', title: 'Old', dueDate: '2026-07-01', completed: false },
    ]);
    await dataStore.saveHomeworkItems([
      { id: 'kept', subject: 'Science', title: 'New', dueDate: '2026-07-02', completed: true },
    ]);

    await expect(dataStore.getHomeworkItems()).resolves.toEqual([
      expect.objectContaining({ id: 'kept', title: 'New' }),
    ]);
  });

  it('rejects the batch through its transaction owner when delete or insert fails', async () => {
    fakeDb.run.mockRejectedValueOnce(new Error('delete failed'));
    await expect(dataStore.saveHomeworkItems([])).rejects.toThrow('delete failed');
    expect(runInTransaction).toHaveBeenCalledTimes(1);

    fakeDb.run.mockResolvedValue(undefined);
    saveHomeworkItem.mockRejectedValueOnce(new Error('insert failed'));
    await expect(
      dataStore.saveHomeworkItems([
        { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
      ]),
    ).rejects.toThrow('insert failed');
    expect(runInTransaction).toHaveBeenCalledTimes(2);
  });

  it('rejects rather than silently dropping a batch when the native connection is absent', async () => {
    getConnection.mockReturnValue(null);

    await expect(dataStore.saveHomeworkItems([])).rejects.toThrow(
      'Native SQLite storage is unavailable',
    );
    expect(runInTransaction).not.toHaveBeenCalled();
  });

  it('getFocusSessions maps rows into complete FocusSession objects (SVC-03)', async () => {
    query.mockResolvedValue({
      values: [
        { id: 5, duration_minutes: 25, focus_score: 80, session_date: '2026-06-30T10:00:00Z' },
      ],
    });

    const sessions = await dataStore.getFocusSessions();

    expect(query).toHaveBeenCalledWith(expect.stringContaining("session_type = 'focus'"));
    expect(sessions).toHaveLength(1);
    const s = sessions[0]!;
    expect(s.id).toBe('5');
    expect(s.duration).toBe(25);
    expect(s.points).toBe(80);
    expect(s.completed).toBe(true);
    expect(typeof s.startTime).toBe('number');
    expect(s.endTime).toBe(s.startTime + 25 * 60_000);
  });

  it('preserves a new Focus external ID and exact persisted timestamps', async () => {
    const session = {
      id: 'session_42',
      startTime: 1000,
      endTime: 1501000,
      duration: 25,
      completed: true,
      points: 9,
    };
    saveFocusSession.mockResolvedValueOnce(session);

    await expect(dataStore.saveFocusSession(session)).resolves.toEqual(session);
    expect(saveFocusSession).toHaveBeenCalledWith(session);
  });

  it('maps legacy Focus rows by physical ID and derived end time only when exact columns are absent', async () => {
    query.mockResolvedValueOnce({
      values: [
        { id: 5, duration_minutes: 25, focus_score: 9, session_date: '2026-06-30T10:00:00Z' },
      ],
    });
    const [session] = await dataStore.getFocusSessions();
    expect(session).toEqual(
      expect.objectContaining({ id: '5', startTime: Date.parse('2026-06-30T10:00:00Z') }),
    );
    expect(session?.endTime).toBe(Date.parse('2026-06-30T10:00:00Z') + 25 * 60_000);
  });

  it('accepts only exact retained UTC legacy Focus timestamp formats', async () => {
    query.mockResolvedValueOnce({
      values: [{ id: 6, duration_minutes: 1, focus_score: 0, session_date: '2026-06-30 10:00:00' }],
    });
    await expect(dataStore.getFocusSessions()).resolves.toEqual([
      expect.objectContaining({ id: '6', startTime: Date.UTC(2026, 5, 30, 10) }),
    ]);
    for (const session_date of [
      '2026-06-30T10:00:00',
      '2026-02-30T10:00:00Z',
      '2026-06-30T10:00:00+00:00',
    ]) {
      query.mockResolvedValueOnce({
        values: [{ id: 7, duration_minutes: 1, focus_score: 0, session_date }],
      });
      await expect(dataStore.getFocusSessions()).rejects.toThrow('malformed');
    }
  });

  it('requires canonical Focus IDs and exact stored times while preserving valid canonical rows', async () => {
    query.mockResolvedValueOnce({
      values: [
        {
          id: 9,
          external_id: 'focus-9',
          duration_minutes: 1,
          focus_score: 2,
          started_at: 100,
          ended_at: 60_100,
        },
      ],
    });
    await expect(dataStore.getFocusSessions()).resolves.toEqual([
      expect.objectContaining({ id: 'focus-9', startTime: 100, endTime: 60_100 }),
    ]);
    for (const row of [
      { id: 9, external_id: 9, duration_minutes: 1, focus_score: 0, started_at: 1, ended_at: 2 },
      {
        id: 9,
        external_id: 'bad id',
        duration_minutes: 1,
        focus_score: 0,
        started_at: 1,
        ended_at: 2,
      },
      {
        id: 9,
        external_id: 'focus-9',
        duration_minutes: 0,
        focus_score: 0,
        started_at: 1,
        ended_at: 2,
      },
      {
        id: 9,
        external_id: 'focus-9',
        duration_minutes: 1,
        focus_score: -1,
        started_at: 2,
        ended_at: 1,
      },
      {
        id: 0,
        external_id: null,
        duration_minutes: 1,
        focus_score: 0,
        session_date: '2026-06-30T10:00:00Z',
      },
    ]) {
      query.mockResolvedValueOnce({ values: [row] });
      await expect(dataStore.getFocusSessions()).rejects.toThrow('malformed');
    }
  });

  it('rejects duplicate canonical Focus identities', async () => {
    query.mockResolvedValueOnce({
      values: [
        {
          id: 1,
          external_id: 'focus-1',
          duration_minutes: 1,
          focus_score: 0,
          started_at: 1,
          ended_at: 2,
        },
        {
          id: 2,
          external_id: 'focus-1',
          duration_minutes: 1,
          focus_score: 0,
          started_at: 3,
          ended_at: 4,
        },
      ],
    });
    await expect(dataStore.getFocusSessions()).rejects.toThrow('malformed');
  });

  it('rejects non-array and capped native Focus query results', async () => {
    query.mockResolvedValueOnce({ values: {} });
    await expect(dataStore.getFocusSessions()).rejects.toThrow('malformed');
    query.mockResolvedValueOnce({ values: Array.from({ length: 501 }, () => ({})) });
    await expect(dataStore.getFocusSessions()).rejects.toThrow('malformed');
  });

  it('allows an existing canonical Focus ID at the cap and delegates exactly once', async () => {
    const rows = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      external_id: `focus-${index}`,
      duration_minutes: 1,
      focus_score: 0,
      started_at: index * 60_000,
      ended_at: (index + 1) * 60_000,
    }));
    query.mockResolvedValueOnce({ values: rows });
    const session = { id: 'focus-0', startTime: 0, endTime: 60_000, duration: 1, completed: true };
    saveFocusSession.mockResolvedValueOnce(session);
    await expect(dataStore.saveFocusSession(session)).resolves.toEqual(session);
    expect(saveFocusSession).toHaveBeenCalledTimes(1);
  });

  it('rejects a new canonical Focus ID at the cap without delegating', async () => {
    const rows = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      external_id: `focus-${index}`,
      duration_minutes: 1,
      focus_score: 0,
      started_at: index * 60_000,
      ended_at: (index + 1) * 60_000,
    }));
    query.mockResolvedValueOnce({ values: rows });
    await expect(
      dataStore.saveFocusSession({
        id: 'focus-new',
        startTime: 0,
        endTime: 60_000,
        duration: 1,
        completed: true,
      }),
    ).rejects.toThrow('safe limit');
    expect(saveFocusSession).not.toHaveBeenCalled();
  });

  it('propagates native Focus preflight read failures without delegating', async () => {
    query.mockRejectedValueOnce(new Error('read unavailable'));
    await expect(
      dataStore.saveFocusSession({
        id: 'focus-1',
        startTime: 0,
        endTime: 60_000,
        duration: 1,
        completed: true,
      }),
    ).rejects.toThrow('read unavailable');
    expect(saveFocusSession).not.toHaveBeenCalled();
  });

  it('propagates a native Focus upsert failure', async () => {
    saveFocusSession.mockRejectedValueOnce(new Error('update failed'));
    await expect(
      dataStore.saveFocusSession({
        id: 'session_7',
        startTime: 1,
        endTime: 2,
        duration: 1,
        completed: true,
      }),
    ).rejects.toThrow('update failed');
  });

  it('propagates the atomic native Focus admission rejection', async () => {
    saveFocusSession.mockRejectedValueOnce(
      new Error('Focus write was not verified or exceeded the safe limit'),
    );

    await expect(
      dataStore.saveFocusSession({
        id: 'focus-collision',
        startTime: 1,
        endTime: 2,
        duration: 1,
        completed: true,
      }),
    ).rejects.toThrow('Focus write was not verified or exceeded the safe limit');
    expect(saveFocusSession).toHaveBeenCalledWith(expect.objectContaining({ id: 'focus-collision' }));
  });

  it('atomically replaces playlists with parameter-bound non-nested writes', async () => {
    await dataStore.saveMusicPlaylists([
      {
        id: 'p1',
        name: 'Study; DROP TABLE music_playlists; --',
        platform: 'local',
        tracks: [],
        createdAt: 1,
      },
    ]);

    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(fakeDb.run).toHaveBeenNthCalledWith(1, 'DELETE FROM music_playlists', [], false);
    expect(fakeDb.run).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT OR REPLACE INTO music_playlists'),
      ['p1', 'Study; DROP TABLE music_playlists; --', '[]'],
      false,
    );
    expect(fakeDb.run.mock.calls[1]?.[0]).not.toContain('Study; DROP TABLE');
  });

  it('atomically clears every playlist when saving an empty list', async () => {
    await dataStore.saveMusicPlaylists([]);

    expect(runInTransaction).toHaveBeenCalledTimes(1);
    expect(fakeDb.run).toHaveBeenCalledTimes(1);
    expect(fakeDb.run).toHaveBeenCalledWith('DELETE FROM music_playlists', [], false);
  });

  it('propagates a replacement-write failure through the existing transaction owner', async () => {
    fakeDb.run.mockRejectedValueOnce(new Error('delete failed'));

    await expect(dataStore.saveMusicPlaylists([])).rejects.toThrow('delete failed');
    expect(runInTransaction).toHaveBeenCalledTimes(1);
  });

  it('does not resurrect a removed playlist on the next SQLite load', async () => {
    let rows: Array<Record<string, unknown>> = [];
    fakeDb.run.mockImplementation(async (statement: string, values: unknown[]) => {
      if (statement === 'DELETE FROM music_playlists') {
        rows = [];
        return;
      }
      rows.push({ id: values[0], name: values[1], tracks: values[2], created_at: 1 });
    });
    query.mockImplementation(async (statement: string) =>
      statement.includes('FROM music_playlists') ? { values: rows } : { values: [] },
    );

    await dataStore.saveMusicPlaylists([
      { id: 'removed', name: 'Removed', platform: 'local', tracks: [], createdAt: 1 },
    ]);
    await dataStore.saveMusicPlaylists([
      { id: 'kept', name: 'Kept', platform: 'local', tracks: [], createdAt: 2 },
    ]);

    await expect(dataStore.getMusicPlaylists()).resolves.toEqual([
      expect.objectContaining({ id: 'kept', name: 'Kept' }),
    ]);
  });

  it('rejects a missing native connection instead of silently losing playlist changes', async () => {
    getConnection.mockReturnValue(null);

    await expect(dataStore.saveMusicPlaylists([])).rejects.toThrow('storage is unavailable');
    await expect(dataStore.getMusicPlaylists()).rejects.toThrow('storage is unavailable');
  });

  it('fails closed on malformed SQLite playlist tracks', async () => {
    query.mockResolvedValue({
      values: [{ id: 'p1', name: 'Bad', tracks: '{bad json', created_at: 1 }],
    });

    await expect(dataStore.getMusicPlaylists()).rejects.toThrow('tracks are malformed');
  });
});
