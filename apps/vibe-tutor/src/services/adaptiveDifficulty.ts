import { appStore } from '../utils/electronStore';

/**
 * Adaptive Difficulty System for Brain Games
 * Optimized for neurodivergent learners (ADHD/autism)
 *
 * Research-based approach:
 * - Target 70-80% success rate for optimal engagement (flow state)
 * - Gradual difficulty adjustments (not jarring)
 * - Visual feedback on progress
 * - Prevents frustration (too hard) and boredom (too easy)
 */

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface GamePerformance {
  gameType: string;
  difficulty: DifficultyLevel;
  score: number;
  maxScore: number;
  timeSpent: number; // seconds
  hintsUsed: number;
  completedAt: number;
}

export interface DifficultyRecommendation {
  currentDifficulty: DifficultyLevel;
  recommendedDifficulty: DifficultyLevel;
  reason: string;
  confidenceLevel: number; // 0-100
  performanceMetrics: {
    averageScore: number;
    successRate: number;
    recentTrend: 'improving' | 'stable' | 'struggling';
  };
}

const STORAGE_KEY_PREFIX = 'adaptive_difficulty_';
const MIN_GAMES_FOR_ADJUSTMENT = 3; // Need at least 3 games before adjusting
const TARGET_SUCCESS_RATE = 0.75; // 75% success rate (middle of 70-80% range)
const ADJUSTMENT_THRESHOLD = 0.15; // 15% deviation triggers adjustment

/**
 * Save game performance to localStorage
 */
export function saveGamePerformance(performance: GamePerformance): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${performance.gameType}`;
    const existing = getGameHistory(performance.gameType);

    // Keep last 20 games for each game type
    const updated = [...existing, performance].slice(-20);

    appStore.set(key, JSON.stringify(updated));
    console.debug(`[AdaptiveDifficulty] Saved performance for ${performance.gameType}`);
  } catch (error) {
    console.error('[AdaptiveDifficulty] Failed to save performance:', error);
  }
}

/**
 * Get performance history for a specific game
 */
export function getGameHistory(gameType: string): GamePerformance[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${gameType}`;
    const saved = appStore.get<GamePerformance[]>(key);

    if (!saved) return [];

    return saved;
  } catch (error) {
    console.warn('[AdaptiveDifficulty] Failed to load history:', error);
    return [];
  }
}

/**
 * Calculate success rate from performance history
 */
function calculateSuccessRate(performances: GamePerformance[]): number {
  if (performances.length === 0) return 0;

  const successfulGames = performances.filter((p) => {
    const scorePercentage = p.score / p.maxScore;
    return scorePercentage >= 0.6; // 60% or higher is "successful"
  }).length;

  return successfulGames / performances.length;
}

/**
 * Calculate average score percentage
 */
function calculateAverageScore(performances: GamePerformance[]): number {
  if (performances.length === 0) return 0;

  const totalPercentage = performances.reduce((sum, p) => {
    return sum + p.score / p.maxScore;
  }, 0);

  return totalPercentage / performances.length;
}

/**
 * Detect performance trend
 */
function detectTrend(performances: GamePerformance[]): 'improving' | 'stable' | 'struggling' {
  if (performances.length < 3) return 'stable';

  // Compare last 3 games to previous 3 games
  const recent = performances.slice(-3);
  const previous = performances.slice(-6, -3);

  if (previous.length === 0) return 'stable';

  const recentAvg = calculateAverageScore(recent);
  const previousAvg = calculateAverageScore(previous);

  const improvement = recentAvg - previousAvg;

  if (improvement > 0.1) return 'improving'; // 10%+ improvement
  if (improvement < -0.1) return 'struggling'; // 10%+ decline
  return 'stable';
}

/**
 * Get recommended difficulty based on performance
 */
