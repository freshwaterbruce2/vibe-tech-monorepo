/**
 * Word Banks Service
 * Educational vocabulary organized by subject and difficulty
 * Used for crosswords, word searches, and anagrams
 */

export interface WordEntry {
  word: string;
  clue: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface WordBank {
  subject: string;
  words: WordEntry[];
}

// Math vocabulary
export const MATH_WORDS: WordEntry[] = [
  // Easy
  { word: 'SUM', clue: 'Result of addition', category: 'math', difficulty: 'easy' },
  { word: 'ADD', clue: 'Put numbers together', category: 'math', difficulty: 'easy' },
  { word: 'EVEN', clue: 'Divisible by two', category: 'math', difficulty: 'easy' },
  { word: 'ODD', clue: 'Not divisible by two', category: 'math', difficulty: 'easy' },
  { word: 'ZERO', clue: 'Nothing or nil', category: 'math', difficulty: 'easy' },
  { word: 'ONE', clue: 'First counting number', category: 'math', difficulty: 'easy' },
  { word: 'TEN', clue: 'Number of fingers', category: 'math', difficulty: 'easy' },
  { word: 'MATH', clue: 'Study of numbers', category: 'math', difficulty: 'easy' },
  { word: 'PLUS', clue: 'Symbol for addition', category: 'math', difficulty: 'easy' },
  { word: 'LESS', clue: 'Not as much', category: 'math', difficulty: 'easy' },
  { word: 'MORE', clue: 'Greater amount', category: 'math', difficulty: 'easy' },
  { word: 'LINE', clue: 'Straight path', category: 'math', difficulty: 'easy' },
  { word: 'SIZE', clue: 'How big or small', category: 'math', difficulty: 'easy' },
  { word: 'MEASURE', clue: 'Find the size or amount', category: 'math', difficulty: 'easy' },

  // Medium
  { word: 'ALGEBRA', clue: 'Math with variables like x and y', category: 'math', difficulty: 'medium' },
  { word: 'FRACTION', clue: 'Part of a whole (numerator/denominator)', category: 'math', difficulty: 'medium' },
  { word: 'EQUATION', clue: 'Mathematical statement with equals sign', category: 'math', difficulty: 'medium' },
  { word: 'MULTIPLY', clue: 'Repeated addition', category: 'math', difficulty: 'medium' },
  { word: 'DIVIDE', clue: 'Split into equal parts', category: 'math', difficulty: 'medium' },
  { word: 'DECIMAL', clue: 'Number with a point', category: 'math', difficulty: 'medium' },
  { word: 'PERCENT', clue: 'Out of one hundred', category: 'math', difficulty: 'medium' },
  { word: 'ANGLE', clue: 'Space between two lines', category: 'math', difficulty: 'medium' },
  { word: 'RADIUS', clue: 'Distance from center to edge', category: 'math', difficulty: 'medium' },
  { word: 'SQUARE', clue: 'Shape with four equal sides', category: 'math', difficulty: 'medium' },
  { word: 'GEOMETRY', clue: 'Study of shapes and space', category: 'math', difficulty: 'medium' },
  { word: 'TRIANGLE', clue: 'Polygon with three sides', category: 'math', difficulty: 'medium' },
  { word: 'CIRCLE', clue: 'Round shape with no corners', category: 'math', difficulty: 'medium' },
  { word: 'VOLUME', clue: 'Amount of 3D space', category: 'math', difficulty: 'medium' },
  { word: 'VERTEX', clue: 'Corner point of a shape', category: 'math', difficulty: 'medium' },

  // Hard
  { word: 'POLYNOMIAL', clue: 'Expression with multiple terms', category: 'math', difficulty: 'hard' },
  { word: 'LOGARITHM', clue: 'Inverse of exponentiation', category: 'math', difficulty: 'hard' },
  { word: 'DERIVATIVE', clue: 'Rate of change in calculus', category: 'math', difficulty: 'hard' },
  { word: 'INTEGRAL', clue: 'Area under a curve', category: 'math', difficulty: 'hard' },
  { word: 'THEOREM', clue: 'Proven mathematical statement', category: 'math', difficulty: 'hard' },
  { word: 'HYPERBOLA', clue: 'Conic section with two branches', category: 'math', difficulty: 'hard' },
  { word: 'TANGENT', clue: 'Line touching curve at one point', category: 'math', difficulty: 'hard' },
  { word: 'CALCULUS', clue: 'Mathematics of change', category: 'math', difficulty: 'hard' },
  { word: 'ASYMPTOTE', clue: 'Line a curve approaches infinitely', category: 'math', difficulty: 'hard' },
  { word: 'MATRIX', clue: 'Rectangular array of numbers', category: 'math', difficulty: 'hard' },
  { word: 'EXPONENT', clue: 'Power to which a number is raised', category: 'math', difficulty: 'hard' },
  { word: 'PYTHAGOREAN', clue: 'Theorem relating sides of right triangle', category: 'math', difficulty: 'hard' },
  { word: 'PROBABILITY', clue: 'Likelihood of an event occurring', category: 'math', difficulty: 'hard' },
];

// Science vocabulary
export const SCIENCE_WORDS: WordEntry[] = [
  // Easy
  { word: 'ATOM', clue: 'Smallest unit of matter', category: 'science', difficulty: 'easy' },
  { word: 'CELL', clue: 'Basic unit of life', category: 'science', difficulty: 'easy' },
  { word: 'WATER', clue: 'H2O molecule', category: 'science', difficulty: 'easy' },
  { word: 'LIGHT', clue: 'Electromagnetic radiation', category: 'science', difficulty: 'easy' },
  { word: 'HEAT', clue: 'Form of energy transfer', category: 'science', difficulty: 'easy' },
  { word: 'PLANT', clue: 'Organism that photosynthesizes', category: 'science', difficulty: 'easy' },
  { word: 'ANIMAL', clue: 'Living organism that moves', category: 'science', difficulty: 'easy' },
  { word: 'EARTH', clue: 'Third planet from the sun', category: 'science', difficulty: 'easy' },
  { word: 'MOON', clue: 'Natural satellite of Earth', category: 'science', difficulty: 'easy' },
  { word: 'STAR', clue: 'Luminous sphere of plasma', category: 'science', difficulty: 'easy' },
  { word: 'BONE', clue: 'Rigid body tissue', category: 'science', difficulty: 'easy' },
  { word: 'LEAF', clue: 'Plant organ for photosynthesis', category: 'science', difficulty: 'easy' },

  // Medium
  { word: 'PHOTOSYNTHESIS', clue: 'Process plants use to make food', category: 'science', difficulty: 'medium' },
  { word: 'MOLECULE', clue: 'Group of atoms bonded together', category: 'science', difficulty: 'medium' },
  { word: 'ELECTRON', clue: 'Negatively charged particle', category: 'science', difficulty: 'medium' },
  { word: 'PROTON', clue: 'Positively charged particle', category: 'science', difficulty: 'medium' },
  { word: 'NEUTRON', clue: 'Neutral particle in nucleus', category: 'science', difficulty: 'medium' },
  { word: 'GRAVITY', clue: 'Force that attracts objects', category: 'science', difficulty: 'medium' },
  { word: 'ENERGY', clue: 'Capacity to do work', category: 'science', difficulty: 'medium' },
  { word: 'ELEMENT', clue: 'Pure chemical substance', category: 'science', difficulty: 'medium' },
  { word: 'COMPOUND', clue: 'Substance of two or more elements', category: 'science', difficulty: 'medium' },
  { word: 'REACTION', clue: 'Chemical change', category: 'science', difficulty: 'medium' },
  { word: 'MAGNET', clue: 'Material producing magnetic field', category: 'science', difficulty: 'medium' },
  { word: 'VACUUM', clue: 'Space devoid of matter', category: 'science', difficulty: 'medium' },
  { word: 'FOSSIL', clue: 'Preserved remains of organism', category: 'science', difficulty: 'medium' },
  { word: 'PLANET', clue: 'Large celestial body orbiting a star', category: 'science', difficulty: 'medium' },

  // Hard
  { word: 'MITOCHONDRIA', clue: 'Powerhouse of the cell', category: 'science', difficulty: 'hard' },
  { word: 'CHROMOSOME', clue: 'DNA structure carrying genes', category: 'science', difficulty: 'hard' },
  { word: 'ECOSYSTEM', clue: 'Community of organisms and environment', category: 'science', difficulty: 'hard' },
  { word: 'CATALYST', clue: 'Substance speeding up reaction', category: 'science', difficulty: 'hard' },
  { word: 'MOMENTUM', clue: 'Mass times velocity', category: 'science', difficulty: 'hard' },
  { word: 'VISCOSITY', clue: 'Resistance to flow', category: 'science', difficulty: 'hard' },
  { word: 'THERMODYNAMICS', clue: 'Study of heat and energy', category: 'science', difficulty: 'hard' },
  { word: 'ISOTOPE', clue: 'Atom with different neutron count', category: 'science', difficulty: 'hard' },
  { word: 'CHLOROPHYLL', clue: 'Green pigment in plants', category: 'science', difficulty: 'hard' },
  { word: 'SYMBIOSIS', clue: 'Interaction between two organisms', category: 'science', difficulty: 'hard' },
  { word: 'METABOLISM', clue: 'Chemical processes in living things', category: 'science', difficulty: 'hard' },
  { word: 'KINETIC', clue: 'Energy of motion', category: 'science', difficulty: 'hard' },
];

// History vocabulary
export const HISTORY_WORDS: WordEntry[] = [
  // Easy
  { word: 'WAR', clue: 'Armed conflict', category: 'history', difficulty: 'easy' },
  { word: 'KING', clue: 'Male monarch', category: 'history', difficulty: 'easy' },
  { word: 'QUEEN', clue: 'Female monarch', category: 'history', difficulty: 'easy' },
  { word: 'EMPIRE', clue: 'Group of nations under one ruler', category: 'history', difficulty: 'easy' },
  { word: 'BATTLE', clue: 'Military fight', category: 'history', difficulty: 'easy' },
  { word: 'ANCIENT', clue: 'Very old', category: 'history', difficulty: 'easy' },
  { word: 'CROWN', clue: 'Headpiece of a monarch', category: 'history', difficulty: 'easy' },
  { word: 'PAST', clue: 'Time gone by', category: 'history', difficulty: 'easy' },
  { word: 'SHIP', clue: 'Large vessel for travel on water', category: 'history', difficulty: 'easy' },
  { word: 'FLAG', clue: 'Symbol of a country', category: 'history', difficulty: 'easy' },

  // Medium
  { word: 'REVOLUTION', clue: 'Overthrow of government', category: 'history', difficulty: 'medium' },
  { word: 'DECLARATION', clue: 'Formal announcement', category: 'history', difficulty: 'medium' },
  { word: 'CONSTITUTION', clue: 'Document of governing principles', category: 'history', difficulty: 'medium' },
  { word: 'DYNASTY', clue: 'Series of rulers from same family', category: 'history', difficulty: 'medium' },
  { word: 'MEDIEVAL', clue: 'Middle Ages period', category: 'history', difficulty: 'medium' },
  { word: 'CIVILIZATION', clue: 'Advanced human society', category: 'history', difficulty: 'medium' },
  { word: 'REPUBLIC', clue: 'Government by elected representatives', category: 'history', difficulty: 'medium' },
  { word: 'AMENDMENT', clue: 'Change to constitution', category: 'history', difficulty: 'medium' },
  { word: 'COLONY', clue: 'Settlement ruled by another country', category: 'history', difficulty: 'medium' },
  { word: 'TREATY', clue: 'Formal agreement between states', category: 'history', difficulty: 'medium' },
  { word: 'ELECTION', clue: 'Process of voting for a leader', category: 'history', difficulty: 'medium' },
  { word: 'KNIGHT', clue: 'Mounted soldier in armor', category: 'history', difficulty: 'medium' },

  // Hard
  { word: 'RENAISSANCE', clue: 'Cultural rebirth period', category: 'history', difficulty: 'hard' },
  { word: 'IMPERIALISM', clue: 'Policy of extending power', category: 'history', difficulty: 'hard' },
  { word: 'REFORMATION', clue: 'Religious movement in 1500s', category: 'history', difficulty: 'hard' },
  { word: 'ARCHAEOLOGY', clue: 'Study of human history through artifacts', category: 'history', difficulty: 'hard' },
  { word: 'MONARCHY', clue: 'Government ruled by king or queen', category: 'history', difficulty: 'hard' },
  { word: 'TOTALITARIAN', clue: 'Government with total control', category: 'history', difficulty: 'hard' },
  { word: 'FEUDALISM', clue: 'Medieval social system', category: 'history', difficulty: 'hard' },
  { word: 'ARTIFACT', clue: 'Historical object made by humans', category: 'history', difficulty: 'hard' },
  { word: 'ABOLITIONIST', clue: 'Person who opposed slavery', category: 'history', difficulty: 'hard' },
  { word: 'SUFFRAGE', clue: 'The right to vote', category: 'history', difficulty: 'hard' },
  { word: 'PROHIBITION', clue: 'Ban on manufacturing alcohol', category: 'history', difficulty: 'hard' },
];

// Language Arts vocabulary
export const LANGUAGE_WORDS: WordEntry[] = [
  // Easy
  { word: 'VERB', clue: 'Action word', category: 'language', difficulty: 'easy' },
  { word: 'NOUN', clue: 'Person, place, or thing', category: 'language', difficulty: 'easy' },
  { word: 'WORD', clue: 'Unit of language', category: 'language', difficulty: 'easy' },
  { word: 'BOOK', clue: 'Written work', category: 'language', difficulty: 'easy' },
  { word: 'WRITE', clue: 'Put words on paper', category: 'language', difficulty: 'easy' },
  { word: 'READ', clue: 'Understand written text', category: 'language', difficulty: 'easy' },
  { word: 'STORY', clue: 'Narrative tale', category: 'language', difficulty: 'easy' },
  { word: 'POEM', clue: 'Rhythmic writing', category: 'language', difficulty: 'easy' },
  { word: 'LETTER', clue: 'Symbol in an alphabet', category: 'language', difficulty: 'easy' },
  { word: 'PUN', clue: 'Play on words', category: 'language', difficulty: 'easy' },
  { word: 'TEXT', clue: 'Written words', category: 'language', difficulty: 'easy' },

  // Medium
  { word: 'ADJECTIVE', clue: 'Descriptive word', category: 'language', difficulty: 'medium' },
  { word: 'ADVERB', clue: 'Modifies verb or adjective', category: 'language', difficulty: 'medium' },
  { word: 'METAPHOR', clue: 'Comparison without like or as', category: 'language', difficulty: 'medium' },
  { word: 'SIMILE', clue: 'Comparison using like or as', category: 'language', difficulty: 'medium' },
  { word: 'PRONOUN', clue: 'Word replacing noun', category: 'language', difficulty: 'medium' },
  { word: 'SYLLABLE', clue: 'Unit of pronunciation', category: 'language', difficulty: 'medium' },
  { word: 'SYNONYM', clue: 'Word with similar meaning', category: 'language', difficulty: 'medium' },
  { word: 'ANTONYM', clue: 'Word with opposite meaning', category: 'language', difficulty: 'medium' },
  { word: 'PARAGRAPH', clue: 'Group of sentences', category: 'language', difficulty: 'medium' },
  { word: 'GRAMMAR', clue: 'Rules of language', category: 'language', difficulty: 'medium' },
  { word: 'FICTION', clue: 'Made-up story', category: 'language', difficulty: 'medium' },
  { word: 'VOWEL', clue: 'A, E, I, O, U', category: 'language', difficulty: 'medium' },

  // Hard
  { word: 'ALLITERATION', clue: 'Repetition of initial sounds', category: 'language', difficulty: 'hard' },
  { word: 'ONOMATOPOEIA', clue: 'Word imitating sound', category: 'language', difficulty: 'hard' },
  { word: 'PERSONIFICATION', clue: 'Giving human traits to non-human', category: 'language', difficulty: 'hard' },
  { word: 'HYPERBOLE', clue: 'Extreme exaggeration', category: 'language', difficulty: 'hard' },
  { word: 'CONJUNCTION', clue: 'Word connecting clauses', category: 'language', difficulty: 'hard' },
  { word: 'PREPOSITION', clue: 'Word showing relationship', category: 'language', difficulty: 'hard' },
  { word: 'OXYMORON', clue: 'Contradictory terms together', category: 'language', difficulty: 'hard' },
  { word: 'CONSONANT', clue: 'Non-vowel letter sound', category: 'language', difficulty: 'hard' },
  { word: 'PROTAGONIST', clue: 'Main character in a story', category: 'language', difficulty: 'hard' },
  { word: 'ANTAGONIST', clue: 'Character opposing the protagonist', category: 'language', difficulty: 'hard' },
  { word: 'PALINDROME', clue: 'Word reading the same backwards', category: 'language', difficulty: 'hard' },
  { word: 'EUPHEMISM', clue: 'Mild word replacing a harsh one', category: 'language', difficulty: 'hard' },
];

// Bible vocabulary
export const BIBLE_WORDS: WordEntry[] = [
  // Easy
  { word: 'GOD', clue: 'Supreme being', category: 'bible', difficulty: 'easy' },
  { word: 'JESUS', clue: 'Son of God', category: 'bible', difficulty: 'easy' },
  { word: 'FAITH', clue: 'Belief without proof', category: 'bible', difficulty: 'easy' },
  { word: 'LOVE', clue: 'Greatest commandment', category: 'bible', difficulty: 'easy' },
  { word: 'PRAY', clue: 'Talk to God', category: 'bible', difficulty: 'easy' },
  { word: 'GRACE', clue: 'Unmerited favor', category: 'bible', difficulty: 'easy' },
  { word: 'HOLY', clue: 'Sacred and pure', category: 'bible', difficulty: 'easy' },
  { word: 'ARK', clue: 'Built by Noah', category: 'bible', difficulty: 'easy' },
  { word: 'SIN', clue: 'Disobedience to God', category: 'bible', difficulty: 'easy' },
  { word: 'CROSS', clue: 'Symbol of crucifixion', category: 'bible', difficulty: 'easy' },

  // Medium
  { word: 'COVENANT', clue: 'Sacred agreement', category: 'bible', difficulty: 'medium' },
  { word: 'APOSTLE', clue: 'Disciple sent to spread gospel', category: 'bible', difficulty: 'medium' },
  { word: 'PROPHET', clue: 'One who speaks for God', category: 'bible', difficulty: 'medium' },
  { word: 'MIRACLE', clue: 'Supernatural event', category: 'bible', difficulty: 'medium' },
  { word: 'PARABLE', clue: 'Teaching story', category: 'bible', difficulty: 'medium' },
  { word: 'GOSPEL', clue: 'Good news of Jesus', category: 'bible', difficulty: 'medium' },
  { word: 'TEMPLE', clue: 'Place of worship', category: 'bible', difficulty: 'medium' },
  { word: 'SCRIPTURE', clue: 'Sacred writings', category: 'bible', difficulty: 'medium' },
  { word: 'BAPTIZE', clue: 'Immerse in water for repentance', category: 'bible', difficulty: 'medium' },
  { word: 'DISCIPLE', clue: 'Follower of Jesus', category: 'bible', difficulty: 'medium' },
  { word: 'MANGER', clue: 'Feeding trough where Jesus lay', category: 'bible', difficulty: 'medium' },
  { word: 'SALVATION', clue: 'Deliverance from sin', category: 'bible', difficulty: 'medium' },

  // Hard
  { word: 'RESURRECTION', clue: 'Rising from the dead', category: 'bible', difficulty: 'hard' },
  { word: 'REVELATION', clue: 'Divine disclosure', category: 'bible', difficulty: 'hard' },
  { word: 'REDEMPTION', clue: 'Salvation from sin', category: 'bible', difficulty: 'hard' },
  { word: 'SANCTIFICATION', clue: 'Process of becoming holy', category: 'bible', difficulty: 'hard' },
  { word: 'TABERNACLE', clue: 'Portable dwelling for God', category: 'bible', difficulty: 'hard' },
  { word: 'ATONEMENT', clue: 'Reconciliation with God', category: 'bible', difficulty: 'hard' },
  { word: 'PENTECOST', clue: 'Descent of Holy Spirit', category: 'bible', difficulty: 'hard' },
  { word: 'PHARISEE', clue: 'Strict observer of Jewish law', category: 'bible', difficulty: 'hard' },
  { word: 'PROVERB', clue: 'Short saying stating a truth', category: 'bible', difficulty: 'hard' },
  { word: 'EPISTLE', clue: 'Letter in the New Testament', category: 'bible', difficulty: 'hard' },
  { word: 'PROVIDENCE', clue: 'Protective care of God', category: 'bible', difficulty: 'hard' },
];

// General knowledge for mixed games
export const GENERAL_WORDS: WordEntry[] = [
  { word: 'COMPUTER', clue: 'Electronic calculating device', category: 'tech', difficulty: 'easy' },
  { word: 'INTERNET', clue: 'Global network', category: 'tech', difficulty: 'easy' },
  { word: 'KEYBOARD', clue: 'Input device with keys', category: 'tech', difficulty: 'easy' },
  { word: 'ALGORITHM', clue: 'Step-by-step procedure', category: 'tech', difficulty: 'medium' },
  { word: 'PROGRAMMING', clue: 'Writing code', category: 'tech', difficulty: 'medium' },
  { word: 'ARTIFICIAL', clue: 'Made by humans', category: 'tech', difficulty: 'medium' },
  { word: 'INTELLIGENCE', clue: 'Ability to learn', category: 'tech', difficulty: 'medium' },
  { word: 'DATABASE', clue: 'Organized collection of data', category: 'tech', difficulty: 'medium' },
  { word: 'ENCRYPTION', clue: 'Encoding information', category: 'tech', difficulty: 'hard' },
  { word: 'NETWORK', clue: 'Interconnected system', category: 'tech', difficulty: 'medium' },
  { word: 'BROWSER', clue: 'Web navigation software', category: 'tech', difficulty: 'easy' },
  { word: 'MEMORY', clue: 'Data storage component', category: 'tech', difficulty: 'easy' },
  { word: 'PROCESSOR', clue: 'Brain of a computer', category: 'tech', difficulty: 'medium' },
  { word: 'PIXEL', clue: 'Tiny dot of an image', category: 'tech', difficulty: 'easy' },
  { word: 'VIRTUAL', clue: 'Simulated by software', category: 'tech', difficulty: 'medium' },
  { word: 'ROBOTICS', clue: 'Design and construction of robots', category: 'tech', difficulty: 'hard' },
];

// Combined word bank by subject
export const WORD_BANKS: Record<string, WordEntry[]> = {
  math: MATH_WORDS,
  science: SCIENCE_WORDS,
  history: HISTORY_WORDS,
  language: LANGUAGE_WORDS,
  bible: BIBLE_WORDS,
  general: GENERAL_WORDS,
  all: [
    ...MATH_WORDS,
    ...SCIENCE_WORDS,
    ...HISTORY_WORDS,
    ...LANGUAGE_WORDS,
    ...BIBLE_WORDS,
    ...GENERAL_WORDS,
  ],
};

// Get words by difficulty
export function getWordsByDifficulty(
  subject: string,
  difficulty: 'easy' | 'medium' | 'hard',
): WordEntry[] {
  const words = WORD_BANKS[subject] ?? WORD_BANKS.all ?? [];
  return words.filter((w) => w.difficulty === difficulty);
}

// Get random words from a subject
export function getRandomWords(
  subject: string,
  count: number,
  difficulty?: 'easy' | 'medium' | 'hard',
): WordEntry[] {
  let words = WORD_BANKS[subject] ?? WORD_BANKS.all ?? [];

  if (difficulty) {
    words = words.filter((w) => w.difficulty === difficulty);
  }

  // Shuffle and take count
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get words for crossword (need variety of lengths)
export function getCrosswordWords(subject: string, count: number): WordEntry[] {
  const words = WORD_BANKS[subject] ?? WORD_BANKS.all ?? [];

  // Prioritize words of different lengths for better grid
  const short = words.filter((w) => w.word.length <= 5);
  const medium = words.filter((w) => w.word.length > 5 && w.word.length <= 8);
  const long = words.filter((w) => w.word.length > 8);

  const result: WordEntry[] = [];
  const total = Math.min(count, words.length);

  // Mix of lengths
  for (let i = 0; i < total; i++) {
    const spliced = (pool: WordEntry[]) =>
      pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    if (i % 3 === 0 && short.length > 0) {
      const item = spliced(short);
      if (item) result.push(item);
    } else if (i % 3 === 1 && medium.length > 0) {
      const item = spliced(medium);
      if (item) result.push(item);
    } else if (long.length > 0) {
      const item = spliced(long);
      if (item) result.push(item);
    } else {
      // Fallback to any remaining
      const remaining = [...short, ...medium, ...long];
      const item = remaining[Math.floor(Math.random() * remaining.length)];
      if (item) result.push(item);
    }
  }

  return result;
}

// Get words for anagrams (good mix of lengths and difficulty)
export function getAnagramWords(subject: string, count: number): WordEntry[] {
  const words = WORD_BANKS[subject] ?? WORD_BANKS.all ?? [];

  // Filter words that are good for anagrams (6-12 letters)
  const suitable = words.filter((w) => w.word.length >= 6 && w.word.length <= 12);

  const shuffled = [...suitable].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
