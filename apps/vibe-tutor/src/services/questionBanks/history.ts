/**
 * History Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const HISTORY_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'hist-b-1', subject: 'History', difficulty: 'Beginner', question: 'Who was the first President of the United States?', correctAnswer: 'George Washington', type: 'fill-blank' },
    { id: 'hist-b-2', subject: 'History', difficulty: 'Beginner', question: 'The USA declared independence in what year?', correctAnswer: '1776', type: 'fill-blank' },
    { id: 'hist-b-3', subject: 'History', difficulty: 'Beginner', question: 'What country did the USA declare its independence from?', correctAnswer: 2, options: ['France', 'Spain', 'Great Britain', 'Germany'], type: 'multiple-choice' },
    { id: 'hist-b-4', subject: 'History', difficulty: 'Beginner', question: 'Who was known as "Honest Abe"?', correctAnswer: 'Abraham Lincoln', type: 'fill-blank' },
    { id: 'hist-b-5', subject: 'History', difficulty: 'Beginner', question: 'The first people to live in North America were Native Americans.', correctAnswer: 0, options: ['True', 'False'], type: 'true-false' },
    { id: 'hist-b-6', subject: 'History', difficulty: 'Beginner', question: 'What colors are on the American flag?', correctAnswer: 1, options: ['Red, White, Green', 'Red, White, Blue', 'Blue, Yellow, Red', 'Black, White, Red'], type: 'multiple-choice' },
    { id: 'hist-b-7', subject: 'History', difficulty: 'Beginner', question: 'Who is the current King of England?', correctAnswer: 'Charles', type: 'fill-blank' },
    { id: 'hist-b-8', subject: 'History', difficulty: 'Beginner', question: 'The 50 stars on the American flag represent the 50 ___.', correctAnswer: 'states', type: 'fill-blank' },
    { id: 'hist-b-9', subject: 'History', difficulty: 'Beginner', question: 'Where does the US President live?', correctAnswer: 'White House', type: 'fill-blank' },
    { id: 'hist-b-10', subject: 'History', difficulty: 'Beginner', question: 'The ancient Egyptians built large structures called ___.', correctAnswer: 'pyramids', type: 'fill-blank' },
  ],
  Intermediate: [
    { id: 'hist-i-1', subject: 'History', difficulty: 'Intermediate', question: 'The Civil War was primarily fought over slavery.', correctAnswer: 0, options: ['True', 'False'], type: 'true-false' },
    { id: 'hist-i-2', subject: 'History', difficulty: 'Intermediate', question: 'Who was the 16th President of the United States?', correctAnswer: 'Abraham Lincoln', type: 'fill-blank' },
    { id: 'hist-i-3', subject: 'History', difficulty: 'Intermediate', question: 'In what year did World War II end?', correctAnswer: '1945', type: 'fill-blank' },
    { id: 'hist-i-4', subject: 'History', difficulty: 'Intermediate', question: 'Who was the leader of the Civil Rights Movement in the US?', correctAnswer: 1, options: ['Malcolm X', 'Martin Luther King Jr.', 'Rosa Parks', 'John F. Kennedy'], type: 'multiple-choice' },
    { id: 'hist-i-5', subject: 'History', difficulty: 'Intermediate', question: 'What ancient civilization built the Colosseum?', correctAnswer: 'Romans', type: 'fill-blank' },
    { id: 'hist-i-6', subject: 'History', difficulty: 'Intermediate', question: 'Who discovered penicillin?', correctAnswer: 3, options: ['Marie Curie', 'Albert Einstein', 'Isaac Newton', 'Alexander Fleming'], type: 'multiple-choice' },
    { id: 'hist-i-7', subject: 'History', difficulty: 'Intermediate', question: 'The Cold War was mainly between the US and the ___.', correctAnswer: 'Soviet Union', type: 'fill-blank' },
    { id: 'hist-i-8', subject: 'History', difficulty: 'Intermediate', question: 'What ship sank on its maiden voyage in 1912?', correctAnswer: 'Titanic', type: 'fill-blank' },
    { id: 'hist-i-9', subject: 'History', difficulty: 'Intermediate', question: 'Who was the first woman to fly solo across the Atlantic?', correctAnswer: 'Amelia Earhart', type: 'fill-blank' },
    { id: 'hist-i-10', subject: 'History', difficulty: 'Intermediate', question: 'The Industrial Revolution began in what country?', correctAnswer: 2, options: ['USA', 'France', 'Great Britain', 'Germany'], type: 'multiple-choice' },
  ],
  Advanced: [
    { id: 'hist-a-1', subject: 'History', difficulty: 'Advanced', question: 'Who wrote the Declaration of Independence?', correctAnswer: 'Thomas Jefferson', type: 'fill-blank' },
    { id: 'hist-a-2', subject: 'History', difficulty: 'Advanced', question: 'What global conflict occurred between 1914 and 1918?', correctAnswer: 0, options: ['World War I', 'World War II', 'The Cold War', 'The Vietnam War'], type: 'multiple-choice' },
    { id: 'hist-a-3', subject: 'History', difficulty: 'Advanced', question: 'Who said "I came, I saw, I conquered"?', correctAnswer: 'Julius Caesar', type: 'fill-blank' },
    { id: 'hist-a-4', subject: 'History', difficulty: 'Advanced', question: 'Which empire was conquered by Hernán Cortés?', correctAnswer: 1, options: ['Incan', 'Aztec', 'Mayan', 'Roman'], type: 'multiple-choice' },
    { id: 'hist-a-5', subject: 'History', difficulty: 'Advanced', question: 'In what year was the fall of the Berlin Wall?', correctAnswer: '1989', type: 'fill-blank' },
    { id: 'hist-a-6', subject: 'History', difficulty: 'Advanced', question: 'Who was the longest-reigning British monarch before Queen Elizabeth II?', correctAnswer: 2, options: ['King George III', 'King Henry VIII', 'Queen Victoria', 'Queen Mary'], type: 'multiple-choice' },
    { id: 'hist-a-7', subject: 'History', difficulty: 'Advanced', question: 'What document governed the US before the Constitution?', correctAnswer: 'Articles of Confederation', type: 'fill-blank' },
    { id: 'hist-a-8', subject: 'History', difficulty: 'Advanced', question: 'The French Revolution began in what year?', correctAnswer: '1789', type: 'fill-blank' },
    { id: 'hist-a-9', subject: 'History', difficulty: 'Advanced', question: 'Who invented the printing press in Europe?', correctAnswer: 'Johannes Gutenberg', type: 'fill-blank' },
    { id: 'hist-a-10', subject: 'History', difficulty: 'Advanced', question: 'What ancient trade route connected China to the Mediterranean?', correctAnswer: 'Silk Road', type: 'fill-blank' },
  ],
  Expert: [
    { id: 'hist-e-1', subject: 'History', difficulty: 'Expert', question: 'The Magna Carta limited the power of the ___.', correctAnswer: 'king', type: 'fill-blank' },
    { id: 'hist-e-2', subject: 'History', difficulty: 'Expert', question: 'Who was the primary author of the US Constitution?', correctAnswer: 'James Madison', type: 'fill-blank' },
    { id: 'hist-e-3', subject: 'History', difficulty: 'Expert', question: 'Which battle is considered the turning point of the American Civil War?', correctAnswer: 1, options: ['Bull Run', 'Gettysburg', 'Antietam', 'Appomattox'], type: 'multiple-choice' },
    { id: 'hist-e-4', subject: 'History', difficulty: 'Expert', question: 'What was the name of the secret project to develop the atomic bomb?', correctAnswer: 'Manhattan Project', type: 'fill-blank' },
    { id: 'hist-e-5', subject: 'History', difficulty: 'Expert', question: 'Who was the leader of the Soviet Union during World War II?', correctAnswer: 'Joseph Stalin', type: 'fill-blank' },
    { id: 'hist-e-6', subject: 'History', difficulty: 'Expert', question: 'The Peloponnesian War was fought between Athens and ___.', correctAnswer: 'Sparta', type: 'fill-blank' },
    { id: 'hist-e-7', subject: 'History', difficulty: 'Expert', question: 'In what year did the Western Roman Empire fall?', correctAnswer: 0, options: ['476 AD', '1453 AD', '44 BC', '800 AD'], type: 'multiple-choice' },
    { id: 'hist-e-8', subject: 'History', difficulty: 'Expert', question: 'Who was the first emperor of unified China?', correctAnswer: 'Qin Shi Huang', type: 'fill-blank' },
    { id: 'hist-e-9', subject: 'History', difficulty: 'Expert', question: 'What treaty officially ended World War I?', correctAnswer: 'Treaty of Versailles', type: 'fill-blank' },
    { id: 'hist-e-10', subject: 'History', difficulty: 'Expert', question: 'The period of tension following WWII between the US and USSR is known as the ___.', correctAnswer: 'Cold War', type: 'fill-blank' },
  ],
  Master: [
    { id: 'hist-m-1', subject: 'History', difficulty: 'Master', question: 'Which of these was NOT a cause of World War I?', correctAnswer: 3, options: ['Militarism', 'Alliances', 'Nationalism', 'The Internet'], type: 'multiple-choice' },
    { id: 'hist-m-2', subject: 'History', difficulty: 'Master', question: 'What are the names of the two atomic bombs dropped on Japan in 1945?', correctAnswer: 2, options: ['Fat Man and Big Boy', 'Little Boy and Fat Man', 'Little Boy and Tall Man', 'Big Boy and Tall Man'], type: 'multiple-choice' },
    { id: 'hist-m-3', subject: 'History', difficulty: 'Master', question: 'Who was the Pharaoh of Egypt when Howard Carter discovered his tomb?', correctAnswer: 'Tutankhamun', type: 'fill-blank' },
    { id: 'hist-m-4', subject: 'History', difficulty: 'Master', question: 'What was the exact date of the attack on Pearl Harbor?', correctAnswer: 'December 7, 1941', type: 'fill-blank' },
    { id: 'hist-m-5', subject: 'History', difficulty: 'Master', question: 'The "Scramble for Africa" was initiated by which conference in 1884?', correctAnswer: 0, options: ['Berlin Conference', 'Paris Peace Conference', 'Congress of Vienna', 'Geneva Convention'], type: 'multiple-choice' },
    { id: 'hist-m-6', subject: 'History', difficulty: 'Master', question: 'Who founded the Mongol Empire in 1206?', correctAnswer: 'Genghis Khan', type: 'fill-blank' },
    { id: 'hist-m-7', subject: 'History', difficulty: 'Master', question: 'Which US President was impeached in 1868?', correctAnswer: 'Andrew Johnson', type: 'fill-blank' },
    { id: 'hist-m-8', subject: 'History', difficulty: 'Master', question: 'The War of the Roses was fought on behalf of the houses of York and ___.', correctAnswer: 'Lancaster', type: 'fill-blank' },
    { id: 'hist-m-9', subject: 'History', difficulty: 'Master', question: 'What language was primarily spoken in the Byzantine Empire?', correctAnswer: 1, options: ['Latin', 'Greek', 'Persian', 'Arabic'], type: 'multiple-choice' },
    { id: 'hist-m-10', subject: 'History', difficulty: 'Master', question: 'Who led the Haitian Revolution against French rule?', correctAnswer: 'Toussaint Louverture', type: 'fill-blank' },
  ],
} as const;