export function getRecommendedDifficulty(
  gameType: string,
  currentDifficulty: DifficultyLevel = 'easy',
): DifficultyRecommendation {
  const history = getGameHistory(gameType);

  // Not enough data - stay at current level
  if (history.length < MIN_GAMES_FOR_ADJUSTMENT) {
    return {
      currentDifficulty,
      recommendedDifficulty: currentDifficulty,
      reason: `Need ${MIN_GAMES_FOR_ADJUSTMENT - history.length} more games before adjusting difficulty`,
      confidenceLevel: 0,
      performanceMetrics: {
        averageScore: calculateAverageScore(history),
        successRate: calculateSuccessRate(history),
        recentTrend: 'stable',
      },
    };
  }

  // Filter history to only include current difficulty level
  const relevantHistory = history.filter((p) => p.difficulty === currentDifficulty);

  if (relevantHistory.length < MIN_GAMES_FOR_ADJUSTMENT) {
    // Not enough games at current difficulty
    return {
      currentDifficulty,
      recommendedDifficulty: currentDifficulty,
      reason: `Need ${MIN_GAMES_FOR_ADJUSTMENT - relevantHistory.length} more games at ${currentDifficulty} level`,
      confidenceLevel: 20,
      performanceMetrics: {
        averageScore: calculateAverageScore(relevantHistory),
        successRate: calculateSuccessRate(relevantHistory),
        recentTrend: detectTrend(relevantHistory),
      },
    };
  }

  const successRate = calculateSuccessRate(relevantHistory);
  const averageScore = calculateAverageScore(relevantHistory);
  const trend = detectTrend(relevantHistory);

  // Calculate deviation from target
  const deviation = successRate - TARGET_SUCCESS_RATE;

  // Determine if adjustment is needed
  let recommendedDifficulty = currentDifficulty;
  let reason = '';
  let confidenceLevel = 50;

  if (Math.abs(deviation) < ADJUSTMENT_THRESHOLD) {
    // Performance is in the sweet spot
    reason = `Great job! You're in the flow zone at ${Math.round(successRate * 100)}% success rate. Keep it up!`;
    confidenceLevel = 90;
  } else if (successRate > TARGET_SUCCESS_RATE + ADJUSTMENT_THRESHOLD) {
    // Too easy - increase difficulty
    if (currentDifficulty === 'easy') {
      recommendedDifficulty = 'medium';
      reason = `You're crushing it! Try medium difficulty to keep challenging yourself.`;
    } else if (currentDifficulty === 'medium') {
      recommendedDifficulty = 'hard';
      reason = `Amazing progress! Ready for hard difficulty?`;
    } else if (currentDifficulty === 'hard') {
      recommendedDifficulty = 'expert';
      reason = `Expert mode unlocked! You're unstoppable!`;
    } else {
      reason = `You're a master! Keep perfecting your skills at expert level.`;
    }
    confidenceLevel = 80;
  } else if (successRate < TARGET_SUCCESS_RATE - ADJUSTMENT_THRESHOLD) {
    // Too hard - decrease difficulty
    if (currentDifficulty === 'expert') {
      recommendedDifficulty = 'hard';
      reason = `Let's dial it back to hard difficulty to rebuild confidence.`;
    } else if (currentDifficulty === 'hard') {
      recommendedDifficulty = 'medium';
      reason = `Medium difficulty will help you practice without frustration.`;
    } else if (currentDifficulty === 'medium') {
      recommendedDifficulty = 'easy';
      reason = `Easy mode is perfect for mastering the basics. No rush!`;
    } else {
      reason = `Keep practicing at easy mode. You're building important skills!`;
    }
    confidenceLevel = 80;
  }

  return {
    currentDifficulty,
    recommendedDifficulty,
    reason,
    confidenceLevel,
    performanceMetrics: {
      averageScore,
      successRate,
      recentTrend: trend,
    },
  };
}

/**
 * Get difficulty level index (for UI progression bars)
 */
export function getDifficultyIndex(difficulty: DifficultyLevel): number {
  const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];
  return levels.indexOf(difficulty);
}

/**
 * Get difficulty color for UI
 */
export function getDifficultyColor(difficulty: DifficultyLevel): string {
  const colors = {
    easy: 'text-fuchsia-400',
    medium: 'text-yellow-400',
    hard: 'text-orange-400',
    expert: 'text-red-400',
  };
  return colors[difficulty];
}

/**
 * Get difficulty badge style
 */
export function getDifficultyBadgeStyle(difficulty: DifficultyLevel): string {
  const styles = {
    easy: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300',
    medium: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
    hard: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
    expert: 'bg-red-500/20 border-red-500/40 text-red-300',
  };
  return styles[difficulty];
}

/**
 * Reset performance history for a game (for testing or user request)
 */
export function resetGameHistory(gameType: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${gameType}`;
    appStore.delete(key);
    console.debug(`[AdaptiveDifficulty] Reset history for ${gameType}`);
  } catch (error) {
    console.error('[AdaptiveDifficulty] Failed to reset history:', error);
  }
}

/**
 * Get all game statistics (for parent dashboard)
 */
export function getAllGameStats(): Record<
  string,
  {
    gamesPlayed: number;
    averageScore: number;
    currentDifficulty: DifficultyLevel;
    trend: 'improving' | 'stable' | 'struggling';
  }
> {
  const gameTypes = ['crossword', 'wordsearch', 'sudoku', 'memory', 'anagrams'];
  const stats: Record<
    string,
    {
      gamesPlayed: number;
      averageScore: number;
      currentDifficulty: DifficultyLevel;
      trend: 'improving' | 'stable' | 'struggling';
    }
  > = {};

  gameTypes.forEach((gameType) => {
    const history = getGameHistory(gameType);

    if (history.length > 0) {
      const lastGame = history[history.length - 1];
      stats[gameType] = {
        gamesPlayed: history.length,
        averageScore: Math.round(calculateAverageScore(history) * 100),
        currentDifficulty: lastGame!.difficulty,
        trend: detectTrend(history),
      };
    }
  });

  return stats;
}
