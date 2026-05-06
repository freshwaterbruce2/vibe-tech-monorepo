/**
 * Puzzle Generator Service
 * Creates word searches, anagrams, and memory match puzzles
 */

import type { WordEntry } from './wordBanks';

// Word Search Grid
export interface WordSearchGrid {
  grid: string[][];
  words: {
    word: string;
    clue: string;
    found: boolean;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  }[];
  size: number;
}

// Anagram Challenge
export interface AnagramChallenge {
  id: string;
  scrambled: string;
  original: string;
  clue: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Memory Match Pair
export interface MemoryCard {
  id: string;
  content: string;
  pairId: string;
  isFlipped: boolean;
  isMatched: boolean;
  type?: 'word' | 'definition';
}

// Directions for word placement
const DIRECTIONS = [
  { row: 0, col: 1 }, // Horizontal right
  { row: 1, col: 0 }, // Vertical down
  { row: 1, col: 1 }, // Diagonal down-right
  { row: -1, col: 1 }, // Diagonal up-right
];

/**
 * Generate Word Search Puzzle
 */
export function generateWordSearch(words: WordEntry[], gridSize = 15): WordSearchGrid {
  const grid: string[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(''));

  const placedWords: WordSearchGrid['words'] = [];

  // Try to place each word
  for (const wordEntry of words) {
    const word = wordEntry.word.toUpperCase();
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      // Random starting position
      const startRow = Math.floor(Math.random() * gridSize);
      const startCol = Math.floor(Math.random() * gridSize);

      // Random direction
      const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]!;

      // Check if word fits
      if (canPlaceWord(grid, word, startRow, startCol, direction, gridSize)) {
        // Place the word
        let row = startRow;
        let col = startCol;

        for (let i = 0; i < word.length; i++) {
          grid[row]![col] = word[i]!;
          row += direction.row;
          col += direction.col;
        }

        placedWords.push({
          word,
          clue: wordEntry.clue,
          found: false,
          startRow,
          startCol,
          endRow: startRow + direction.row * (word.length - 1),
          endCol: startCol + direction.col * (word.length - 1),
        });

        placed = true;
      }

      attempts++;
    }
  }

  // Fill empty spaces with random letters
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (grid[row]![col] === '') {
        grid[row]![col] = alphabet[Math.floor(Math.random() * alphabet.length)]!;
      }
    }
  }

  return {
    grid,
    words: placedWords,
    size: gridSize,
  };
}

function canPlaceWord(
  grid: string[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: { row: number; col: number },
  gridSize: number,
): boolean {
  let row = startRow;
  let col = startCol;

  for (let i = 0; i < word.length; i++) {
    // Check bounds
    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
      return false;
    }

    // Check if cell is empty or has same letter
    if (grid[row]![col] !== '' && grid[row]![col] !== word[i]) {
      return false;
    }

    row += direction.row;
    col += direction.col;
  }

  return true;
}

/**
 * Generate Anagram Challenges
 */
export function generateAnagrams(words: WordEntry[]): AnagramChallenge[] {
  return words.map((wordEntry, index) => {
    const word = wordEntry.word.toUpperCase();
    const scrambled = scrambleWord(word);

    return {
      id: `anagram-${index}`,
      scrambled,
      original: word,
      clue: wordEntry.clue,
      difficulty: wordEntry.difficulty,
    };
  });
}

function scrambleWord(word: string): string {
  const letters = word.split('');

  // Fisher-Yates shuffle
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j]!, letters[i]!];
  }

  // Make sure it's actually scrambled (not same as original)
  const scrambled = letters.join('');
  if (scrambled === word && word.length > 1) {
    // Swap first two letters if shuffle resulted in same word
    [letters[0], letters[1]] = [letters[1]!, letters[0]!];
    return letters.join('');
  }

  return scrambled;
}

/**
 * Generate Memory Match Cards
 */
