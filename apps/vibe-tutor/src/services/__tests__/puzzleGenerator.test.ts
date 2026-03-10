import { describe, expect, it } from 'vitest';
import {
  calculateAnagramScore,
  calculateMemoryScore,
  calculateWordSearchScore,
  generateAnagrams,
  generateMemoryCards,
  generateWordSearch,
  validateWordSearchSelection,
} from '../puzzleGenerator';
import type { WordEntry } from '../wordBanks';

const sampleWords: WordEntry[] = [
  { word: 'CAT', clue: 'A small pet', difficulty: 'easy', category: 'animals' },
  { word: 'DOG', clue: 'A loyal friend', difficulty: 'easy', category: 'animals' },
  { word: 'BIRD', clue: 'It can fly', difficulty: 'medium', category: 'animals' },
];

describe('puzzleGenerator', () => {
  // ── generateWordSearch ──────────────────────────────────────────────
  describe('generateWordSearch', () => {
    it('creates a grid of the correct size', () => {
      const result = generateWordSearch(sampleWords, 10);

      expect(result.size).toBe(10);
      expect(result.grid).toHaveLength(10);
      result.grid.forEach((row) => expect(row).toHaveLength(10));
    });

    it('fills all cells with uppercase letters', () => {
      const result = generateWordSearch(sampleWords, 10);

      result.grid.flat().forEach((cell) => {
        expect(cell).toMatch(/^[A-Z]$/);
      });
    });

    it('places words into the grid', () => {
      const result = generateWordSearch(sampleWords, 15);

      // At least some words should be placed (randomness means not all may fit)
      expect(result.words.length).toBeGreaterThan(0);
      result.words.forEach((w) => {
        expect(w.found).toBe(false);
        expect(w.word).toBe(w.word.toUpperCase());
        expect(w.clue).toBeTruthy();
      });
    });

    it('defaults to grid size 15', () => {
      const result = generateWordSearch(sampleWords);
      expect(result.size).toBe(15);
    });

    it('returns empty words array for empty input', () => {
      const result = generateWordSearch([]);
      expect(result.words).toHaveLength(0);
      expect(result.size).toBe(15);
    });
  });

  // ── generateAnagrams ───────────────────────────────────────────────
  describe('generateAnagrams', () => {
    it('creates one anagram challenge per word', () => {
      const result = generateAnagrams(sampleWords);
      expect(result).toHaveLength(sampleWords.length);
    });

    it('scrambles the word differently from the original', () => {
      const result = generateAnagrams(sampleWords);

      result.forEach((anagram) => {
        expect(anagram.original).toBe(anagram.original.toUpperCase());
        // Scrambled should contain the same letters
        expect(anagram.scrambled.split('').sort().join('')).toBe(
          anagram.original.split('').sort().join(''),
        );
        // For words longer than 1 char, scrambled should differ
        if (anagram.original.length > 1) {
          expect(anagram.scrambled).not.toBe(anagram.original);
        }
      });
    });

    it('includes clue and difficulty from source word', () => {
      const result = generateAnagrams(sampleWords);

      expect(result[0]!.clue).toBe('A small pet');
      expect(result[0]!.difficulty).toBe('easy');
    });

    it('assigns sequential IDs', () => {
      const result = generateAnagrams(sampleWords);

      expect(result[0]!.id).toBe('anagram-0');
      expect(result[1]!.id).toBe('anagram-1');
      expect(result[2]!.id).toBe('anagram-2');
    });
  });

  // ── generateMemoryCards ─────────────────────────────────────────────
  describe('generateMemoryCards', () => {
    it('creates two cards (word + clue) per source word', () => {
      const result = generateMemoryCards(sampleWords);
      expect(result).toHaveLength(sampleWords.length * 2);
    });

    it('pairs share the same pairId', () => {
      const result = generateMemoryCards(sampleWords);
      const pairIds = result.map((c) => c.pairId);
      const uniquePairs = [...new Set(pairIds)];

      expect(uniquePairs).toHaveLength(sampleWords.length);
      uniquePairs.forEach((pid) => {
        expect(result.filter((c) => c.pairId === pid)).toHaveLength(2);
      });
    });

    it('all cards start not flipped and not matched', () => {
      const result = generateMemoryCards(sampleWords);

      result.forEach((card) => {
        expect(card.isFlipped).toBe(false);
        expect(card.isMatched).toBe(false);
      });
    });
  });

  // ── calculateWordSearchScore ────────────────────────────────────────
  describe('calculateWordSearchScore', () => {
    it('returns 0 stars and 0 accuracy when no words found', () => {
      const result = calculateWordSearchScore(0, 5, 60);
      expect(result.accuracy).toBe(0);
      expect(result.stars).toBe(0);
    });

    it('awards 5 stars for 90%+ accuracy', () => {
      const result = calculateWordSearchScore(10, 10, 10);
      expect(result.accuracy).toBe(100);
      expect(result.stars).toBe(5);
    });

    it('awards 3 stars for 60-74% accuracy', () => {
      const result = calculateWordSearchScore(7, 10, 100);
      expect(result.accuracy).toBe(70);
      expect(result.stars).toBe(3);
    });

    it('includes time bonus', () => {
      const fast = calculateWordSearchScore(10, 10, 10);
      const slow = calculateWordSearchScore(10, 10, 600);
      expect(fast.score).toBeGreaterThan(slow.score);
    });

    it('handles zero total words gracefully', () => {
      const result = calculateWordSearchScore(0, 0, 10);
      expect(result.accuracy).toBe(0);
    });
  });

  // ── calculateAnagramScore ──────────────────────────────────────────
  describe('calculateAnagramScore', () => {
    it('penalizes hint usage by 5 points each', () => {
      const noHints = calculateAnagramScore(10, 10, 0, 30);
      const withHints = calculateAnagramScore(10, 10, 3, 30);
      expect(noHints.score - withHints.score).toBe(15);
    });

    it('awards 5 stars only for 90%+ accuracy with zero hints', () => {
      const perfect = calculateAnagramScore(10, 10, 0, 10);
      expect(perfect.stars).toBe(5);

      const hinted = calculateAnagramScore(10, 10, 1, 10);
      expect(hinted.stars).toBe(4); // 100% accuracy but hints used
    });

    it('returns 0 accuracy for 0 total', () => {
      const result = calculateAnagramScore(0, 0, 0, 0);
      expect(result.accuracy).toBe(0);
    });
  });

  // ── calculateMemoryScore ───────────────────────────────────────────
  describe('calculateMemoryScore', () => {
    it('returns 100% efficiency for optimal moves', () => {
      const result = calculateMemoryScore(5, 10, 10); // 5 pairs, 10 moves = optimal
      expect(result.efficiency).toBe(100);
    });

    it('gives lower efficiency for more moves', () => {
      const optimal = calculateMemoryScore(5, 10, 30);
      const poor = calculateMemoryScore(5, 20, 30);
      expect(optimal.efficiency).toBeGreaterThan(poor.efficiency);
    });

    it('awards 5 stars for 85%+ efficiency', () => {
      const result = calculateMemoryScore(5, 10, 5);
      expect(result.stars).toBe(5);
    });

    it('includes time bonus', () => {
      const fast = calculateMemoryScore(5, 10, 5);
      const slow = calculateMemoryScore(5, 10, 300);
      expect(fast.score).toBeGreaterThan(slow.score);
    });
  });

  // ── validateWordSearchSelection ────────────────────────────────────
  describe('validateWordSearchSelection', () => {
    it('finds a horizontally placed word', () => {
      const grid = {
        grid: [
          ['C', 'A', 'T', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
        ],
        words: [
          {
            word: 'CAT',
            clue: 'pet',
            found: false,
            startRow: 0,
            startCol: 0,
            endRow: 0,
            endCol: 2,
          },
        ],
        size: 5,
      };

      const result = validateWordSearchSelection(grid, 0, 0, 0, 2);
      expect(result.found).toBe(true);
      expect(result.word).toBe('CAT');
    });

    it('returns false for non-matching selection', () => {
      const grid = {
        grid: [
          ['C', 'A', 'T', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
        ],
        words: [
          {
            word: 'CAT',
            clue: 'pet',
            found: false,
            startRow: 0,
            startCol: 0,
            endRow: 0,
            endCol: 2,
          },
        ],
        size: 5,
      };

      const result = validateWordSearchSelection(grid, 1, 0, 1, 2);
      expect(result.found).toBe(false);
      expect(result.word).toBe('');
    });

    it('matches reversed word selection', () => {
      const grid = {
        grid: [
          ['C', 'A', 'T', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
          ['X', 'X', 'X', 'X', 'X'],
        ],
        words: [
          {
            word: 'CAT',
            clue: 'pet',
            found: false,
            startRow: 0,
            startCol: 0,
            endRow: 0,
            endCol: 2,
          },
        ],
        size: 5,
      };

      // Selecting right-to-left (TAC → reversed = CAT)
      const result = validateWordSearchSelection(grid, 0, 2, 0, 0);
      expect(result.found).toBe(true);
      expect(result.word).toBe('CAT');
    });
  });
});
