/**
 * Question Bank Registry - Central Export
 * 
 * Aggregates all subject question banks into a single type-safe registry.
 * Each subject has its own file to maintain the 360-line limit.
 */

import type { QuestionBankRegistry } from './types';
import { MATH_QUESTIONS } from './math';
import { SCIENCE_QUESTIONS } from './science';
import { HISTORY_QUESTIONS } from './history';
import { BIBLE_QUESTIONS } from './bible';
import { LANGUAGE_ARTS_QUESTIONS } from './languageArts';

/**
 * Complete question bank registry.
 * Type-checked at compile time using QuestionBankRegistry type.
 */
export const QUESTION_BANK: QuestionBankRegistry = {
  'Math': MATH_QUESTIONS,
  'Science': SCIENCE_QUESTIONS,
  'History': HISTORY_QUESTIONS,
  'Bible': BIBLE_QUESTIONS,
  'Language Arts': LANGUAGE_ARTS_QUESTIONS,
} as const;

// Re-export individual banks for direct access if needed
export {
  MATH_QUESTIONS,
  SCIENCE_QUESTIONS,
  HISTORY_QUESTIONS,
  BIBLE_QUESTIONS,
  LANGUAGE_ARTS_QUESTIONS,
};

// Re-export types
export * from './types';
