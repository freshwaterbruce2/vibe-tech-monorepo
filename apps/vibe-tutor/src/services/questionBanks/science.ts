/**
 * Science Question Bank
 * @description Questions organized by difficulty level
 */

import type { SubjectQuestionBank } from './types';

export const SCIENCE_QUESTIONS: SubjectQuestionBank = {
  Beginner: [
    { id: 'sci-b-1', subject: 'Science', difficulty: 'Beginner', question: 'What planet do we live on?', correctAnswer: 'Earth', type: 'fill-blank' },
    { id: 'sci-b-2', subject: 'Science', difficulty: 'Beginner', question: 'Plants need sunlight, water, and ___ to grow.', correctAnswer: 'soil', type: 'fill-blank' },
    { id: 'sci-b-3', subject: 'Science', difficulty: 'Beginner', question: 'What gives plants their green color?', correctAnswer: 1, options: ['Water', 'Chlorophyll', 'Sunlight', 'Dirt'], type: 'multiple-choice' },
    { id: 'sci-b-4', subject: 'Science', difficulty: 'Beginner', question: 'Which animal is known as man\'s best friend?', correctAnswer: 'dog', type: 'fill-blank' },
    { id: 'sci-b-5', subject: 'Science', difficulty: 'Beginner', question: 'What do bees collect from flowers?', correctAnswer: 'nectar', type: 'fill-blank' },
    { id: 'sci-b-6', subject: 'Science', difficulty: 'Beginner', question: 'Is the sun a star or a planet?', correctAnswer: 0, options: ['Star', 'Planet'], type: 'multiple-choice' },
    { id: 'sci-b-7', subject: 'Science', difficulty: 'Beginner', question: 'What gas do humans breathe out?', correctAnswer: 2, options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], type: 'multiple-choice' },
    { id: 'sci-b-8', subject: 'Science', difficulty: 'Beginner', question: 'Water freezes at ___ degrees Celsius.', correctAnswer: '0', type: 'fill-blank' },
    { id: 'sci-b-9', subject: 'Science', difficulty: 'Beginner', question: 'Which sense do you use your ears for?', correctAnswer: 'hearing', type: 'fill-blank' },
    { id: 'sci-b-10', subject: 'Science', difficulty: 'Beginner', question: 'What is the outer layer of our planet called?', correctAnswer: 1, options: ['Mantle', 'Crust', 'Core', 'Atmosphere'], type: 'multiple-choice' },
  ],
  Intermediate: [
    { id: 'sci-i-1', subject: 'Science', difficulty: 'Intermediate', question: 'The process plants use to convert sunlight into food is called?', correctAnswer: 'photosynthesis', type: 'fill-blank' },
    { id: 'sci-i-2', subject: 'Science', difficulty: 'Intermediate', question: 'What is the largest planet in our solar system?', correctAnswer: 'Jupiter', type: 'fill-blank' },
    { id: 'sci-i-3', subject: 'Science', difficulty: 'Intermediate', question: 'What are the three states of matter?', correctAnswer: 3, options: ['Hot, Cold, Warm', 'Earth, Wind, Fire', 'Up, Down, Middle', 'Solid, Liquid, Gas'], type: 'multiple-choice' },
    { id: 'sci-i-4', subject: 'Science', difficulty: 'Intermediate', question: 'What is the center of an atom called?', correctAnswer: 'nucleus', type: 'fill-blank' },
    { id: 'sci-i-5', subject: 'Science', difficulty: 'Intermediate', question: 'Which organ pumps blood throughout the human body?', correctAnswer: 'heart', type: 'fill-blank' },
    { id: 'sci-i-6', subject: 'Science', difficulty: 'Intermediate', question: 'What kind of energy is stored in a battery?', correctAnswer: 0, options: ['Chemical', 'Kinetic', 'Thermal', 'Nuclear'], type: 'multiple-choice' },
    { id: 'sci-i-7', subject: 'Science', difficulty: 'Intermediate', question: 'What forces causes objects to fall to the ground?', correctAnswer: 'gravity', type: 'fill-blank' },
    { id: 'sci-i-8', subject: 'Science', difficulty: 'Intermediate', question: 'True or False: Sound travels faster in water than in air.', correctAnswer: 0, options: ['True', 'False'], type: 'true-false' },
    { id: 'sci-i-9', subject: 'Science', difficulty: 'Intermediate', question: 'Animals that eat only plants are called ___.', correctAnswer: 'herbivores', type: 'fill-blank' },
    { id: 'sci-i-10', subject: 'Science', difficulty: 'Intermediate', question: 'What instrument is used to measure temperature?', correctAnswer: 'thermometer', type: 'fill-blank' },
  ],
  Advanced: [
    { id: 'sci-a-1', subject: 'Science', difficulty: 'Advanced', question: 'What is the chemical formula for water?', correctAnswer: 'H2O', type: 'fill-blank' },
    { id: 'sci-a-2', subject: 'Science', difficulty: 'Advanced', question: 'What type of rock is formed by cooling magma?', correctAnswer: 2, options: ['Sedimentary', 'Metamorphic', 'Igneous', 'Limestone'], type: 'multiple-choice' },
    { id: 'sci-a-3', subject: 'Science', difficulty: 'Advanced', question: 'Which scientist formulated the laws of motion and universal gravitation?', correctAnswer: 'Isaac Newton', type: 'fill-blank' },
    { id: 'sci-a-4', subject: 'Science', difficulty: 'Advanced', question: 'What is the periodic table symbol for Gold?', correctAnswer: 'Au', type: 'fill-blank' },
    { id: 'sci-a-5', subject: 'Science', difficulty: 'Advanced', question: 'In the human body, what relates to the term "pulmonary"?', correctAnswer: 3, options: ['Heart', 'Liver', 'Brain', 'Lungs'], type: 'multiple-choice' },
    { id: 'sci-a-6', subject: 'Science', difficulty: 'Advanced', question: 'What is the hardest known natural material?', correctAnswer: 'diamond', type: 'fill-blank' },
    { id: 'sci-a-7', subject: 'Science', difficulty: 'Advanced', question: 'How many chromosomes do human body cells typically have?', correctAnswer: '46', type: 'fill-blank' },
    { id: 'sci-a-8', subject: 'Science', difficulty: 'Advanced', question: 'Optics is the study of ___.', correctAnswer: 'light', type: 'fill-blank' },
    { id: 'sci-a-9', subject: 'Science', difficulty: 'Advanced', question: 'The splitting of a large atomic nucleus is called nuclear ___.', correctAnswer: 'fission', type: 'fill-blank' },
    { id: 'sci-a-10', subject: 'Science', difficulty: 'Advanced', question: 'Which gas makes up the majority of Earth\'s atmosphere?', correctAnswer: 1, options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], type: 'multiple-choice' },
  ],
  Expert: [
    { id: 'sci-e-1', subject: 'Science', difficulty: 'Expert', question: 'Mitochondria is often called the ___ of the cell.', correctAnswer: 'powerhouse', type: 'fill-blank' },
    { id: 'sci-e-2', subject: 'Science', difficulty: 'Expert', question: 'Who proposed the theory of general relativity?', correctAnswer: 'Albert Einstein', type: 'fill-blank' },
    { id: 'sci-e-3', subject: 'Science', difficulty: 'Expert', question: 'What is the most abundant element in the universe?', correctAnswer: 'Hydrogen', type: 'fill-blank' },
    { id: 'sci-e-4', subject: 'Science', difficulty: 'Expert', question: 'The study of heredity and the variation of inherited characteristics is called ___.', correctAnswer: 'genetics', type: 'fill-blank' },
    { id: 'sci-e-5', subject: 'Science', difficulty: 'Expert', question: 'What is the fundamental particle of light called?', correctAnswer: 'photon', type: 'fill-blank' },
    { id: 'sci-e-6', subject: 'Science', difficulty: 'Expert', question: 'Which constant represents the speed of light in a vacuum?', correctAnswer: 0, options: ['c', 'g', 'h', 'k'], type: 'multiple-choice' },
    { id: 'sci-e-7', subject: 'Science', difficulty: 'Expert', question: 'What does RNA stand for?', correctAnswer: 2, options: ['Real Nucleic Acid', 'Radial Nuclear Acid', 'Ribonucleic Acid', 'Rigid Neutral Array'], type: 'multiple-choice' },
    { id: 'sci-e-8', subject: 'Science', difficulty: 'Expert', question: 'Absolute zero is equal to 0 Kelvin, or ___ Celsius.', correctAnswer: '-273.15', type: 'fill-blank' },
    { id: 'sci-e-9', subject: 'Science', difficulty: 'Expert', question: 'In chemistry, a substance with a pH less than 7 is considered a/an ___.', correctAnswer: 'acid', type: 'fill-blank' },
    { id: 'sci-e-10', subject: 'Science', difficulty: 'Expert', question: 'What is the term for animals that lack a backbone?', correctAnswer: 'invertebrates', type: 'fill-blank' },
  ],
  Master: [
    { id: 'sci-m-1', subject: 'Science', difficulty: 'Master', question: 'E=mc² shows that mass and ___ are equivalent.', correctAnswer: 'energy', type: 'fill-blank' },
    { id: 'sci-m-2', subject: 'Science', difficulty: 'Master', question: 'What is Heisenberg\'s Uncertainty Principle primarily concerned with?', correctAnswer: 1, options: ['Thermodynamics', 'Quantum Mechanics', 'Relativity', 'String Theory'], type: 'multiple-choice' },
    { id: 'sci-m-3', subject: 'Science', difficulty: 'Master', question: 'What is the name of the theory that the universe is continually expanding from a hot, dense state?', correctAnswer: 3, options: ['String Theory', 'Steady State Theory', 'Multiverse Theory', 'Big Bang Theory'], type: 'multiple-choice' },
    { id: 'sci-m-4', subject: 'Science', difficulty: 'Master', question: 'Who discovered penicillin?', correctAnswer: 'Alexander Fleming', type: 'fill-blank' },
    { id: 'sci-m-5', subject: 'Science', difficulty: 'Master', question: 'In particle physics, what group of particles makes up protons and neutrons?', correctAnswer: 2, options: ['Leptons', 'Bosons', 'Quarks', 'Muons'], type: 'multiple-choice' },
    { id: 'sci-m-6', subject: 'Science', difficulty: 'Master', question: 'What is the geological era we currently live in?', correctAnswer: 1, options: ['Mesozoic', 'Cenozoic', 'Paleozoic', 'Precambrian'], type: 'multiple-choice' },
    { id: 'sci-m-7', subject: 'Science', difficulty: 'Master', question: 'What is the name of the process by which a cell divides into two identical daughter cells?', correctAnswer: 'mitosis', type: 'fill-blank' },
    { id: 'sci-m-8', subject: 'Science', difficulty: 'Master', question: 'What law states that the entropy of an isolated system always increases over time?', correctAnswer: 2, options: ['First Law of Thermodynamics', 'Second Law of Motion', 'Second Law of Thermodynamics', 'Law of Conservation'], type: 'multiple-choice' },
    { id: 'sci-m-9', subject: 'Science', difficulty: 'Master', question: 'Who proposed the Continental Drift theory?', correctAnswer: 'Alfred Wegener', type: 'fill-blank' },
    { id: 'sci-m-10', subject: 'Science', difficulty: 'Master', question: 'Which of the fundamental forces is the weakest?', correctAnswer: 'Gravity', type: 'fill-blank' },
  ],
} as const;
