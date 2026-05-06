import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  calculateStandardGameTokens,
  createGameCompletionPayload,
  generateMemoryCards,
  generateWordSearch,
} from '../core';
import { getEncounterSpawnIntervalMs, createMathRunnerProblem } from '../tutor';
import { LESSONS, PUZZLES, chooseAiMove } from '../chess';

describe('@vibetech/games core exports', () => {
  it('generates playable memory and word-search puzzles', () => {
    const words = [
      { word: 'SUM', clue: 'Addition result', category: 'math', difficulty: 'easy' as const },
      { word: 'ATOM', clue: 'Small matter unit', category: 'science', difficulty: 'easy' as const },
    ];

    const memoryCards = generateMemoryCards(words);
    const wordSearch = generateWordSearch(words, 8);

    expect(memoryCards).toHaveLength(4);
    expect(new Set(memoryCards.map((card) => card.pairId)).size).toBe(2);
    expect(wordSearch.grid).toHaveLength(8);
    expect(wordSearch.words.length).toBeGreaterThan(0);
  });

  it('normalizes completion payloads and token awards', () => {
    const tokens = calculateStandardGameTokens('word-search', 3);
    const payload = createGameCompletionPayload('word-search', 98.8, {
      source: 'brain-gym',
      stars: 4,
      subject: 'Language',
      timeSpent: 61.2,
      tokensEarned: tokens,
    });

    expect(tokens).toBeGreaterThan(10);
    expect(payload.canonicalGameId).toBe('wordsearch');
    expect(payload.score).toBe(98);
    expect(payload.timeSpent).toBe(61);
  });

  it('builds math runner problems with legal answer lanes', () => {
    const problem = createMathRunnerProblem('medium', () => 0.42);

    expect(problem.answerChoices).toHaveLength(4);
    expect(problem.answerChoices[problem.correctLane]).toBe(problem.answer);
    expect(getEncounterSpawnIntervalMs(0.5)).toBeGreaterThan(0);
  });
});

describe('@vibetech/games chess exports', () => {
  it('validates lesson and puzzle target moves', () => {
    for (const lesson of LESSONS) {
      const chess = new Chess(lesson.initialFen);
      const targetMoves = lesson.targetMoves ?? (lesson.targetMove ? [lesson.targetMove] : []);

      expect(targetMoves.length, lesson.id).toBeGreaterThan(0);
      for (const targetMove of targetMoves) {
        expect(chess.moves(), lesson.id).toContain(targetMove);
      }
    }

    for (const puzzle of PUZZLES) {
      const chess = new Chess(puzzle.initialFen);
      expect(chess.moves(), puzzle.id).toContain(puzzle.targetMove);
    }
  });

  it('chooses deterministic legal chess moves', () => {
    const fen = new Chess().fen();
    const move = chooseAiMove(fen, 'hard');
    const repeatedMove = chooseAiMove(fen, 'hard');

    expect(move?.san).toBeTruthy();
    expect(repeatedMove?.san).toBe(move?.san);
    expect(new Chess(fen).moves()).toContain(move?.san);
  });
});
