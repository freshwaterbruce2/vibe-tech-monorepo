import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory store that mimics the real appStore behavior (JSON round-trip)
const memStore = new Map<string, string>();

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
    get: (key: string) => {
      const raw = memStore.get(key);
      if (raw === null || raw === undefined) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
    set: (key: string, value: unknown) => {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      memStore.set(key, serialized);
    },
    remove: (key: string) => memStore.delete(key),
    delete: (key: string) => memStore.delete(key),
  },
}));

// Import after mocks
const { dataStore } = await import('../dataStore');

describe('dataStore (web/localStorage path)', () => {
  beforeEach(() => {
    memStore.clear();
  });

  // ── Homework Items ─────────────────────────────────────────────
  describe('getHomeworkItems / saveHomeworkItems', () => {
    it('returns empty array when no items saved', async () => {
      const items = await dataStore.getHomeworkItems();
      expect(items).toEqual([]);
    });

    it('saves and retrieves homework items', async () => {
      const testItems = [
        { id: '1', title: 'Math HW', completed: false },
        { id: '2', title: 'Reading', completed: true },
      ];
      await dataStore.saveHomeworkItems(testItems as any);
      const items = await dataStore.getHomeworkItems();
      expect(items).toHaveLength(2);
      expect(items[0]!.title).toBe('Math HW');
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

  // ── Achievements ───────────────────────────────────────────────
  describe('getAchievements / saveAchievements', () => {
    it('returns empty array when no achievements saved', async () => {
      const achievements = await dataStore.getAchievements();
      expect(achievements).toEqual([]);
    });

    it('saves and retrieves achievements', async () => {
      const testAchievements = [{ id: 'TEST_1', name: 'Test', unlocked: true }];
      await dataStore.saveAchievements(testAchievements as any);
      const result = await dataStore.getAchievements();
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('TEST_1');
    });
  });

  // ── Rewards ────────────────────────────────────────────────────
  describe('getRewards / saveRewards', () => {
    it('returns empty array when no rewards saved', async () => {
      const rewards = await dataStore.getRewards();
      expect(rewards).toEqual([]);
    });
  });

  // ── Focus Sessions ─────────────────────────────────────────────
  describe('getFocusSessions / saveFocusSession', () => {
    it('returns empty array when no sessions saved', async () => {
      const sessions = await dataStore.getFocusSessions();
      expect(sessions).toEqual([]);
    });

    it('saves a focus session and retrieves it', async () => {
      const session = { id: 's1', duration: 25, points: 50, completedAt: Date.now() };
      await dataStore.saveFocusSession(session as any);
      const sessions = await dataStore.getFocusSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(1);
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
      await dataStore.saveChatHistory('tutor', messages as any);
      const result = await dataStore.getChatHistory('tutor');
      expect(result).toHaveLength(2);
    });

    it('keeps tutor and friend histories separate', async () => {
      await dataStore.saveChatHistory('tutor', [{ role: 'user', content: 'Tutor' }] as any);
      await dataStore.saveChatHistory('friend', [{ role: 'user', content: 'Friend' }] as any);

      const tutor = await dataStore.getChatHistory('tutor');
      const friend = await dataStore.getChatHistory('friend');
      expect(tutor).toHaveLength(1);
      expect(friend).toHaveLength(1);
      expect(tutor[0]!.content).toBe('Tutor');
      expect(friend[0]!.content).toBe('Friend');
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
      await dataStore.saveSensoryPreferences(prefs as any);
      const result = await dataStore.getSensoryPreferences();
      expect(result).toEqual(prefs);
    });
  });
});
