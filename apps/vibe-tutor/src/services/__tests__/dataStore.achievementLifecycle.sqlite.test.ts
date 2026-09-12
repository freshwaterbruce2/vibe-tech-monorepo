import { beforeEach, describe, expect, it, vi } from 'vitest';

const sqlite = vi.hoisted(() => {
  const query = vi.fn();
  const run = vi.fn();
  return {
    query,
    run,
    connection: { query, run } as { query: typeof query; run: typeof run } | undefined,
  };
});
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' } }));
vi.mock('../databaseService', () => ({
  databaseService: {
    getConnection: vi.fn(() => sqlite.connection),
    initialize: vi.fn(),
    runInTransaction: vi.fn(),
  },
}));
vi.mock('../migrationService', () => ({
  migrationService: { isMigrationComplete: vi.fn(), performMigration: vi.fn() },
}));
vi.mock('../../utils/electronStore', () => ({
  appStore: { getStrict: vi.fn(), setStrict: vi.fn() },
}));
vi.mock('../../components/ui/icons/FlameIcon', () => ({ FlameIcon: () => null }));
vi.mock('../../components/ui/icons/TrophyIcon', () => ({ TrophyIcon: () => null }));

const { DataStore } = await import('../dataStore');

describe('DataStore achievement lifecycle SQLite adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sqlite.connection = { query: sqlite.query, run: sqlite.run };
    sqlite.query.mockResolvedValue({ values: [] });
    sqlite.run.mockResolvedValue(undefined);
  });
  it('uses the exact parameterized key and treats a missing row as absence', async () => {
    const store = new DataStore();
    await expect(store.getAchievementLifecycleRecord()).resolves.toBeNull();
    expect(sqlite.query).toHaveBeenCalledWith('SELECT value FROM user_settings WHERE key = ?', [
      'vibetutor_achievement_lifecycle_v1',
    ]);
  });
  it('returns a valid SQLite value and rejects malformed value types', async () => {
    const store = new DataStore();
    sqlite.query.mockResolvedValueOnce({ values: [{ value: '{"version":1}' }] });
    await expect(store.getAchievementLifecycleRecord()).resolves.toBe('{"version":1}');
    sqlite.query.mockResolvedValueOnce({ values: [{ value: 4 }] });
    await expect(store.getAchievementLifecycleRecord()).rejects.toThrow('malformed');
  });
  it('creates and inserts the exact canonical row with parameterized values', async () => {
    const store = new DataStore();
    await store.saveAchievementLifecycleRecord('{"version":1}');
    expect(sqlite.run).toHaveBeenNthCalledWith(
      1,
      'CREATE TABLE IF NOT EXISTS user_settings (key TEXT PRIMARY KEY, value TEXT)',
    );
    expect(sqlite.run).toHaveBeenNthCalledWith(
      2,
      'INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)',
      ['vibetutor_achievement_lifecycle_v1', '{"version":1}'],
    );
  });
  it('propagates query, create, and insert failures', async () => {
    const store = new DataStore();
    sqlite.query.mockRejectedValueOnce(new Error('query failed'));
    await expect(store.getAchievementLifecycleRecord()).rejects.toThrow('query failed');
    sqlite.run.mockRejectedValueOnce(new Error('create failed'));
    await expect(store.saveAchievementLifecycleRecord('{}')).rejects.toThrow('create failed');
    sqlite.run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('insert failed'));
    await expect(store.saveAchievementLifecycleRecord('{}')).rejects.toThrow('insert failed');
  });

  it('uses the completion-delivery exact key with strict missing, round-trip, and malformed handling', async () => {
    const store = new DataStore();
    await expect(store.getCompletionDeliveryRecord()).resolves.toBeNull();
    expect(sqlite.query).toHaveBeenLastCalledWith('SELECT value FROM user_settings WHERE key = ?', [
      'vibetutor_completion_delivery_v1',
    ]);
    sqlite.query.mockResolvedValueOnce({ values: [{ value: '{"version":1,"entries":[]}' }] });
    await expect(store.getCompletionDeliveryRecord()).resolves.toBe('{"version":1,"entries":[]}');
    sqlite.query.mockResolvedValueOnce({ values: [{ value: 1 }] });
    await expect(store.getCompletionDeliveryRecord()).rejects.toThrow('malformed');
    sqlite.query.mockResolvedValueOnce({ values: [{ value: '{}' }, { value: '{}' }] });
    await expect(store.getCompletionDeliveryRecord()).rejects.toThrow('malformed');
    await store.saveCompletionDeliveryRecord('{"version":1,"entries":[]}');
    expect(sqlite.run).toHaveBeenLastCalledWith(
      'INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)',
      ['vibetutor_completion_delivery_v1', '{"version":1,"entries":[]}'],
    );
  });

  it('propagates completion-delivery query, create, and insert failures', async () => {
    const store = new DataStore();
    sqlite.query.mockRejectedValueOnce(new Error('query failed'));
    await expect(store.getCompletionDeliveryRecord()).rejects.toThrow('query failed');
    sqlite.run.mockRejectedValueOnce(new Error('create failed'));
    await expect(store.saveCompletionDeliveryRecord('{}')).rejects.toThrow('create failed');
    sqlite.run.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('insert failed'));
    await expect(store.saveCompletionDeliveryRecord('{}')).rejects.toThrow('insert failed');
  });

  describe('worksheet progression adapters', () => {
    it('uses the exact canonical SELECT and returns only one unchanged string row', async () => {
      const store = new DataStore();
      await expect(store.getWorksheetProgressRecord()).resolves.toBeNull();
      expect(sqlite.query).toHaveBeenCalledWith('SELECT value FROM user_settings WHERE key = ?', [
        'vibetutor_worksheet_progress_v1',
      ]);

      sqlite.query.mockResolvedValueOnce({ values: undefined });
      await expect(store.getWorksheetProgressRecord()).resolves.toBeNull();
      sqlite.query.mockResolvedValueOnce({ values: [{ value: '{"version":1}' }] });
      await expect(store.getWorksheetProgressRecord()).resolves.toBe('{"version":1}');
    });

    it('rejects malformed canonical cardinality and values', async () => {
      const store = new DataStore();
      for (const values of [
        null,
        {},
        [{ value: '{}' }, { value: '{}' }],
        [null],
        [{ value: 1 }],
        [{ value: {} }],
        [{ value: '' }],
      ]) {
        sqlite.query.mockResolvedValueOnce({ values });
        await expect(store.getWorksheetProgressRecord()).rejects.toThrow('malformed');
      }
    });

    it('creates and inserts the exact parameterized canonical row', async () => {
      const store = new DataStore();
      const serialized = '{"version":1,"entries":[]}';
      await store.saveWorksheetProgressRecord(serialized);
      expect(sqlite.run).toHaveBeenNthCalledWith(
        1,
        'CREATE TABLE IF NOT EXISTS user_settings (key TEXT PRIMARY KEY, value TEXT)',
      );
      expect(sqlite.run).toHaveBeenNthCalledWith(
        2,
        'INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)',
        ['vibetutor_worksheet_progress_v1', serialized],
      );
    });

    it('propagates canonical query, create, and insert failures and rejects non-string saves before DB calls', async () => {
      const store = new DataStore();
      sqlite.query.mockRejectedValueOnce(new Error('canonical query failed'));
      await expect(store.getWorksheetProgressRecord()).rejects.toThrow('canonical query failed');
      sqlite.run.mockRejectedValueOnce(new Error('canonical create failed'));
      await expect(store.saveWorksheetProgressRecord('{}')).rejects.toThrow(
        'canonical create failed',
      );
      sqlite.run
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('canonical insert failed'));
      await expect(store.saveWorksheetProgressRecord('{}')).rejects.toThrow(
        'canonical insert failed',
      );

      sqlite.run.mockClear();
      await expect(store.saveWorksheetProgressRecord('')).rejects.toThrow('serialized');
      expect(sqlite.run).not.toHaveBeenCalled();

      sqlite.run.mockClear();
      await expect(store.saveWorksheetProgressRecord({} as never)).rejects.toThrow('serialized');
      expect(sqlite.run).not.toHaveBeenCalled();
    });

    it('reads the exact legacy subject-progress row and rejects malformed legacy results', async () => {
      const store = new DataStore();
      await expect(store.getLegacyWorksheetProgressRecord()).resolves.toBeNull();
      expect(sqlite.query).toHaveBeenCalledWith('SELECT value FROM user_settings WHERE key = ?', [
        'subject-progress',
      ]);

      sqlite.query.mockResolvedValueOnce({ values: undefined });
      await expect(store.getLegacyWorksheetProgressRecord()).resolves.toBeNull();
      sqlite.query.mockResolvedValueOnce({ values: [{ value: '{"math":1}' }] });
      await expect(store.getLegacyWorksheetProgressRecord()).resolves.toBe('{"math":1}');
      for (const values of [
        null,
        {},
        [{ value: '{}' }, { value: '{}' }],
        [null],
        [{ value: 1 }],
        [{ value: {} }],
        [{ value: '' }],
      ]) {
        sqlite.query.mockResolvedValueOnce({ values });
        await expect(store.getLegacyWorksheetProgressRecord()).rejects.toThrow('malformed');
      }
      expect(sqlite.run).not.toHaveBeenCalled();
    });

    it('propagates legacy query failures and fails closed when SQLite is unavailable', async () => {
      const store = new DataStore();
      sqlite.query.mockRejectedValueOnce(new Error('legacy query failed'));
      await expect(store.getLegacyWorksheetProgressRecord()).rejects.toThrow('legacy query failed');

      sqlite.connection = undefined;
      await expect(store.getWorksheetProgressRecord()).rejects.toThrow(
        'Native SQLite storage is unavailable',
      );
      await expect(store.saveWorksheetProgressRecord('{}')).rejects.toThrow(
        'Native SQLite storage is unavailable',
      );
      await expect(store.getLegacyWorksheetProgressRecord()).rejects.toThrow(
        'Native SQLite storage is unavailable',
      );
    });
  });

  describe('realm run adapters', () => {
    it('uses the exact canonical SQLite row and rejects malformed cardinality/value cases', async () => {
      const store = new DataStore();
      await expect(store.getRealmRunRecord()).resolves.toBeNull();
      expect(sqlite.query).toHaveBeenLastCalledWith(
        'SELECT value FROM user_settings WHERE key = ?',
        ['vibetutor_realm_runs_v1'],
      );
      sqlite.query.mockResolvedValueOnce({ values: undefined });
      await expect(store.getRealmRunRecord()).resolves.toBeNull();
      sqlite.query.mockResolvedValueOnce({ values: [{ value: '{"version":1}' }] });
      await expect(store.getRealmRunRecord()).resolves.toBe('{"version":1}');
      for (const values of [
        null,
        {},
        [{ value: '{}' }, { value: '{}' }],
        [{ value: 1 }],
        [{ value: '' }],
      ]) {
        sqlite.query.mockResolvedValueOnce({ values });
        await expect(store.getRealmRunRecord()).rejects.toThrow('malformed');
      }
    });
    it('creates/upserts exact raw rows and propagates database/unavailable failures', async () => {
      const store = new DataStore();
      await store.saveRealmRunRecord('{}');
      expect(sqlite.run).toHaveBeenLastCalledWith(
        'INSERT OR REPLACE INTO user_settings (key, value) VALUES (?, ?)',
        ['vibetutor_realm_runs_v1', '{}'],
      );
      sqlite.query.mockRejectedValueOnce(new Error('realm query failed'));
      await expect(store.getRealmRunRecord()).rejects.toThrow('realm query failed');
      sqlite.run.mockRejectedValueOnce(new Error('realm create failed'));
      await expect(store.saveRealmRunRecord('{}')).rejects.toThrow('realm create failed');
      sqlite.run
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('realm upsert failed'));
      await expect(store.saveRealmRunRecord('{}')).rejects.toThrow('realm upsert failed');
      sqlite.run.mockClear();
      await expect(store.saveRealmRunRecord('')).rejects.toThrow('serialized');
      expect(sqlite.run).not.toHaveBeenCalled();
      sqlite.connection = undefined;
      await expect(store.getRealmRunRecord()).rejects.toThrow('unavailable');
      await expect(store.saveRealmRunRecord('{}')).rejects.toThrow('unavailable');
    });
  });

  it('reads strict migration inputs directly from the real SQLite tables and propagates failures', async () => {
    sqlite.query.mockImplementation(async (statement: string) => {
      if (statement.includes('achievements'))
        return { values: [{ id: 'FIRST_TASK', unlocked: 1, progress: 1 }] };
      if (statement.includes('homework_items'))
        return { values: [{ id: 'task', completed: 1, completedDate: 1_700_000_000_000 }] };
      if (statement.includes('learning_sessions'))
        return { values: [{ id: 1, completed: 1, startTime: 1_700_000_000_000 }] };
      return { values: [] };
    });
    const store = new DataStore();
    await expect(store.getLegacyAchievementLifecycleSources()).resolves.toMatchObject({
      achievements: [{ id: 'FIRST_TASK', unlocked: true }],
      homeworkItems: [{ completed: true }],
      focusSessions: [{ completed: true }],
      avatarState: null,
    });
    expect(sqlite.query).toHaveBeenCalledWith(expect.stringContaining('learning_sessions'), [
      'focus',
    ]);
    sqlite.query.mockRejectedValueOnce(new Error('legacy query failed'));
    await expect(store.getLegacyAchievementLifecycleSources()).rejects.toThrow(
      'legacy query failed',
    );
  });
});
