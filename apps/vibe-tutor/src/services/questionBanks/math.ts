/**
 * Math Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const MATH_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'math-b-1', subject: 'Math', difficulty: 'Beginner', question: 'What is 2 + 2?', correctAnswer: '4', type: 'fill-blank' },
    { id: 'math-b-2', subject: 'Math', difficulty: 'Beginner', question: 'What is 5 - 3?', correctAnswer: '2', type: 'fill-blank' },
    { id: 'math-b-3', subject: 'Math', difficulty: 'Beginner', question: 'What is 3 × 2?', correctAnswer: '6', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'math-i-1', subject: 'Math', difficulty: 'Intermediate', question: 'What is 12 × 11?', correctAnswer: '132', type: 'fill-blank' },
    { id: 'math-i-2', subject: 'Math', difficulty: 'Intermediate', question: 'What is 144 ÷ 12?', correctAnswer: '12', type: 'fill-blank' },
  ],
  Advanced: [
    { id: 'math-a-1', subject: 'Math', difficulty: 'Advanced', question: 'Solve: 2x + 5 = 15. What is x?', correctAnswer: '5', type: 'fill-blank' },
  ],
  Expert: [
    { id: 'math-e-1', subject: 'Math', difficulty: 'Expert', question: 'What is the derivative of x²?', correctAnswer: '2x', type: 'fill-blank' },
  ],
  Master: [
    { id: 'math-m-1', subject: 'Math', difficulty: 'Master', question: 'Integrate: ∫x² dx', correctAnswer: 'x³/3 + C', type: 'fill-blank' },
  ],
} as const;
