/**
 * Language Arts Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const LANGUAGE_ARTS_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'lang-b-1', subject: 'Language Arts', difficulty: 'Beginner', question: 'A noun is a person, place, or ___.', correctAnswer: 'thing', type: 'fill-blank' },
    { id: 'lang-b-2', subject: 'Language Arts', difficulty: 'Beginner', question: 'A verb is an ___ word.', correctAnswer: 'action', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'lang-i-1', subject: 'Language Arts', difficulty: 'Intermediate', question: 'An adjective describes a ___.', correctAnswer: 'noun', type: 'fill-blank' },
  ],
  Advanced: [
    { id: 'lang-a-1', subject: 'Language Arts', difficulty: 'Advanced', question: 'A metaphor is a comparison without using "like" or "as".', correctAnswer: 0, options: ['True', 'False'], type: 'true-false' },
  ],
  Expert: [
    { id: 'lang-e-1', subject: 'Language Arts', difficulty: 'Expert', question: 'Words that sound like what they describe (buzz, hiss) are called?', correctAnswer: 'onomatopoeia', type: 'fill-blank' },
  ],
  Master: [
    { id: 'lang-m-1', subject: 'Language Arts', difficulty: 'Master', question: 'In active voice, the subject ___ the action.', correctAnswer: 'performs', type: 'fill-blank' },
  ],
} as const;
