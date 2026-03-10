/**
 * Bible Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const BIBLE_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'bible-b-1', subject: 'Bible', difficulty: 'Beginner', question: 'Who built the ark?', correctAnswer: 'Noah', type: 'fill-blank' },
    { id: 'bible-b-2', subject: 'Bible', difficulty: 'Beginner', question: 'God created the world in how many days?', correctAnswer: '6', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'bible-i-1', subject: 'Bible', difficulty: 'Intermediate', question: 'Who defeated Goliath?', correctAnswer: 'David', type: 'fill-blank' },
  ],
  Advanced: [
    { id: 'bible-a-1', subject: 'Bible', difficulty: 'Advanced', question: 'The Ten Commandments were given to ___.', correctAnswer: 'Moses', type: 'fill-blank' },
  ],
  Expert: [
    { id: 'bible-e-1', subject: 'Bible', difficulty: 'Expert', question: 'Which is NOT one of the 4 Gospels?', correctAnswer: 3, options: ['Matthew', 'Mark', 'Luke', 'Acts'], type: 'multiple-choice' },
  ],
  Master: [
    { id: 'bible-m-1', subject: 'Bible', difficulty: 'Master', question: 'The Beatitudes come from Jesus\' Sermon on the ___.', correctAnswer: 'Mount', type: 'fill-blank' },
  ],
} as const;
