import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubjectType, WorksheetSession } from '../../types';

// In-memory settings store for persistence across calls
const settingsStore = new Map<string, string>();

// Mock dataStore with persistent getUserSettings/saveUserSettings
vi.mock('../dataStore', () => ({
  dataStore: {
    getUserSettings: vi.fn(async (key: string) => settingsStore.get(key) ?? ''),
    saveUserSettings: vi.fn(async (key: string, value: string) => {
      settingsStore.set(key, value);
    }),
  },
}));

// Import after mocks
const {
  loadProgress,
  saveProgress,
  getSubjectProgress,
  recordWorksheetCompletion,
  getNextDifficulty,
  getProgressToNextLevel,
  resetSubjectProgress,
  getTotalStars,
  getTotalWorksheetsCompleted,
  completeWorksheet,
} = await import('../progressionService');

function makeSession(overrides: Partial<WorksheetSession> = {}): WorksheetSession {
  return {
    subject: 'Math' as SubjectType,
    difficulty: 'Beginner',
    score: 80,
    starsEarned: 3,
    completedAt: Date.now(),
    questions: [],
    ...overrides,
  } as WorksheetSession;
}

describe('progressionService', () => {
  beforeEach(() => {
    settingsStore.clear();
  });

  // ── loadProgress ────────────────────────────────────────────────
  describe('loadProgress', () => {
    it('returns default progress when no saved data', async () => {
      const progress = await loadProgress();

      expect(progress.Math).toBeDefined();
      expect(progress.Science).toBeDefined();
      expect(progress.History).toBeDefined();
      expect(progress.Bible).toBeDefined();
      expect(progress['Language Arts']).toBeDefined();

      expect(progress.Math.currentDifficulty).toBe('Beginner');
      expect(progress.Math.starsCollected).toBe(0);
      expect(progress.Math.totalWorksheetsCompleted).toBe(0);
    });

    it('merges saved data with defaults', async () => {
      const saved = { Math: { starsCollected: 3, currentDifficulty: 'Intermediate' } };
      settingsStore.set('subject-progress', JSON.stringify(saved));

      const progress = await loadProgress();
      expect(progress.Math.starsCollected).toBe(3);
      expect(progress.Math.currentDifficulty).toBe('Intermediate');
      // Other subjects still have defaults
      expect(progress.Science).toBeDefined();
      expect(progress.Science.currentDifficulty).toBe('Beginner');
    });

    it('handles parse errors gracefully', async () => {
      settingsStore.set('subject-progress', '{{invalid json}}');
      const progress = await loadProgress();
      // Falls back to defaults
      expect(progress.Math.currentDifficulty).toBe('Beginner');
    });
  });

  // ── saveProgress ────────────────────────────────────────────────
  describe('saveProgress', () => {
    it('persists progress that can be reloaded', async () => {
      const progress = await loadProgress();
      progress.Math.starsCollected = 4;
      await saveProgress(progress);

      const reloaded = await loadProgress();
      expect(reloaded.Math.starsCollected).toBe(4);
    });
  });

  // ── recordWorksheetCompletion ──────────────────────────────────
  describe('recordWorksheetCompletion', () => {
    it('increments worksheets completed', async () => {
      const result = await recordWorksheetCompletion('Math', makeSession());
      expect(result.progress.totalWorksheetsCompleted).toBe(1);
    });

    it('adds stars earned', async () => {
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 4 }));
      expect(result.starsEarned).toBe(4);
      expect(result.progress.starsCollected).toBe(4);
    });

    it('accumulates across multiple calls', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));
      expect(result.progress.totalWorksheetsCompleted).toBe(2);
      expect(result.progress.starsCollected).toBe(4);
    });

    it('triggers level-up when stars reach threshold (5)', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 4 }));
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));

      expect(result.leveledUp).toBe(true);
      expect(result.newDifficulty).toBe('Intermediate');
      expect(result.progress.starsCollected).toBe(0); // Reset after level-up
    });

    it('increments streak for 3+ stars', async () => {
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 3 }));
      expect(result.progress.currentStreak).toBe(1);
    });

    it('resets streak for fewer than 3 stars', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 4 }));
      const result = await recordWorksheetCompletion('Math', makeSession({ starsEarned: 1 }));
      expect(result.progress.currentStreak).toBe(0);
    });

    it('caps history at 50 sessions', async () => {
      for (let i = 0; i < 55; i++) {
        await recordWorksheetCompletion('Math', makeSession({ starsEarned: 0 }));
      }
      const progress = await getSubjectProgress('Math');
      expect(progress.history.length).toBeLessThanOrEqual(50);
    });
  });

  // ── getNextDifficulty ──────────────────────────────────────────
  describe('getNextDifficulty', () => {
    it('returns next difficulty in order', () => {
      expect(getNextDifficulty('Beginner')).toBe('Intermediate');
      expect(getNextDifficulty('Intermediate')).toBe('Advanced');
      expect(getNextDifficulty('Advanced')).toBe('Expert');
      expect(getNextDifficulty('Expert')).toBe('Master');
    });

    it('returns null at max difficulty', () => {
      expect(getNextDifficulty('Master')).toBeNull();
    });
  });

  // ── getProgressToNextLevel ─────────────────────────────────────
  describe('getProgressToNextLevel', () => {
    it('returns 0 when no progress', async () => {
      const ratio = await getProgressToNextLevel('Math');
      expect(ratio).toBe(0);
    });

    it('returns fraction after earning some stars', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));
      const ratio = await getProgressToNextLevel('Math');
      expect(ratio).toBeCloseTo(0.4); // 2/5
    });
  });

  // ── resetSubjectProgress ───────────────────────────────────────
  describe('resetSubjectProgress', () => {
    it('resets a subject to default state', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 3 }));
      await resetSubjectProgress('Math');

      const progress = await getSubjectProgress('Math');
      expect(progress.totalWorksheetsCompleted).toBe(0);
      expect(progress.starsCollected).toBe(0);
    });
  });

  // ── getTotalStars ──────────────────────────────────────────────
  describe('getTotalStars', () => {
    it('sums stars from all session histories', async () => {
      await recordWorksheetCompletion('Math', makeSession({ starsEarned: 2 }));
      await recordWorksheetCompletion('Science', makeSession({ subject: 'Science' as SubjectType, starsEarned: 3 }));

      const total = await getTotalStars();
      expect(total).toBe(5);
    });
  });

  // ── getTotalWorksheetsCompleted ────────────────────────────────
  describe('getTotalWorksheetsCompleted', () => {
    it('sums worksheets across all subjects', async () => {
      await recordWorksheetCompletion('Math', makeSession());
      await recordWorksheetCompletion('Math', makeSession());

      const total = await getTotalWorksheetsCompleted();
      expect(total).toBe(2);
    });
  });

  // ── completeWorksheet ──────────────────────────────────────────
  describe('completeWorksheet', () => {
    it('returns starsToNextLevel', async () => {
      const result = await completeWorksheet(makeSession({ starsEarned: 2 }));
      expect(result.starsToNextLevel).toBe(3); // 5 - 2
      expect(result.leveledUp).toBe(false);
    });
  });
});
