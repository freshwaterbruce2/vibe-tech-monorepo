import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dataStore BEFORE importing achievementService (it auto-loads on import)
vi.mock('../dataStore', () => ({
  dataStore: {
    getAchievements: vi.fn().mockResolvedValue([]),
    saveAchievements: vi.fn().mockResolvedValue(undefined),
    getUserSettings: vi.fn().mockResolvedValue(null),
    saveUserSettings: vi.fn().mockResolvedValue(undefined),
    getFocusSessions: vi.fn().mockResolvedValue([]),
  },
}));

// Mock icon components (they import React)
vi.mock('../../components/ui/icons/FlameIcon', () => ({
  FlameIcon: () => null,
}));
vi.mock('../../components/ui/icons/TrophyIcon', () => ({
  TrophyIcon: () => null,
}));

const { dataStore } = await import('../dataStore');

// Import after mocks
const { getAchievements, checkAndUnlockAchievements, ACHIEVEMENT_POINTS } =
  await import('../achievementService');

describe('achievementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dataStore.getAchievements).mockResolvedValue([]);
    vi.mocked(dataStore.getUserSettings).mockResolvedValue(null as any);
    vi.mocked(dataStore.saveUserSettings).mockResolvedValue(undefined);
    vi.mocked(dataStore.saveAchievements).mockResolvedValue(undefined);
    vi.mocked(dataStore.getFocusSessions).mockResolvedValue([]);
  });

  // ── ACHIEVEMENT_POINTS ─────────────────────────────────────────
  describe('ACHIEVEMENT_POINTS', () => {
    it('has bonus points defined for key achievements', () => {
      expect(ACHIEVEMENT_POINTS.FIRST_TASK).toBe(25);
      expect(ACHIEVEMENT_POINTS.FIVE_TASKS).toBe(50);
      expect(ACHIEVEMENT_POINTS.TEN_TASKS).toBe(100);
      expect(ACHIEVEMENT_POINTS.STREAK_MASTER).toBe(150);
      expect(ACHIEVEMENT_POINTS.FIRST_FOCUS).toBe(25);
    });
  });

  // ── getAchievements ────────────────────────────────────────────
  describe('getAchievements', () => {
    it('returns achievements with enriched progress', async () => {
      vi.mocked(dataStore.getUserSettings).mockImplementation(async (key: string) => {
        if (key === 'homeworkStats') return JSON.stringify({ completedTasks: 3 });
        if (key === 'focusStats') return JSON.stringify({ completedSessions: 2, totalMinutes: 45 });
        return null as any;
      });

      const achievements = await getAchievements();

      expect(achievements.length).toBeGreaterThan(0);
      // Check that task-based achievements have progress
      const firstTask = achievements.find((a) => a.id === 'FIRST_TASK');
      expect(firstTask).toBeDefined();
    });

    it('handles missing stats gracefully', async () => {
      const achievements = await getAchievements();
      expect(achievements.length).toBeGreaterThan(0);
    });
  });

  // ── checkAndUnlockAchievements ──────────────────────────────────
  describe('checkAndUnlockAchievements', () => {
    it('unlocks FIRST_TASK on first task completion', async () => {
      const result = await checkAndUnlockAchievements({ type: 'TASK_COMPLETED' });

      expect(result.newlyUnlocked.length).toBeGreaterThanOrEqual(1);
      const firstTask = result.newlyUnlocked.find((a) => a.id === 'FIRST_TASK');
      expect(firstTask).toBeDefined();
      expect(result.totalBonusPoints).toBeGreaterThanOrEqual(ACHIEVEMENT_POINTS.FIRST_TASK!);
    });

    it('saves updated homework stats to dataStore', async () => {
      await checkAndUnlockAchievements({ type: 'TASK_COMPLETED' });

      expect(dataStore.saveUserSettings).toHaveBeenCalledWith(
        'homeworkStats',
        expect.stringContaining('"completedTasks":1'),
      );
    });

    it('handles FOCUS_SESSION_COMPLETED events', async () => {
      const result = await checkAndUnlockAchievements({
        type: 'FOCUS_SESSION_COMPLETED',
        payload: { duration: 10 },
      });

      const firstFocus = result.newlyUnlocked.find((a) => a.id === 'FIRST_FOCUS');
      expect(firstFocus).toBeDefined();
      expect(dataStore.saveUserSettings).toHaveBeenCalledWith('focusStats', expect.any(String));
    });

    it('does not re-unlock already unlocked achievements', async () => {
      // First unlock
      await checkAndUnlockAchievements({ type: 'TASK_COMPLETED' });
      // Second call — FIRST_TASK should not be unlocked again
      const result = await checkAndUnlockAchievements({ type: 'TASK_COMPLETED' });

      const firstTasks = result.newlyUnlocked.filter((a) => a.id === 'FIRST_TASK');
      expect(firstTasks).toHaveLength(0);
    });

    it('saves achievements after checking', async () => {
      await checkAndUnlockAchievements({ type: 'TASK_COMPLETED' });
      expect(dataStore.saveAchievements).toHaveBeenCalled();
    });

    it('handles HOMEWORK_UPDATE with streak calculation', async () => {
      const today = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const items = [
        { id: '1', completed: true, completedDate: today },
        { id: '2', completed: true, completedDate: today - oneDay },
        { id: '3', completed: true, completedDate: today - 2 * oneDay },
      ] as any[];

      const result = await checkAndUnlockAchievements({
        type: 'HOMEWORK_UPDATE',
        payload: { items },
      });

      // Should check streak (3 consecutive days → STREAK_MASTER)
      const streakMaster = result.newlyUnlocked.find((a) => a.id === 'STREAK_MASTER');
      expect(streakMaster).toBeDefined();
    });

    it('returns total bonus points for all newly unlocked', async () => {
      // Complete enough tasks to unlock FIRST_TASK
      const result = await checkAndUnlockAchievements({ type: 'TASK_COMPLETED' });
      expect(result.totalBonusPoints).toBe(
        result.newlyUnlocked.reduce((sum, a) => sum + (ACHIEVEMENT_POINTS[a.id] ?? 0), 0),
      );
    });
  });
});
