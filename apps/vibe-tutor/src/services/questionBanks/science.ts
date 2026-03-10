/**
 * Science Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const SCIENCE_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'sci-b-1', subject: 'Science', difficulty: 'Beginner', question: 'What planet do we live on?', correctAnswer: 'Earth', type: 'fill-blank' },
    { id: 'sci-b-2', subject: 'Science', difficulty: 'Beginner', question: 'Plants need sunlight, water, and ___ to grow.', correctAnswer: 'soil', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'sci-i-1', subject: 'Science', difficulty: 'Intermediate', question: 'The process plants use to convert sunlight into food is called?', correctAnswer: 'photosynthesis', type: 'fill-blank' },
  ],
  Advanced: [
    { id: 'sci-a-1', subject: 'Science', difficulty: 'Advanced', question: 'What is the chemical formula for water?', correctAnswer: 'H2O', type: 'fill-blank' },
  ],
  Expert: [
    { id: 'sci-e-1', subject: 'Science', difficulty: 'Expert', question: 'Mitochondria is often called the ___ of the cell.', correctAnswer: 'powerhouse', type: 'fill-blank' },
  ],
  Master: [
    { id: 'sci-m-1', subject: 'Science', difficulty: 'Master', question: 'E=mc² shows that mass and ___ are equivalent.', correctAnswer: 'energy', type: 'fill-blank' },
  ],
} as const;
