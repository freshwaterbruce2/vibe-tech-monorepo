/**
 * Question Bank Types - 2026 Best Practices
 * Type-safe definitions for worksheet questions
 */

import type { WorksheetQuestion } from '../../types';

/** Supported subjects as const tuple for type safety */
export const SUBJECTS = ['Math', 'Science', 'History', 'Bible', 'Language Arts'] as const;

/** Supported difficulty levels as const tuple */
export const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Master'] as const;

/** Type-safe subject type derived from const */
export type Subject = (typeof SUBJECTS)[number];

/** Type-safe difficulty derived from const */
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

/** Question bank structure for a single subject */
export type SubjectQuestionBank = Record<Difficulty, readonly WorksheetQuestion[]>;

/** Complete question bank mapping all subjects */
export type QuestionBankRegistry = Record<Subject, SubjectQuestionBank>;

/** Configuration for worksheet generation */
export interface WorksheetConfig {
  /** Number of questions to include (default: 10) */
  questionCount: number;
  /** Whether to shuffle questions (default: true) */
  shuffle: boolean;
}

/** Default worksheet configuration */
export const DEFAULT_WORKSHEET_CONFIG: WorksheetConfig = {
  questionCount: 10,
  shuffle: true,
} as const;

/** Star rating thresholds */
export const STAR_THRESHOLDS = {
  FIVE_STARS: 90,
  FOUR_STARS: 80,
  THREE_STARS: 70,
  TWO_STARS: 60,
  ONE_STAR: 50,
} as const;

/**
 * Type guard to check if a string is a valid subject
 */
export function isValidSubject(subject: string): subject is Subject {
  return SUBJECTS.includes(subject as Subject);
}

/**
 * Type guard to check if a string is a valid difficulty level
 */
export function isValidDifficulty(difficulty: string): difficulty is Difficulty {
  return DIFFICULTY_LEVELS.includes(difficulty as Difficulty);
}
