import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Achievement,
  ChatMessage,
  FocusSession,
  HomeworkItem,
  MusicPlaylist,
  SensoryPreferences,
} from '../../types';
import { TrophyIcon } from '../../components/ui/icons/TrophyIcon';

// In-memory store that mimics the real appStore behavior (JSON round-trip)
const memStore = new Map<string, string>();
const strictGet = vi.fn((key: string) => {
  const raw = memStore.get(key);
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
});
const strictSet = vi.fn((key: string, value: unknown) => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  memStore.set(key, serialized);
});
const permissiveGet = vi.fn((key: string) => {
  const raw = memStore.get(key);
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
});
const permissiveSet = vi.fn((key: string, value: unknown) => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  memStore.set(key, serialized);
});

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => 'web',
  },
}));

vi.mock('../databaseService', () => ({
  databaseService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
    isConnected: () => false,
    getConnection: () => null,
  },
}));

vi.mock('../migrationService', () => ({
  migrationService: {
    migrate: vi.fn().mockResolvedValue(undefined),
    isMigrationComplete: vi.fn().mockResolvedValue(true),
    performMigration: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock electronInit to avoid window.electronAPI dependency
vi.mock('../../utils/electronInit', () => ({
  initElectronAPI: vi.fn(),
  isRealElectron: () => false,
  electronAPIStub: {},
  electronStoreStub: {},
}));

// Mock appStore to use our in-memory Map
vi.mock('../../utils/electronStore', () => ({
  appStore: {
    get: permissiveGet,
    set: permissiveSet,
    getStrict: strictGet,
    setStrict: strictSet,
    remove: (key: string) => memStore.delete(key),
    delete: (key: string) => memStore.delete(key),
  },
}));

// Import after mocks
const { dataStore } = await import('../dataStore');

describe('dataStore (web/localStorage path)', () => {
  beforeEach(() => {
    memStore.clear();
    vi.clearAllMocks();
  });

  // ── Homework Items ─────────────────────────────────────────────
  describe('getHomeworkItems / saveHomeworkItems', () => {
    it('returns empty array when no items saved', async () => {
      const items = await dataStore.getHomeworkItems();
      expect(items).toEqual([]);
    });

    it('saves and retrieves homework items', async () => {
      const testItems = [
        { id: '1', subject: 'Math', title: 'Math HW', dueDate: '2026-07-01', completed: false },
        {
          id: '2',
          subject: 'Language Arts',
          title: 'Reading',
          dueDate: '2026-07-02',
          completed: true,
          completedDate: 1000,
        },
      ];
      await dataStore.saveHomeworkItems(testItems as unknown as HomeworkItem[]);
      const items = await dataStore.getHomeworkItems();
      expect(items).toHaveLength(2);
      expect(items[0]!.title).toBe('Math HW');
    });

    it('rejects strict Homework read/write failures without a replacement write', async () => {
      strictGet.mockImplementationOnce(() => {
        throw new Error('read unavailable');
      });
      await expect(
        dataStore.saveHomeworkItem({
          id: 'h1',
          subject: 'Math',
          title: 'A',
          dueDate: '2026-07-01',
          completed: false,
        }),
      ).rejects.toThrow('read unavailable');
      strictSet.mockImplementationOnce(() => {
        throw new Error('write unavailable');
      });
      await expect(dataStore.saveHomeworkItems([])).rejects.toThrow('write unavailable');
      expect(permissiveSet).not.toHaveBeenCalledWith('homeworkItems', expect.anything());
    });

    it('rejects malformed, duplicate, and capped Homework collections', async () => {
      for (const rows of [
        [{ id: 'bad id', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false }],
        [
          { id: 'x', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
          { id: 'x', subject: 'Math', title: 'B', dueDate: '2026-07-01', completed: false },
        ],
        Array.from({ length: 501 }, (_, i) => ({
          id: `h-${i}`,
          subject: 'Math',
          title: 'A',
          dueDate: '2026-07-01',
          completed: false,
        })),
      ]) {
        memStore.set('homeworkItems', JSON.stringify(rows));
        await expect(dataStore.getHomeworkItems()).rejects.toThrow('malformed');
      }
    });

    it('rejects numeric Homework IDs on web reads and writes without mutating storage', async () => {
      memStore.set(
        'homeworkItems',
        JSON.stringify([
          { id: 7, subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
        ]),
      );
      await expect(dataStore.getHomeworkItems()).rejects.toThrow('malformed');
      strictSet.mockClear();

      await expect(
        dataStore.saveHomeworkItem({
          id: 7 as never,
          subject: 'Math',
          title: 'A',
          dueDate: '2026-07-01',
          completed: false,
        }),
      ).rejects.toThrow('malformed');
      expect(strictSet).not.toHaveBeenCalled();
    });

    it('rejects whitespace Homework text on web reads and writes without mutating storage', async () => {
      for (const field of ['subject', 'title'] as const) {
        memStore.set(
          'homeworkItems',
          JSON.stringify([
            {
              id: 'h1',
              subject: 'Math',
              title: 'A',
              dueDate: '2026-07-01',
              completed: false,
              [field]: '   ',
            },
          ]),
        );
        await expect(dataStore.getHomeworkItems()).rejects.toThrow('malformed');
        strictSet.mockClear();
        await expect(
          dataStore.saveHomeworkItem({
            id: 'h1',
            subject: 'Math',
            title: 'A',
            dueDate: '2026-07-01',
            completed: false,
            [field]: '   ',
          }),
        ).rejects.toThrow('malformed');
        expect(strictSet).not.toHaveBeenCalled();
      }
    });

    it('accepts exact boundary and leap Homework dates but rejects impossible web dates without writes', async () => {
      await expect(
        dataStore.saveHomeworkItems([
          { id: 'year-one', subject: 'Math', title: 'A', dueDate: '0001-01-01', completed: false },
          { id: 'leap', subject: 'Math', title: 'B', dueDate: '2024-02-29', completed: false },
        ]),
      ).resolves.toBeUndefined();

      for (const dueDate of ['0000-01-01', '2023-02-29', '2026-13-01', '2026-04-31']) {
        strictSet.mockClear();
        await expect(
          dataStore.saveHomeworkItem({
            id: 'bad-date',
            subject: 'Math',
            title: 'A',
            dueDate,
            completed: false,
          }),
        ).rejects.toThrow('malformed');
        expect(strictSet).not.toHaveBeenCalled();
      }
    });

    it('rejects strict single-item Homework reads/writes without overwrite and persists a valid delete', async () => {
      strictGet.mockImplementationOnce(() => {
        throw new Error('read unavailable');
      });
      await expect(dataStore.deleteHomeworkItem('h1')).rejects.toThrow('read unavailable');
      memStore.set(
        'homeworkItems',
        JSON.stringify([
          { id: 'bad id', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
        ]),
      );
      await expect(
        dataStore.saveHomeworkItem({
          id: 'h1',
          subject: 'Math',
          title: 'A',
          dueDate: '2026-07-01',
          completed: false,
        }),
      ).rejects.toThrow('malformed');
      expect(strictSet).not.toHaveBeenCalledWith('homeworkItems', expect.anything());
      memStore.set(
        'homeworkItems',
        JSON.stringify([
          { id: 'h1', subject: 'Math', title: 'A', dueDate: '2026-07-01', completed: false },
          { id: 'h2', subject: 'Math', title: 'B', dueDate: '2026-07-02', completed: false },
        ]),
      );
      await dataStore.deleteHomeworkItem('h1');
      await expect(dataStore.getHomeworkItems()).resolves.toEqual([
        expect.objectContaining({ id: 'h2' }),
      ]);
      strictSet.mockImplementationOnce(() => {
        throw new Error('write unavailable');
      });
      await expect(
        dataStore.saveHomeworkItem({
          id: 'h2',
          subject: 'Math',
          title: 'B',
          dueDate: '2026-07-02',
          completed: false,
        }),
      ).rejects.toThrow('write unavailable');
    });
  });

  // ── Student Points ─────────────────────────────────────────────
  describe('getStudentPoints / saveStudentPoints', () => {
    it('returns 0 when no points saved', async () => {
      const points = await dataStore.getStudentPoints();
      expect(points).toBe(0);
    });

    it('saves and retrieves points', async () => {
      await dataStore.saveStudentPoints(150);
      const points = await dataStore.getStudentPoints();
      expect(points).toBe(150);
    });
  });

  // ── User Settings ──────────────────────────────────────────────
  describe('getUserSettings / saveUserSettings', () => {
    it('returns empty string for non-existent key', async () => {
      const value = await dataStore.getUserSettings('nonexistent');
      expect(value).toBeFalsy();
    });

    it('saves and retrieves string settings', async () => {
      await dataStore.saveUserSettings('theme', 'dark');
      const value = await dataStore.getUserSettings('theme');
      expect(value).toBe('dark');
    });

    it('overwrites existing settings', async () => {
      await dataStore.saveUserSettings('theme', 'dark');
      await dataStore.saveUserSettings('theme', 'light');
      const value = await dataStore.getUserSettings('theme');
      expect(value).toBe('light');
    });
  });

  describe('achievement lifecycle adapter', () => {
    it('uses the exact canonical key through strict read/write operations', async () => {
      await expect(dataStore.getAchievementLifecycleRecord()).resolves.toBeNull();
      await dataStore.saveAchievementLifecycleRecord('{"version":1}');
      await expect(dataStore.getAchievementLifecycleRecord()).resolves.toBe('{"version":1}');
      expect(strictSet).toHaveBeenCalledWith('vibetutor_achievement_lifecycle_v1', '{"version":1}');
      expect(strictGet).toHaveBeenCalledWith('vibetutor_achievement_lifecycle_v1');
    });

    it('propagates strict lifecycle read/write failures without treating them as absence', async () => {
      strictGet.mockImplementationOnce(() => {
        throw new Error('read unavailable');
      });
      await expect(dataStore.getAchievementLifecycleRecord()).rejects.toThrow('read unavailable');
      strictSet.mockImplementationOnce(() => {
        throw new Error('write unavailable');
      });
      await expect(dataStore.saveAchievementLifecycleRecord('{"version":1}')).rejects.toThrow(
        'write unavailable',
      );
    });

    it('reads migration arrays through strict storage and rejects malformed or failed reads', async () => {
      memStore.set('achievements', JSON.stringify([]));
      memStore.set('homeworkItems', JSON.stringify([]));
      memStore.set('focusSessions', JSON.stringify([]));
      await expect(dataStore.getLegacyAchievementLifecycleSources()).resolves.toMatchObject({
        achievements: [],
        homeworkItems: [],
        focusSessions: [],
      });
      memStore.set('homeworkItems', JSON.stringify({ not: 'an array' }));
      await expect(dataStore.getLegacyAchievementLifecycleSources()).rejects.toThrow('arrays');
      memStore.delete('homeworkItems');
      strictGet.mockImplementationOnce(() => {
        throw new Error('legacy read unavailable');
      });
      await expect(dataStore.getLegacyAchievementLifecycleSources()).rejects.toThrow(
        'legacy read unavailable',
      );
    });
  });

  describe('completion delivery adapter', () => {
    it('uses its exact strict key with missing/object-normalized round trips', async () => {
      await expect(dataStore.getCompletionDeliveryRecord()).resolves.toBeNull();
      await dataStore.saveCompletionDeliveryRecord('{"version":1,"entries":[]}');
      await expect(dataStore.getCompletionDeliveryRecord()).resolves.toBe(
        '{"version":1,"entries":[]}',
      );
      expect(strictSet).toHaveBeenCalledWith(
        'vibetutor_completion_delivery_v1',
        '{"version":1,"entries":[]}',
      );
      memStore.set('vibetutor_completion_delivery_v1', JSON.stringify({ version: 1, entries: [] }));
      await expect(dataStore.getCompletionDeliveryRecord()).resolves.toBe(
        '{"version":1,"entries":[]}',
      );
    });

    it('propagates strict completion delivery read/write failures and rejects non-string raw values', async () => {
      strictGet.mockImplementationOnce(() => {
        throw new Error('read unavailable');
      });
      await expect(dataStore.getCompletionDeliveryRecord()).rejects.toThrow('read unavailable');
      strictSet.mockImplementationOnce(() => {
        throw new Error('write unavailable');
      });
      await expect(dataStore.saveCompletionDeliveryRecord('{}')).rejects.toThrow(
        'write unavailable',
      );
      memStore.set('vibetutor_completion_delivery_v1', JSON.stringify(['not', 'a', 'record']));
      await expect(dataStore.getCompletionDeliveryRecord()).rejects.toThrow('malformed');
    });
  });

  describe('worksheet progression adapters', () => {
    it('uses the canonical strict key with exact raw strings and plain-object normalization', async () => {
      await expect(dataStore.getWorksheetProgressRecord()).resolves.toBeNull();
      expect(strictGet).toHaveBeenCalledWith('vibetutor_worksheet_progress_v1');

      const serialized = '{"version":1,"entries":[]}';
      await dataStore.saveWorksheetProgressRecord(serialized);
      expect(strictSet).toHaveBeenCalledWith('vibetutor_worksheet_progress_v1', serialized);
      expect(memStore.get('vibetutor_worksheet_progress_v1')).toBe(serialized);
      await expect(dataStore.getWorksheetProgressRecord()).resolves.toBe(serialized);

      memStore.set('vibetutor_worksheet_progress_v1', JSON.stringify({ version: 1, entries: [] }));
      await expect(dataStore.getWorksheetProgressRecord()).resolves.toBe(
        '{"version":1,"entries":[]}',
      );
    });

    it('propagates strict failures and rejects malformed canonical values without writes', async () => {
      strictGet.mockImplementationOnce(() => {
        throw new Error('canonical read unavailable');
      });
      await expect(dataStore.getWorksheetProgressRecord()).rejects.toThrow(
        'canonical read unavailable',
      );

      strictSet.mockImplementationOnce(() => {
        throw new Error('canonical write unavailable');
      });
      await expect(dataStore.saveWorksheetProgressRecord('{}')).rejects.toThrow(
        'canonical write unavailable',
      );

      for (const value of [[], 1, true, '']) {
        strictGet.mockClear();
        strictSet.mockClear();
        memStore.set('vibetutor_worksheet_progress_v1', JSON.stringify(value));
        await expect(dataStore.getWorksheetProgressRecord()).rejects.toThrow('malformed');
        expect(strictGet).toHaveBeenCalledWith('vibetutor_worksheet_progress_v1');
        expect(strictSet).not.toHaveBeenCalled();
      }

      strictSet.mockClear();
      await expect(dataStore.saveWorksheetProgressRecord('')).rejects.toThrow('serialized');
      expect(strictSet).not.toHaveBeenCalled();

      strictSet.mockClear();
      await expect(dataStore.saveWorksheetProgressRecord({} as never)).rejects.toThrow(
        'serialized',
      );
      expect(strictSet).not.toHaveBeenCalled();
    });

    it('reads the legacy subject-progress key without writing or deleting legacy storage', async () => {
      await expect(dataStore.getLegacyWorksheetProgressRecord()).resolves.toBeNull();
      expect(strictGet).toHaveBeenCalledWith('subject-progress');

      memStore.set('subject-progress', '{"math":{"done":1}}');
      await expect(dataStore.getLegacyWorksheetProgressRecord()).resolves.toBe(
        '{"math":{"done":1}}',
      );

      memStore.set('subject-progress', JSON.stringify({ math: { done: 1 } }));
      await expect(dataStore.getLegacyWorksheetProgressRecord()).resolves.toBe(
        '{"math":{"done":1}}',
      );
      expect(strictSet).not.toHaveBeenCalled();
    });

    it('propagates strict legacy failures and rejects malformed legacy values without mutation', async () => {
      strictGet.mockImplementationOnce(() => {
        throw new Error('legacy read unavailable');
      });
      await expect(dataStore.getLegacyWorksheetProgressRecord()).rejects.toThrow(
        'legacy read unavailable',
      );

      for (const value of [[], 1, true, '']) {
        strictGet.mockClear();
        strictSet.mockClear();
        memStore.set('subject-progress', JSON.stringify(value));
        await expect(dataStore.getLegacyWorksheetProgressRecord()).rejects.toThrow('malformed');
        expect(strictGet).toHaveBeenCalledWith('subject-progress');
        expect(strictSet).not.toHaveBeenCalled();
      }
    });
  });

  describe('realm run adapters', () => {
    it('uses strict canonical raw storage and direct legacy appStore access', async () => {
      await expect(dataStore.getRealmRunRecord()).resolves.toBeNull();
      expect(strictGet).toHaveBeenCalledWith('vibetutor_realm_runs_v1');
      await dataStore.saveRealmRunRecord('{"version":1,"nextSequence":1,"runs":[]}');
      expect(strictSet).toHaveBeenCalledWith(
        'vibetutor_realm_runs_v1',
        '{"version":1,"nextSequence":1,"runs":[]}',
      );
      memStore.set(
        'vibetutor_realm_runs_v1',
        JSON.stringify({ version: 1, nextSequence: 1, runs: [] }),
      );
      await expect(dataStore.getRealmRunRecord()).resolves.toBe(
        '{"version":1,"nextSequence":1,"runs":[]}',
      );
      memStore.set('realm_game_session_sequence', '41');
      await expect(dataStore.getLegacyRealmGameSessionSequence()).resolves.toBe(41);
      expect(strictGet).toHaveBeenCalledWith('realm_game_session_sequence');
    });
    it('fails closed for malformed canonical or legacy values and propagates strict failures', async () => {
      for (const value of [[], 1, '']) {
        memStore.set('vibetutor_realm_runs_v1', JSON.stringify(value));
        await expect(dataStore.getRealmRunRecord()).rejects.toThrow('malformed');
      }
      for (const value of [-1, 1.5, '41']) {
        memStore.set('realm_game_session_sequence', JSON.stringify(value));
        await expect(dataStore.getLegacyRealmGameSessionSequence()).rejects.toThrow('malformed');
      }
      strictGet.mockImplementationOnce(() => {
        throw new Error('realm read failed');
      });
      await expect(dataStore.getRealmRunRecord()).rejects.toThrow('realm read failed');
      strictSet.mockImplementationOnce(() => {
        throw new Error('realm write failed');
      });
      await expect(dataStore.saveRealmRunRecord('{}')).rejects.toThrow('realm write failed');
      strictSet.mockClear();
      await expect(dataStore.saveRealmRunRecord('')).rejects.toThrow('serialized');
      await expect(dataStore.saveRealmRunRecord({} as never)).rejects.toThrow('serialized');
    });
  });

  describe('getMusicPlaylists / saveMusicPlaylists', () => {
    it('preserves the web/localStorage playlist branch', async () => {
      const playlists: MusicPlaylist[] = [
        { id: 'web-1', name: 'Web playlist', platform: 'local', tracks: [], createdAt: 1 },
      ];

      await dataStore.saveMusicPlaylists(playlists);
      await expect(dataStore.getMusicPlaylists()).resolves.toEqual(playlists);
    });
  });

  // ── Achievements ───────────────────────────────────────────────
  describe('getAchievements / saveAchievements', () => {
    it('returns empty array when no achievements saved', async () => {
      const achievements = await dataStore.getAchievements();
      expect(achievements).toEqual([]);
    });

    it('saves and retrieves achievements', async () => {
      const testAchievements: Achievement[] = [
        {
          id: 'FIRST_TASK',
          name: 'First Step',
          title: 'First Step',
          description: 'Complete your first homework task.',
          icon: TrophyIcon,
          unlocked: true,
          progress: 1,
          goal: 1,
          progressGoal: 1,
          pointsAwarded: 10,
        },
      ];
      await dataStore.saveAchievements(testAchievements);
      const result = await dataStore.getAchievements();
      expect(result).toEqual(testAchievements);
      expect(JSON.parse(memStore.get('achievements') ?? '[]')).toEqual([
        expect.objectContaining({ icon: 'trophy' }),
      ]);
    });
  });

  // ── Rewards ────────────────────────────────────────────────────
  describe('getRewards / saveRewards', () => {
    it('returns empty array when no rewards saved', async () => {
      const rewards = await dataStore.getRewards();
      expect(rewards).toEqual([]);
    });

    it('uses strict storage for a valid catalog and rejects malformed stored data', async () => {
      await dataStore.saveRewards([{ id: 'r1', name: 'TV time', cost: 50 }]);
      await expect(dataStore.getRewards()).resolves.toEqual([
        { id: 'r1', name: 'TV time', cost: 50 },
      ]);
      expect(strictSet).toHaveBeenCalledWith('parentRewards', expect.any(String));
      expect(strictGet).toHaveBeenCalledWith('parentRewards');
      expect(permissiveSet).not.toHaveBeenCalledWith('parentRewards', expect.anything());
      expect(permissiveGet).not.toHaveBeenCalledWith('parentRewards');
      memStore.set('parentRewards', JSON.stringify([{ id: 'r1', name: '', cost: 50 }]));
      await expect(dataStore.getRewards()).rejects.toThrow('Stored reward catalog is malformed');
    });

    it('propagates strict catalog read and write failures without a permissive fallback', async () => {
      strictGet.mockImplementationOnce(() => {
        throw new Error('read failed');
      });
      await expect(dataStore.getRewards()).rejects.toThrow('read failed');
      strictSet.mockImplementationOnce(() => {
        throw new Error('write failed');
      });
      await expect(
        dataStore.saveRewards([{ id: 'r1', name: 'TV time', cost: 50 }]),
      ).rejects.toThrow('write failed');
      expect(permissiveGet).not.toHaveBeenCalledWith('parentRewards');
      expect(permissiveSet).not.toHaveBeenCalledWith('parentRewards', expect.anything());
    });
  });

  // ── Focus Sessions ─────────────────────────────────────────────
  describe('getFocusSessions / saveFocusSession', () => {
    it('returns empty array when no sessions saved', async () => {
      const sessions = await dataStore.getFocusSessions();
      expect(sessions).toEqual([]);
    });

    it('saves a focus session and retrieves it', async () => {
      const session = {
        id: 's1',
        startTime: 1000,
        endTime: 1501000,
        duration: 25,
        points: 50,
        completed: true,
      };
      await dataStore.saveFocusSession(session as unknown as FocusSession);
      const sessions = await dataStore.getFocusSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(1);
    });

    it('upserts one exact Focus record and rejects malformed stored rows without replacement', async () => {
      const first = {
        id: 'focus-1',
        startTime: 1,
        endTime: 60001,
        duration: 1,
        completed: true,
      } as FocusSession;
      const updated = { ...first, endTime: 120001, duration: 2 };
      await dataStore.saveFocusSession(first);
      await dataStore.saveFocusSession(updated);
      await expect(dataStore.getFocusSessions()).resolves.toEqual([updated]);
      memStore.set('focusSessions', JSON.stringify([{ ...first, id: ' bad' }]));
      await expect(dataStore.saveFocusSession(first)).rejects.toThrow('malformed');
    });

    it('rejects malformed new Focus records before strict storage write', async () => {
      await expect(
        dataStore.saveFocusSession({
          id: 'f1',
          startTime: 1,
          endTime: 2,
          duration: 1,
          completed: false,
        }),
      ).rejects.toThrow('malformed');
      await expect(
        dataStore.saveFocusSession({
          id: 1 as never,
          startTime: 1,
          endTime: 2,
          duration: 1,
          completed: true,
        }),
      ).rejects.toThrow('malformed');
      expect(strictSet).not.toHaveBeenCalledWith('focusSessions', expect.anything());
    });

    it('rejects Focus collections beyond the safe cap', async () => {
      memStore.set(
        'focusSessions',
        JSON.stringify(
          Array.from({ length: 501 }, (_, i) => ({
            id: `f-${i}`,
            startTime: i,
            endTime: i + 1,
            duration: 1,
            completed: true,
          })),
        ),
      );
      await expect(dataStore.getFocusSessions()).rejects.toThrow('malformed');
    });

    it('rejects unavailable/malformed Focus storage, write failure, invalid fields, and cap plus one', async () => {
      strictGet.mockImplementationOnce(() => {
        throw new Error('read unavailable');
      });
      await expect(dataStore.getFocusSessions()).rejects.toThrow('read unavailable');
      memStore.set(
        'focusSessions',
        JSON.stringify([{ id: 'bad id', startTime: 1, endTime: 2, duration: 1, completed: true }]),
      );
      await expect(
        dataStore.saveFocusSession({
          id: 'f1',
          startTime: 1,
          endTime: 2,
          duration: 1,
          completed: true,
        }),
      ).rejects.toThrow('malformed');
      for (const row of [
        { id: 'f1', startTime: -1, endTime: 2, duration: 1, completed: true },
        { id: 'f1', startTime: 2, endTime: 1, duration: 1, completed: true },
        { id: 'f1', startTime: 1, endTime: 2, duration: 0, completed: false },
      ]) {
        memStore.set('focusSessions', JSON.stringify([row]));
        await expect(dataStore.getFocusSessions()).rejects.toThrow('malformed');
      }
      memStore.delete('focusSessions');
      strictSet.mockImplementationOnce(() => {
        throw new Error('write unavailable');
      });
      await expect(
        dataStore.saveFocusSession({
          id: 'f1',
          startTime: 1,
          endTime: 2,
          duration: 1,
          completed: true,
        }),
      ).rejects.toThrow('write unavailable');
      await dataStore.saveFocusSession({
        id: 'cap',
        startTime: 1,
        endTime: 2,
        duration: 1,
        completed: true,
      });
    });

    it('rejects malformed or duplicate strict web Focus rows without replacing storage', async () => {
      memStore.set(
        'focusSessions',
        JSON.stringify([
          { id: 'same', startTime: 1, endTime: 2, duration: 1, completed: true },
          { id: 'same', startTime: 1, endTime: 2, duration: 1, completed: true },
        ]),
      );
      await expect(dataStore.getFocusSessions()).rejects.toThrow('malformed');
      expect(strictSet).not.toHaveBeenCalledWith('focusSessions', expect.anything());
    });
  });

  // ── Chat History ───────────────────────────────────────────────
  describe('getChatHistory / saveChatHistory', () => {
    it('returns empty array when no history', async () => {
      const history = await dataStore.getChatHistory('tutor');
      expect(history).toEqual([]);
    });

    it('saves and retrieves tutor chat history', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
      ];
      await dataStore.saveChatHistory('tutor', messages as unknown as ChatMessage[]);
      const result = await dataStore.getChatHistory('tutor');
      expect(result).toHaveLength(2);
    });

    it('keeps tutor and friend histories separate', async () => {
      await dataStore.saveChatHistory('tutor', [
        { role: 'user', content: 'Tutor' },
      ] as unknown as ChatMessage[]);
      await dataStore.saveChatHistory('friend', [
        { role: 'user', content: 'Friend' },
      ] as unknown as ChatMessage[]);

      const tutor = await dataStore.getChatHistory('tutor');
      const friend = await dataStore.getChatHistory('friend');
      expect(tutor).toHaveLength(1);
      expect(friend).toHaveLength(1);
      expect(tutor[0]!.content).toBe('Tutor');
      expect(friend[0]!.content).toBe('Friend');
    });

    it('caps persisted history to the most recent 200 messages', async () => {
      const many = Array.from({ length: 250 }, (_, i) => ({
        role: 'user',
        content: `msg-${i}`,
      })) as unknown as ChatMessage[];
      await dataStore.saveChatHistory('tutor', many);
      const result = await dataStore.getChatHistory('tutor');
      expect(result).toHaveLength(200);
      // Newest retained, oldest dropped.
      expect(result[result.length - 1]!.content).toBe('msg-249');
      expect(result[0]!.content).toBe('msg-50');
    });
  });

  // ── Schedule ───────────────────────────────────────────────────
  describe('getSchedule / saveSchedule', () => {
    it('returns empty array when no schedule', async () => {
      const schedule = await dataStore.getSchedule();
      expect(schedule).toEqual([]);
    });
  });

  // ── Sensory Preferences ────────────────────────────────────────
  describe('getSensoryPreferences / saveSensoryPreferences', () => {
    it('returns null when no preferences saved', async () => {
      const prefs = await dataStore.getSensoryPreferences();
      expect(prefs).toBeNull();
    });

    it('saves and retrieves sensory preferences', async () => {
      const prefs = { reduceMotion: true, highContrast: false, fontSize: 'large' };
      await dataStore.saveSensoryPreferences(prefs as unknown as SensoryPreferences);
      const result = await dataStore.getSensoryPreferences();
      expect(result).toEqual(prefs);
    });
  });
});
