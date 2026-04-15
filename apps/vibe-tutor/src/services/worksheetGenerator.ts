/**
 * Worksheet Generator Service - 2026 Refactored Version
 *
 * Generates interactive worksheets with questions for each subject and difficulty level.
 * Uses Fisher-Yates shuffle for unbiased randomization.
 *
 * @module worksheetGenerator
 * @author VibeTutor Team
 * @since 2026-01-20
 */

import type { DifficultyLevel, SubjectType, WorksheetQuestion } from '../types';
import { QUESTION_BANK } from './questionBanks';
import {
  type WorksheetConfig,
  DEFAULT_WORKSHEET_CONFIG,
  STAR_THRESHOLDS,
  isValidDifficulty,
  isValidSubject,
} from './questionBanks/types';
import { logger } from '../utils/logger';

/**
 * Fisher-Yates (Knuth) shuffle algorithm - O(n) unbiased random shuffle
 * This is the 2026 best practice for array randomization.
 *
 * @param array - Array to shuffle (not mutated)
 * @returns New shuffled array
 */
function fisherYatesShuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Generate a worksheet with random questions from the specified subject and difficulty.
 *
 * @param subject - The subject area (Math, Science, etc.)
 * @param difficulty - The difficulty level (Beginner, Intermediate, etc.)
 * @param config - Optional configuration for question count and shuffling
 * @returns Array of worksheet questions, or empty array if invalid parameters
 *
 * @example
 * ```ts
 * const questions = generateWorksheet('Math', 'Beginner');
 * const customQuestions = generateWorksheet('Science', 'Advanced', { questionCount: 5 });
 * ```
 */
export function generateWorksheet(
  subject: SubjectType,
  difficulty: DifficultyLevel,
  config: Partial<WorksheetConfig> = {},
): WorksheetQuestion[] {
  const { questionCount, shuffle } = { ...DEFAULT_WORKSHEET_CONFIG, ...config };

  // Validate inputs with type guards
  if (!isValidSubject(subject)) {
    logger.error(`[worksheetGenerator] Invalid subject: "${subject}"`);
    return [];
  }

  if (!isValidDifficulty(difficulty)) {
    logger.error(`[worksheetGenerator] Invalid difficulty: "${difficulty}"`);
    return [];
  }

  const subjectBank = QUESTION_BANK[subject];
  const questions = subjectBank?.[difficulty];

  if (!questions || questions.length === 0) {
    logger.error(`[worksheetGenerator] No questions found for ${subject} at ${difficulty} level`);
    return [];
  }

  // Use Fisher-Yates for unbiased shuffle, or return original order
  const orderedQuestions = shuffle ? fisherYatesShuffle(questions) : [...questions];

  // Return requested number of questions
  return orderedQuestions.slice(0, Math.min(questionCount, questions.length));
}

/**
 * Calculate star rating based on score percentage.
 *
 * @param scorePercentage - Score from 0-100
 * @returns Star count from 0-5
 *
 * @example
 * ```ts
 * calculateStars(95) // Returns 5
 * calculateStars(75) // Returns 3
 * calculateStars(40) // Returns 0
 * ```
 */
export function calculateStars(scorePercentage: number): number {
  if (scorePercentage >= STAR_THRESHOLDS.FIVE_STARS) return 5;
  if (scorePercentage >= STAR_THRESHOLDS.FOUR_STARS) return 4;
  if (scorePercentage >= STAR_THRESHOLDS.THREE_STARS) return 3;
  if (scorePercentage >= STAR_THRESHOLDS.TWO_STARS) return 2;
  if (scorePercentage >= STAR_THRESHOLDS.ONE_STAR) return 1;
  return 0;
}

/**
 * Get available question count for a subject/difficulty combination.
 * Useful for displaying available questions before starting.
 *
 * @param subject - The subject area
 * @param difficulty - The difficulty level
 * @returns Number of available questions, or 0 if invalid
 */
export function getAvailableQuestionCount(
  subject: SubjectType,
  difficulty: DifficultyLevel,
): number {
  if (!isValidSubject(subject) || !isValidDifficulty(difficulty)) {
    return 0;
  }
  return QUESTION_BANK[subject]?.[difficulty]?.length ?? 0;
}

/**
 * Check if a subject/difficulty combination has questions available.
 *
 * @param subject - The subject area
 * @param difficulty - The difficulty level
 * @returns True if questions exist for this combination
 */
export function hasQuestions(subject: SubjectType, difficulty: DifficultyLevel): boolean {
  return getAvailableQuestionCount(subject, difficulty) > 0;
}

// Re-export types and constants for consumer convenience
export { DEFAULT_WORKSHEET_CONFIG, STAR_THRESHOLDS } from './questionBanks/types';
export type { WorksheetConfig } from './questionBanks/types';
