/**
 * History Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const HISTORY_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'hist-b-1', subject: 'History', difficulty: 'Beginner', question: 'Who was the first President of the United States?', correctAnswer: 'George Washington', type: 'fill-blank' },
    { id: 'hist-b-2', subject: 'History', difficulty: 'Beginner', question: 'The USA declared independence in what year?', correctAnswer: '1776', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'hist-i-1', subject: 'History', difficulty: 'Intermediate', question: 'The Civil War was primarily fought over slavery.', correctAnswer: 0, options: ['True', 'False'], type: 'true-false' },
  ],
  Advanced: [
    { id: 'hist-a-1', subject: 'History', difficulty: 'Advanced', question: 'Who wrote the Declaration of Independence?', correctAnswer: 'Thomas Jefferson', type: 'fill-blank' },
  ],
  Expert: [
    { id: 'hist-e-1', subject: 'History', difficulty: 'Expert', question: 'The Magna Carta limited the power of the ___.', correctAnswer: 'king', type: 'fill-blank' },
  ],
  Master: [
    { id: 'hist-m-1', subject: 'History', difficulty: 'Master', question: 'Which of these was NOT a cause of World War I?', correctAnswer: 3, options: ['Militarism', 'Alliances', 'Nationalism', 'The Internet'], type: 'multiple-choice' },
  ],
} as const;
