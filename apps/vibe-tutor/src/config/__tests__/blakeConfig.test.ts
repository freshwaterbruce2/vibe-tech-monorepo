import { describe, expect, it, vi } from 'vitest';

// Mock Capacitor to avoid native dependency
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

const {
  BLAKE_CONFIG,
  getWelcomeMessage,
  needsBreak,
  calculateBlakeBonus,
} = await import('../blakeConfig');

describe('blakeConfig', () => {
  describe('BLAKE_CONFIG', () => {
    it('has required top-level properties', () => {
      expect(BLAKE_CONFIG.userName).toBe('Blake');
      expect(BLAKE_CONFIG.theme).toBe('roblox-gaming');
      expect(BLAKE_CONFIG.focusSessionDuration).toBe(15);
      expect(BLAKE_CONFIG.breakDuration).toBe(5);
    });

    it('has rewards array with required fields', () => {
      expect(BLAKE_CONFIG.rewards.length).toBeGreaterThan(0);
      for (const reward of BLAKE_CONFIG.rewards) {
        expect(reward.id).toBeTruthy();
        expect(reward.name).toBeTruthy();
        expect(reward.pointsRequired).toBeGreaterThan(0);
      }
    });

    it('has ADHD, ODD, and autism support flags', () => {
      expect(BLAKE_CONFIG.adhdSupport.visualTimers).toBe(true);
      expect(BLAKE_CONFIG.oddSupport.allowTaskReordering).toBe(true);
      expect(BLAKE_CONFIG.autismSupport.visualSchedules).toBe(true);
    });
  });

  describe('needsBreak', () => {
    it('returns true when focus >= 15 minutes', () => {
      expect(needsBreak(15)).toBe(true);
      expect(needsBreak(30)).toBe(true);
    });

    it('returns false when focus < 15 minutes', () => {
      expect(needsBreak(14)).toBe(false);
      expect(needsBreak(0)).toBe(false);
    });
  });

  describe('calculateBlakeBonus', () => {
    it('doubles points for perfect performance', () => {
      expect(calculateBlakeBonus(100, 'perfect')).toBe(200);
    });

    it('applies 1.5x for good performance', () => {
      expect(calculateBlakeBonus(100, 'good')).toBe(150);
    });

    it('applies 1.2x for okay performance', () => {
      expect(calculateBlakeBonus(100, 'okay')).toBe(120);
    });

    it('rounds to nearest integer', () => {
      expect(calculateBlakeBonus(7, 'good')).toBe(11); // 7 * 1.5 = 10.5 -> 11
      expect(calculateBlakeBonus(3, 'okay')).toBe(4);  // 3 * 1.2 = 3.6 -> 4
    });
  });

  describe('getWelcomeMessage', () => {
    it('returns a non-empty string', () => {
      const message = getWelcomeMessage();
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
    });

    it('includes Blake name', () => {
      // All greeting templates include "Blake"
      const message = getWelcomeMessage();
      expect(message).toContain('Blake');
    });
  });
});
