import { describe, expect, it, vi } from 'vitest';

// Mock the tokenService dependency before importing gameProgression
vi.mock('../tokenService', () => ({
  TOKEN_REWARDS: {
    GAME_COMPLETE: 10,
    GAME_PERFECT: 25,
  },
}));

const {
  canonicalizeGameId,
  getGameDisplayName,
  getGameBaseTokens,
  calculateStandardGameTokens,
  createGameCompletionPayload,
} = await import('../gameProgression');

describe('gameProgression', () => {
  describe('canonicalizeGameId', () => {
    it('maps known aliases to canonical IDs', () => {
      expect(canonicalizeGameId('boss-history')).toBe('bossbattle');
      expect(canonicalizeGameId('boss-math')).toBe('bossbattle');
      expect(canonicalizeGameId('math')).toBe('mathadventure');
      expect(canonicalizeGameId('math-adventure')).toBe('mathadventure');
      expect(canonicalizeGameId('memorymatch')).toBe('memory');
      expect(canonicalizeGameId('word-search')).toBe('wordsearch');
    });

    it('normalizes casing and trims whitespace', () => {
      expect(canonicalizeGameId('  Boss-History  ')).toBe('bossbattle');
      expect(canonicalizeGameId('MATH')).toBe('mathadventure');
    });

    it('passes through unknown IDs unchanged (lowercased)', () => {
      expect(canonicalizeGameId('trivia')).toBe('trivia');
      expect(canonicalizeGameId('MyCustomGame')).toBe('mycustomgame');
    });
  });

  describe('getGameDisplayName', () => {
    it('returns human-readable names for known games', () => {
      expect(getGameDisplayName('memory')).toBe('Memory Match');
      expect(getGameDisplayName('boss-math')).toBe('Boss Battle');
      expect(getGameDisplayName('word-search')).toBe('Word Search');
    });

    it('falls back to raw ID for unknown games', () => {
      expect(getGameDisplayName('trivia')).toBe('trivia');
    });
  });

  describe('getGameBaseTokens', () => {
    it('returns correct base tokens for known games', () => {
      expect(getGameBaseTokens('memory')).toBe(10);
      expect(getGameBaseTokens('bossbattle')).toBe(20);
      expect(getGameBaseTokens('anagrams')).toBe(15);
    });

    it('falls back to TOKEN_REWARDS.GAME_COMPLETE for unknown games', () => {
      expect(getGameBaseTokens('unknown-game')).toBe(10);
    });
  });

  describe('calculateStandardGameTokens', () => {
    it('returns base tokens for 0-2 stars', () => {
      expect(calculateStandardGameTokens('memory', 2)).toBe(10);
    });

    it('adds perfect bonus for 3+ stars', () => {
      // memory base = 10, perfect bonus = 25 => 35
      expect(calculateStandardGameTokens('memory', 3)).toBe(35);
      expect(calculateStandardGameTokens('memory', 5)).toBe(35);
    });

    it('applies streak multiplier', () => {
      // memory base = 10, no perfect => 10 * 1.5 = 15
      expect(calculateStandardGameTokens('memory', 1, { streakMultiplier: 1.5 })).toBe(15);
    });

    it('applies streak multiplier with perfect bonus', () => {
      // memory base = 10 + perfect 25 = 35 * 2 = 70
      expect(calculateStandardGameTokens('memory', 3, { streakMultiplier: 2 })).toBe(70);
    });

    it('returns at least 1 token even with zero streak', () => {
      // streakMultiplier of 0 is falsy so the branch is skipped; base tokens apply
      expect(calculateStandardGameTokens('memory', 0, { streakMultiplier: 0 })).toBeGreaterThanOrEqual(1);
    });
  });

  describe('createGameCompletionPayload', () => {
    it('builds a normalized payload from raw input', () => {
      const payload = createGameCompletionPayload('boss-math', 85, {
        source: 'brain-gym',
        stars: 3,
        timeSpent: 120,
        tokensEarned: 50,
      });

      expect(payload.rawGameId).toBe('boss-math');
      expect(payload.canonicalGameId).toBe('bossbattle');
      expect(payload.achievementKey).toBe('bossBattle');
      expect(payload.displayName).toBe('Boss Battle');
      expect(payload.source).toBe('brain-gym');
      expect(payload.score).toBe(85);
      expect(payload.stars).toBe(3);
      expect(payload.timeSpent).toBe(120);
      expect(payload.tokensEarned).toBe(50);
    });

    it('caps stars at 5', () => {
      const payload = createGameCompletionPayload('memory', 100, {
        source: 'learning-realm',
        stars: 10,
      });
      expect(payload.stars).toBe(5);
    });

    it('normalizes non-finite score to 0', () => {
      const payload = createGameCompletionPayload('memory', NaN, {
        source: 'brain-gym',
      });
      expect(payload.score).toBe(0);
    });

    it('handles undefined optional fields', () => {
      const payload = createGameCompletionPayload('memory', 50, {
        source: 'brain-gym',
      });
      expect(payload.stars).toBe(0);
      expect(payload.timeSpent).toBeUndefined();
      expect(payload.tokensEarned).toBe(0);
    });
  });
});
