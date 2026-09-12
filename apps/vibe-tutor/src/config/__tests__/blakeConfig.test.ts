import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock Capacitor to avoid native dependency
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

const {
  TUTOR_CONFIG,
  getWelcomeMessage,
  needsBreak,
  calculateLearningBonus,
} = await import('../blakeConfig');

describe('learner configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the production endpoint when window exists without location', async () => {
    vi.resetModules();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });

    try {
      const config = await import('../blakeConfig');
      expect(config.TUTOR_CONFIG.apiEndpoint).toBe(
        'https://vibe-tutor-api-734857480460.us-east4.run.app',
      );
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('allows only the approved production origin for native non-local overrides', async () => {
    const originalWindow = globalThis.window;
    try {
      for (const endpoint of [
        'https://vibe-tutor-api-734857480460.us-east4.run.app',
        'https://evil.example/api',
        'https://evil-localhost.example/api',
        'http://api.example.test',
        'not a valid URL',
      ]) {
        vi.resetModules();
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          value: {
            location: { protocol: 'capacitor:', hostname: '' },
            Capacitor: { isNativePlatform: () => true },
            __API_URL__: endpoint,
          },
        });
        const config = await import('../blakeConfig');
        expect(config.TUTOR_CONFIG.apiEndpoint).toBe(
          'https://vibe-tutor-api-734857480460.us-east4.run.app',
        );
      }
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });

  it('allows native localhost only with DEV and the explicit allow flag', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', 'true');
    vi.stubEnv('VITE_ALLOW_NATIVE_LOCAL_API', 'true');
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { protocol: 'capacitor:', hostname: '' },
        Capacitor: { isNativePlatform: () => true },
        __API_URL__: 'http://localhost:3001',
      },
    });
    try {
      const config = await import('../blakeConfig');
      expect(config.TUTOR_CONFIG.apiEndpoint).toBe('http://localhost:3001');
    } finally {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
    }
  });

  describe('TUTOR_CONFIG', () => {
    it('has required top-level properties', () => {
      expect(TUTOR_CONFIG.userName).toBe('Friend');
      expect(TUTOR_CONFIG.theme).toBe('roblox-gaming');
      expect(TUTOR_CONFIG.focusSessionDuration).toBe(15);
      expect(TUTOR_CONFIG.breakDuration).toBe(5);
    });

    it('has rewards array with required fields', () => {
      expect(TUTOR_CONFIG.rewards.length).toBeGreaterThan(0);
      for (const reward of TUTOR_CONFIG.rewards) {
        expect(reward.id).toBeTruthy();
        expect(reward.name).toBeTruthy();
        expect(reward.pointsRequired).toBeGreaterThan(0);
      }
    });

    it('has ADHD, ODD, and autism support flags', () => {
      expect(TUTOR_CONFIG.adhdSupport.visualTimers).toBe(true);
      expect(TUTOR_CONFIG.oddSupport.allowTaskReordering).toBe(true);
      expect(TUTOR_CONFIG.autismSupport.visualSchedules).toBe(true);
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

  describe('calculateLearningBonus', () => {
    it('doubles points for perfect performance', () => {
      expect(calculateLearningBonus(100, 'perfect')).toBe(200);
    });

    it('applies 1.5x for good performance', () => {
      expect(calculateLearningBonus(100, 'good')).toBe(150);
    });

    it('applies 1.2x for okay performance', () => {
      expect(calculateLearningBonus(100, 'okay')).toBe(120);
    });

    it('rounds to nearest integer', () => {
      expect(calculateLearningBonus(7, 'good')).toBe(11); // 7 * 1.5 = 10.5 -> 11
      expect(calculateLearningBonus(3, 'okay')).toBe(4);  // 3 * 1.2 = 3.6 -> 4
    });
  });

  describe('getWelcomeMessage', () => {
    it('returns a non-empty string', () => {
      const message = getWelcomeMessage();
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
    });

    it('interpolates the provided name into the greeting', () => {
      // The greeting is profile-driven — pass a name and it appears in the message.
      const message = getWelcomeMessage('Alex');
      expect(message).toContain('Alex');
    });

    it('falls back to the neutral default name when none is provided', () => {
      const message = getWelcomeMessage();
      expect(message).toContain('Friend');
    });
  });
});
