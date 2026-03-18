/**
 * Language Arts Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const LANGUAGE_ARTS_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'lang-b-1', subject: 'Language Arts', difficulty: 'Beginner', question: 'A noun is a person, place, or ___.', correctAnswer: 'thing', type: 'fill-blank' },
    { id: 'lang-b-2', subject: 'Language Arts', difficulty: 'Beginner', question: 'A verb is an ___ word.', correctAnswer: 'action', type: 'fill-blank' },
    { id: 'lang-b-3', subject: 'Language Arts', difficulty: 'Beginner', question: 'What comes at the end of a question?', correctAnswer: 1, options: ['Period', 'Question mark', 'Exclamation point', 'Comma'], type: 'multiple-choice' },
    { id: 'lang-b-4', subject: 'Language Arts', difficulty: 'Beginner', question: 'The first letter of a sentence must always be ___.', correctAnswer: 'capitalized', type: 'fill-blank' },
    { id: 'lang-b-5', subject: 'Language Arts', difficulty: 'Beginner', question: 'Is "dog" a noun or a verb?', correctAnswer: 0, options: ['Noun', 'Verb'], type: 'multiple-choice' },
    { id: 'lang-b-6', subject: 'Language Arts', difficulty: 'Beginner', question: 'An adjective describes a ___.', correctAnswer: 'noun', type: 'fill-blank' },
    { id: 'lang-b-7', subject: 'Language Arts', difficulty: 'Beginner', question: 'Words that mean the opposite of each other are called ___.', correctAnswer: 'antonyms', type: 'fill-blank' },
    { id: 'lang-b-8', subject: 'Language Arts', difficulty: 'Beginner', question: 'Which part of a book is the cover?', correctAnswer: 2, options: ['The pages', 'The pictures', 'The outside', 'The index'], type: 'multiple-choice' },
    { id: 'lang-b-9', subject: 'Language Arts', difficulty: 'Beginner', question: 'True or False: "Run" is a verb.', correctAnswer: 0, options: ['True', 'False'], type: 'true-false' },
    { id: 'lang-b-10', subject: 'Language Arts', difficulty: 'Beginner', question: 'A group of sentences about one topic is a ___.', correctAnswer: 'paragraph', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'lang-i-1', subject: 'Language Arts', difficulty: 'Intermediate', question: 'An adjective describes a ___.', correctAnswer: 'noun', type: 'fill-blank' },
    { id: 'lang-i-2', subject: 'Language Arts', difficulty: 'Intermediate', question: 'Words that sound the same but have different meanings are called ___.', correctAnswer: 'homophones', type: 'fill-blank' },
    { id: 'lang-i-3', subject: 'Language Arts', difficulty: 'Intermediate', question: 'What punctuation mark is used to show possession?', correctAnswer: 3, options: ['Comma', 'Period', 'Semicolon', 'Apostrophe'], type: 'multiple-choice' },
    { id: 'lang-i-4', subject: 'Language Arts', difficulty: 'Intermediate', question: 'An adverb often describes a verb and usually ends in ___.', correctAnswer: 'ly', type: 'fill-blank' },
    { id: 'lang-i-5', subject: 'Language Arts', difficulty: 'Intermediate', question: 'What is a word that replaces a noun, like "he" or "she"?', correctAnswer: 'pronoun', type: 'fill-blank' },
    { id: 'lang-i-6', subject: 'Language Arts', difficulty: 'Intermediate', question: 'The main message or lesson of a story is its ___.', correctAnswer: 'theme', type: 'fill-blank' },
    { id: 'lang-i-7', subject: 'Language Arts', difficulty: 'Intermediate', question: 'Which of the following is a conjunction?', correctAnswer: 1, options: ['Quickly', 'And', 'Beautiful', 'Desk'], type: 'multiple-choice' },
    { id: 'lang-i-8', subject: 'Language Arts', difficulty: 'Intermediate', question: 'A story written about a person\'s own life is an ___.', correctAnswer: 'autobiography', type: 'fill-blank' },
    { id: 'lang-i-9', subject: 'Language Arts', difficulty: 'Intermediate', question: 'The time and place a story happens is the ___.', correctAnswer: 'setting', type: 'fill-blank' },
    { id: 'lang-i-10', subject: 'Language Arts', difficulty: 'Intermediate', question: 'Sentences that give a command are called ___.', correctAnswer: 'imperative', type: 'fill-blank' },
  ],
  Advanced: [
    { id: 'lang-a-1', subject: 'Language Arts', difficulty: 'Advanced', question: 'A metaphor is a comparison without using "like" or "as".', correctAnswer: 0, options: ['True', 'False'], type: 'true-false' },
    { id: 'lang-a-2', subject: 'Language Arts', difficulty: 'Advanced', question: 'Giving human qualities to non-human things is called ___.', correctAnswer: 'personification', type: 'fill-blank' },
    { id: 'lang-a-3', subject: 'Language Arts', difficulty: 'Advanced', question: 'What is the literary term for extreme exaggeration?', correctAnswer: 'hyperbole', type: 'fill-blank' },
    { id: 'lang-a-4', subject: 'Language Arts', difficulty: 'Advanced', question: 'A haiku typically has how many syllables in its lines?', correctAnswer: 2, options: ['5, 5, 5', '7, 5, 7', '5, 7, 5', '7, 7, 7'], type: 'multiple-choice' },
    { id: 'lang-a-5', subject: 'Language Arts', difficulty: 'Advanced', question: 'The central struggle between two opposing forces in a story is the ___.', correctAnswer: 'conflict', type: 'fill-blank' },
    { id: 'lang-a-6', subject: 'Language Arts', difficulty: 'Advanced', question: 'What is it called when an author hints at future events in a story?', correctAnswer: 'foreshadowing', type: 'fill-blank' },
    { id: 'lang-a-7', subject: 'Language Arts', difficulty: 'Advanced', question: 'A stanza is a group of lines in a ___.', correctAnswer: 'poem', type: 'fill-blank' },
    { id: 'lang-a-8', subject: 'Language Arts', difficulty: 'Advanced', question: 'Which punctuation mark joins two independent clauses?', correctAnswer: 0, options: ['Semicolon', 'Comma', 'Hyphen', 'Dash'], type: 'multiple-choice' },
    { id: 'lang-a-9', subject: 'Language Arts', difficulty: 'Advanced', question: 'The feeling or atmosphere a writer creates for the reader is the ___.', correctAnswer: 'mood', type: 'fill-blank' },
    { id: 'lang-a-10', subject: 'Language Arts', difficulty: 'Advanced', question: 'Words like "although" and "because" are subordinating ___.', correctAnswer: 'conjunctions', type: 'fill-blank' },
  ],
  Expert: [
    { id: 'lang-e-1', subject: 'Language Arts', difficulty: 'Expert', question: 'Words that sound like what they describe (buzz, hiss) are called?', correctAnswer: 'onomatopoeia', type: 'fill-blank' },
    { id: 'lang-e-2', subject: 'Language Arts', difficulty: 'Expert', question: 'The repetition of the same initial consonant sounds is called ___.', correctAnswer: 'alliteration', type: 'fill-blank' },
    { id: 'lang-e-3', subject: 'Language Arts', difficulty: 'Expert', question: 'A reference to a well-known person, place, or literary work is an ___.', correctAnswer: 'allusion', type: 'fill-blank' },
    { id: 'lang-e-4', subject: 'Language Arts', difficulty: 'Expert', question: 'Which rhetorical device involves placing two contrasting ideas together?', correctAnswer: 1, options: ['Oxymoron', 'Juxtaposition', 'Synecdoche', 'Metonymy'], type: 'multiple-choice' },
    { id: 'lang-e-5', subject: 'Language Arts', difficulty: 'Expert', question: 'The pattern of beats or stresses in spoken or written language is ___.', correctAnswer: 'rhythm', type: 'fill-blank' },
    { id: 'lang-e-6', subject: 'Language Arts', difficulty: 'Expert', question: 'What is the climax of a story?', correctAnswer: 2, options: ['The beginning', 'The resolution', 'The turning point', 'The introduction'], type: 'multiple-choice' },
    { id: 'lang-e-7', subject: 'Language Arts', difficulty: 'Expert', question: 'A figure of speech where a part represents the whole is called ___.', correctAnswer: 'synecdoche', type: 'fill-blank' },
    { id: 'lang-e-8', subject: 'Language Arts', difficulty: 'Expert', question: 'In grammar, a participle that functions as a noun (ending in -ing) is a ___.', correctAnswer: 'gerund', type: 'fill-blank' },
    { id: 'lang-e-9', subject: 'Language Arts', difficulty: 'Expert', question: 'A mild or indirect expression substituted for one considered too harsh is a ___.', correctAnswer: 'euphemism', type: 'fill-blank' },
    { id: 'lang-e-10', subject: 'Language Arts', difficulty: 'Expert', question: 'What is the term for a story within a story?', correctAnswer: 'frame narrative', type: 'fill-blank' },
  ],
  Master: [
    { id: 'lang-m-1', subject: 'Language Arts', difficulty: 'Master', question: 'In active voice, the subject ___ the action.', correctAnswer: 'performs', type: 'fill-blank' },
    { id: 'lang-m-2', subject: 'Language Arts', difficulty: 'Master', question: 'What is the term for the discrepancy between what is expected and what actually happens?', correctAnswer: 0, options: ['Irony', 'Sarcasm', 'Satire', 'Paradox'], type: 'multiple-choice' },
    { id: 'lang-m-3', subject: 'Language Arts', difficulty: 'Master', question: 'A statement that appears contradictory but reveals a hidden truth is a ___.', correctAnswer: 'paradox', type: 'fill-blank' },
    { id: 'lang-m-4', subject: 'Language Arts', difficulty: 'Master', question: 'In poetry, unrhymed iambic pentameter is known as ___ verse.', correctAnswer: 'blank', type: 'fill-blank' },
    { id: 'lang-m-5', subject: 'Language Arts', difficulty: 'Master', question: 'What is the term for the emotional association a word carries?', correctAnswer: 1, options: ['Denotation', 'Connotation', 'Syntax', 'Diction'], type: 'multiple-choice' },
    { id: 'lang-m-6', subject: 'Language Arts', difficulty: 'Master', question: 'A fourteen-line poem, typically written in iambic pentameter, is a ___.', correctAnswer: 'sonnet', type: 'fill-blank' },
    { id: 'lang-m-7', subject: 'Language Arts', difficulty: 'Master', question: 'Who is considered the father of English literature and wrote The Canterbury Tales?', correctAnswer: 'Geoffrey Chaucer', type: 'fill-blank' },
    { id: 'lang-m-8', subject: 'Language Arts', difficulty: 'Master', question: 'The repetition of vowel sounds within non-rhyming words is ___.', correctAnswer: 'assonance', type: 'fill-blank' },
    { id: 'lang-m-9', subject: 'Language Arts', difficulty: 'Master', question: 'What point of view uses "you" and addresses the reader directly?', correctAnswer: 2, options: ['First person', 'Third person limited', 'Second person', 'Third person omniscient'], type: 'multiple-choice' },
    { id: 'lang-m-10', subject: 'Language Arts', difficulty: 'Master', question: 'A play on words based on multiple meanings or similar sounding words is a ___.', correctAnswer: 'pun', type: 'fill-blank' },
  ],
} as const;
