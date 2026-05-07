import { getDifficultyDefaults, type GameConfig, type GameDifficulty } from '../settings/gameSettingsConfig';
import { appStore } from '../../utils/electronStore';
import { DEFAULT_STATS, EMPTY_GAME_STATS } from './brainGymConstants';
import type {
  GameDef,
  GamePerformanceStats,
  GameTarget,
  GroupARecommendationConfig,
  HubStats,
} from './brainGymTypes';
import { WORDSEARCH_RECOMMENDATION } from './brainGymTypes';

/* ---------- Persistence ---------- */
export function loadStats(): HubStats {
  try {
    const saved = appStore.get<HubStats>('gamesHub_stats');
    if (saved) return { ...DEFAULT_STATS, ...saved };
  } catch {
    /* use defaults */
  }
  return { ...DEFAULT_STATS };
}

export function saveStats(stats: HubStats): void {
  appStore.set('gamesHub_stats', stats);
}

export function getGameStats(stats: HubStats, gameId: string): GamePerformanceStats {
  return stats.gameStats[gameId] ?? EMPTY_GAME_STATS;
}

/* ---------- Formatting ---------- */
export function formatSeconds(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const mins = globalThis.Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (mins === 0) return `${remainder}s`;
  return `${mins}m ${remainder}s`;
}

export function renderStarString(stars: number): string {
  return `${'★'.repeat(stars)}${'☆'.repeat(globalThis.Math.max(0, 5 - stars))}`;
}

/* ---------- Difficulty recommendation ---------- */
export function getRecommendedDifficulty(performance: GamePerformanceStats): GameDifficulty {
  if (performance.plays === 0) return 'easy';
  if (performance.bestStars >= 4 && performance.plays >= 4) return 'hard';
  if (performance.plays >= 2 && performance.bestStars >= 3) return 'medium';
  if (performance.bestStars >= 2 && performance.plays >= 5) return 'medium';
  return 'easy';
}

export function getRecommendedWordsearchConfig(performance: GamePerformanceStats): Partial<GameConfig> {
  const difficulty = getRecommendedDifficulty(performance);
  const baseConfig = getDifficultyDefaults(difficulty);
  return {
    ...baseConfig,
    ...WORDSEARCH_RECOMMENDATION[difficulty],
    difficulty,
  };
}

export function getLaunchConfigForGroupA(
  gameId: string,
  performance: GamePerformanceStats,
): GroupARecommendationConfig {
  if (gameId === 'memory') {
    return { memoryDifficulty: getRecommendedDifficulty(performance) };
  }
  if (gameId === 'wordsearch') {
    return { wordsearchConfig: getRecommendedWordsearchConfig(performance) };
  }
  return {};
}

/* ---------- Game targets ---------- */
export function roundUpToStep(value: number, step: number): number {
  return globalThis.Math.ceil(value / step) * step;
}

export function createGameTarget(
  game: GameDef,
  performance: GamePerformanceStats,
  todayKey: string,
): GameTarget {
  if (performance.plays === 0) {
    return {
      label: 'First Clear',
      detail: 'Finish one run',
      current: 0,
      goal: 1,
      progressPct: 0,
      valueText: '0/1',
    };
  }

  if (performance.bestStars < 3) {
    return {
      label: 'Mastery',
      detail: 'Reach 3 stars',
      current: performance.bestStars,
      goal: 3,
      progressPct: (performance.bestStars / 3) * 100,
      valueText: `${performance.bestStars}/3 stars`,
    };
  }

  const baselineScore = game.zone === 'challenge' ? 140 : game.zone === 'focus' ? 120 : 100;
  const scoreGoal = globalThis.Math.max(
    baselineScore,
    roundUpToStep(performance.bestScore + 20, 25),
  );
  if (performance.bestScore < scoreGoal) {
    return {
      label: 'Score Push',
      detail: `Hit ${scoreGoal} pts`,
      current: performance.bestScore,
      goal: scoreGoal,
      progressPct: globalThis.Math.min(100, (performance.bestScore / scoreGoal) * 100),
      valueText: `${performance.bestScore}/${scoreGoal}`,
    };
  }

  if (performance.plays < 5) {
    return {
      label: 'Consistency',
      detail: 'Complete 5 runs',
      current: performance.plays,
      goal: 5,
      progressPct: (performance.plays / 5) * 100,
      valueText: `${performance.plays}/5 runs`,
    };
  }

  const playedToday = performance.lastPlayedDate === todayKey ? 1 : 0;
  return {
    label: 'Daily Check-in',
    detail: 'Play this game today',
    current: playedToday,
    goal: 1,
    progressPct: playedToday * 100,
    valueText: playedToday ? 'Done today' : 'Not started',
  };
}

/** Map game IDs to subject names for Group A games */
export const GAME_SUBJECT_MAP: Record<string, string> = {
  memory: 'General',
  wordsearch: 'General',
  anagrams: 'General',
  crossword: 'General',
  sudoku: 'Math',
};

export function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}