export function generateMemoryCards(words: WordEntry[]): MemoryCard[] {
  const cards: MemoryCard[] = [];

  words.forEach((wordEntry, index) => {
    const pairId = `pair-${index}`;

    // Card 1: Word
    cards.push({
      id: `card-${index}-word`,
      content: wordEntry.word,
      pairId,
      isFlipped: false,
      isMatched: false,
    });

    // Card 2: Clue
    cards.push({
      id: `card-${index}-clue`,
      content: wordEntry.clue,
      pairId,
      isFlipped: false,
      isMatched: false,
    });
  });

  // Shuffle cards
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j]!, cards[i]!];
  }

  return cards;
}

/**
 * Calculate Word Search Score
 */
export function calculateWordSearchScore(
  foundWords: number,
  totalWords: number,
  timeSeconds: number,
): {
  score: number;
  stars: number;
  accuracy: number;
} {
  const accuracy = totalWords > 0 ? (foundWords / totalWords) * 100 : 0;

  // Base score from accuracy
  let score = Math.round(accuracy);

  // Time bonus (faster = more points, max 50 bonus points)
  const timeBonus = Math.max(0, 50 - Math.floor(timeSeconds / 10));
  score += timeBonus;

  // Stars based on accuracy
  let stars = 0;
  if (accuracy >= 90) stars = 5;
  else if (accuracy >= 75) stars = 4;
  else if (accuracy >= 60) stars = 3;
  else if (accuracy >= 40) stars = 2;
  else if (accuracy >= 20) stars = 1;

  return { score, stars, accuracy };
}

/**
 * Calculate Anagram Score
 */
export function calculateAnagramScore(
  solved: number,
  total: number,
  hintsUsed: number,
  timeSeconds: number,
): {
  score: number;
  stars: number;
  accuracy: number;
} {
  const accuracy = total > 0 ? (solved / total) * 100 : 0;

  // Base score from accuracy
  let score = Math.round(accuracy);

  // Hint penalty (5 points per hint)
  score = Math.max(0, score - hintsUsed * 5);

  // Time bonus
  const timeBonus = Math.max(0, 30 - Math.floor(timeSeconds / 15));
  score += timeBonus;

  // Stars based on performance
  let stars = 0;
  if (accuracy >= 90 && hintsUsed === 0) stars = 5;
  else if (accuracy >= 80) stars = 4;
  else if (accuracy >= 65) stars = 3;
  else if (accuracy >= 45) stars = 2;
  else if (accuracy >= 25) stars = 1;

  return { score, stars, accuracy };
}

/**
 * Calculate Memory Match Score
 */
export function calculateMemoryScore(
  pairs: number,
  moves: number,
  timeSeconds: number,
): {
  score: number;
  stars: number;
  efficiency: number;
} {
  const optimalMoves = pairs * 2; // Perfect memory would need 2x pairs
  const efficiency = optimalMoves > 0 ? Math.min(100, (optimalMoves / moves) * 100) : 0;

  // Base score from efficiency
  let score = Math.round(efficiency);

  // Time bonus (faster completion)
  const timeBonus = Math.max(0, 40 - Math.floor(timeSeconds / 5));
  score += timeBonus;

  // Stars based on efficiency
  let stars = 0;
  if (efficiency >= 85) stars = 5;
  else if (efficiency >= 70) stars = 4;
  else if (efficiency >= 55) stars = 3;
  else if (efficiency >= 40) stars = 2;
  else if (efficiency >= 25) stars = 1;

  return { score, stars, efficiency };
}

/**
 * Validate Word Search Selection
 */
export function validateWordSearchSelection(
  grid: WordSearchGrid,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
): { found: boolean; word: string } {
  // Extract selected letters
  const rowDiff = endRow - startRow;
  const colDiff = endCol - startCol;

  // Normalize direction
  const rowDir = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
  const colDir = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);

  const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff)) + 1;

  let selectedWord = '';
  let row = startRow;
  let col = startCol;

  for (let i = 0; i < length; i++) {
    if (row >= 0 && row < grid.size && col >= 0 && col < grid.size) {
      selectedWord += grid.grid[row]![col]!;
    }
    row += rowDir;
    col += colDir;
  }

  // Check if it matches any word (forward or backward)
  const matchedWord = grid.words.find(
    (w) => w.word === selectedWord || w.word === selectedWord.split('').reverse().join(''),
  );

  return {
    found: !!matchedWord,
    word: matchedWord?.word ?? '',
  };
}
