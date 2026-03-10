import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory store for appStore mock — stores raw strings like real localStorage
const memStore = new Map<string, string>();

// Mock electronInit to avoid window.electronAPI dependency
vi.mock('../../utils/electronInit', () => ({
  initElectronAPI: vi.fn(),
  isRealElectron: () => false,
}));

// Mock appStore to match electronStore semantics:
// - set: stores serialized values (strings as-is, objects stringified)
// - get: returns parsed JSON when possible, raw string otherwise
vi.mock('../../utils/electronStore', () => ({
  appStore: {
    get: (key: string) => {
      const raw = memStore.get(key);
      if (raw === undefined || raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    },
    set: (_key: string, value: unknown) => {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      memStore.set(_key, serialized);
    },
    delete: (key: string) => memStore.delete(key),
  },
}));

const {
  saveGamePerformance,
  getGameHistory,
  getRecommendedDifficulty,
  getDifficultyIndex,
  getDifficultyColor,
  resetGameHistory,
  getAllGameStats,
} = await import('../adaptiveDifficulty');

type GamePerformance = Parameters<typeof saveGamePerformance>[0];

function makePerf(overrides: Partial<GamePerformance> = {}): GamePerformance {
  return {
    gameType: 'memory',
    difficulty: 'easy',
    score: 8,
    maxScore: 10,
    timeSpent: 30,
    hintsUsed: 0,
    completedAt: Date.now(),
    ...overrides,
  } as GamePerformance;
}

describe('adaptiveDifficulty', () => {
  beforeEach(() => {
    memStore.clear();
  });

  // ── saveGamePerformance + getGameHistory ─────────────────────────
  describe('saveGamePerformance + getGameHistory', () => {
    it('saves and retrieves game performance', () => {
      saveGamePerformance(makePerf());
      const history = getGameHistory('memory');
      expect(history).toHaveLength(1);
      expect(history[0]!.gameType).toBe('memory');
    });

    it('accumulates multiple performances', () => {
      saveGamePerformance(makePerf({ score: 5 }));
      saveGamePerformance(makePerf({ score: 8 }));
      expect(getGameHistory('memory')).toHaveLength(2);
    });

    it('keeps per-gameType histories separate', () => {
      saveGamePerformance(makePerf({ gameType: 'memory' }));
      saveGamePerformance(makePerf({ gameType: 'anagram' }));
      expect(getGameHistory('memory')).toHaveLength(1);
      expect(getGameHistory('anagram')).toHaveLength(1);
    });

    it('caps history at 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        saveGamePerformance(makePerf());
      }
      expect(getGameHistory('memory')).toHaveLength(20);
    });

    it('returns empty for unknown game type', () => {
      expect(getGameHistory('unknown')).toEqual([]);
    });
  });

  // ── getRecommendedDifficulty ────────────────────────────────────
  describe('getRecommendedDifficulty', () => {
    it('returns insufficient data when fewer than 3 games', () => {
      saveGamePerformance(makePerf());
      const rec = getRecommendedDifficulty('memory', 'easy');
      expect(rec.confidenceLevel).toBe(0);
      expect(rec.recommendedDifficulty).toBe('easy');
      expect(rec.reason).toContain('more game');
    });

    it('recommends staying when in sweet spot (70-80%)', () => {
      // successRate is binary: score/maxScore >= 0.6 counts as "success"
      // 3 passes (70%) + 1 fail (50%) = 3/4 = 0.75 success rate → sweet spot
      saveGamePerformance(makePerf({ score: 7, maxScore: 10, difficulty: 'easy' }));
      saveGamePerformance(makePerf({ score: 7, maxScore: 10, difficulty: 'easy' }));
      saveGamePerformance(makePerf({ score: 7, maxScore: 10, difficulty: 'easy' }));
      saveGamePerformance(makePerf({ score: 5, maxScore: 10, difficulty: 'easy' }));
      const rec = getRecommendedDifficulty('memory', 'easy');
      expect(rec.recommendedDifficulty).toBe('easy');
      expect(rec.confidenceLevel).toBe(90);
      expect(rec.reason).toContain('flow zone');
    });

    it('recommends increase when success rate > 90%', () => {
      for (let i = 0; i < 4; i++) {
        saveGamePerformance(makePerf({ score: 10, maxScore: 10, difficulty: 'easy' }));
      }
      const rec = getRecommendedDifficulty('memory', 'easy');
      expect(rec.recommendedDifficulty).toBe('medium');
      expect(rec.confidenceLevel).toBe(80);
    });

    it('recommends decrease when success rate < 60%', () => {
      for (let i = 0; i < 4; i++) {
        saveGamePerformance(makePerf({ score: 4, maxScore: 10, difficulty: 'medium' }));
      }
      const rec = getRecommendedDifficulty('memory', 'medium');
      expect(rec.recommendedDifficulty).toBe('easy');
    });

    it('caps at expert and stays', () => {
      for (let i = 0; i < 4; i++) {
        saveGamePerformance(makePerf({ score: 10, maxScore: 10, difficulty: 'expert' }));
      }
      const rec = getRecommendedDifficulty('memory', 'expert');
      expect(rec.recommendedDifficulty).toBe('expert');
      expect(rec.reason).toContain('master');
    });
  });

  // ── getDifficultyIndex ──────────────────────────────────────────
  describe('getDifficultyIndex', () => {
    it('returns indices for all levels', () => {
      expect(getDifficultyIndex('easy')).toBe(0);
      expect(getDifficultyIndex('medium')).toBe(1);
      expect(getDifficultyIndex('hard')).toBe(2);
      expect(getDifficultyIndex('expert')).toBe(3);
    });
  });

  // ── getDifficultyColor ──────────────────────────────────────────
  describe('getDifficultyColor', () => {
    it('returns different colors per level', () => {
      const easy = getDifficultyColor('easy');
      const expert = getDifficultyColor('expert');
      expect(easy).toBeTruthy();
      expect(expert).toBeTruthy();
      expect(easy).not.toBe(expert);
    });
  });

  // ── resetGameHistory ────────────────────────────────────────────
  describe('resetGameHistory', () => {
    it('clears history for a specific game', () => {
      saveGamePerformance(makePerf({ gameType: 'memory' }));
      saveGamePerformance(makePerf({ gameType: 'anagram' }));

      resetGameHistory('memory');

      expect(getGameHistory('memory')).toHaveLength(0);
      expect(getGameHistory('anagram')).toHaveLength(1);
    });
  });

  // ── getAllGameStats ──────────────────────────────────────────────
  describe('getAllGameStats', () => {
    it('returns stats for games that have history', () => {
      saveGamePerformance(makePerf({ gameType: 'memory', score: 8, maxScore: 10 }));
      saveGamePerformance(makePerf({ gameType: 'memory', score: 9, maxScore: 10 }));

      const stats = getAllGameStats();
      expect(stats.memory).toBeDefined();
      expect(stats.memory!.gamesPlayed).toBe(2);
      expect(stats.memory!.averageScore).toBeGreaterThan(0);
    });

    it('returns empty object when no history', () => {
      const stats = getAllGameStats();
      expect(Object.keys(stats)).toHaveLength(0);
    });
  });
});
