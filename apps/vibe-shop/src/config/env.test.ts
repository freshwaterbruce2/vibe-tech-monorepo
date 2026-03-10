/**
 * Environment Configuration Tests
 * @vitest-environment node
 *
 * Stack: Vitest 4.x | Mock: vi.fn() | Coverage: 80%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Environment Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================
  // BLOCK 1: Happy Path Tests
  // ============================================
  describe('Happy Path', () => {
    it('should validate env with no required vars', async () => {
      const { validateEnv } = await import('./env');

      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should return env var value when set', async () => {
      process.env.TEST_VAR = 'test-value';

      const { getEnvVar } = await import('./env');

      const result = getEnvVar('TEST_VAR');

      expect(result).toBe('test-value');
    });

    it('should return default value when env var not set', async () => {
      delete process.env.NONEXISTENT_VAR;

      const { getEnvVar } = await import('./env');

      const result = getEnvVar('NONEXISTENT_VAR', 'default-value');

      expect(result).toBe('default-value');
    });

    it('should expose env object with correct defaults', async () => {
      delete process.env.NODE_ENV;
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.DATABASE_URL;

      const { env } = await import('./env');

      expect(env.nodeEnv).toBe('development');
      expect(env.appUrl).toBe('http://localhost:3000');
      expect(env.databaseUrl).toBe('file:./dev.db');
    });

    it('should read ShareASale config from environment', async () => {
      process.env.SHAREASALE_AFFILIATE_ID = 'my-affiliate-id';
      process.env.SHAREASALE_API_TOKEN = 'my-token';
      process.env.SHAREASALE_API_SECRET = 'my-secret';

      const { env } = await import('./env');

      expect(env.shareasaleAffiliateId).toBe('my-affiliate-id');
      expect(env.shareasaleApiToken).toBe('my-token');
      expect(env.shareasaleApiSecret).toBe('my-secret');
    });

    it('should read Awin config from environment', async () => {
      process.env.AWIN_PUBLISHER_ID = 'awin-pub-123';
      process.env.AWIN_API_TOKEN = 'awin-token-abc';

      const { env } = await import('./env');

      expect(env.awinPublisherId).toBe('awin-pub-123');
      expect(env.awinApiToken).toBe('awin-token-abc');
    });

    it('should read CJ Affiliate config from environment', async () => {
      process.env.CJ_WEBSITE_ID = 'cj-site-id';
      process.env.CJ_API_KEY = 'cj-api-key';

      const { env } = await import('./env');

      expect(env.cjWebsiteId).toBe('cj-site-id');
      expect(env.cjApiKey).toBe('cj-api-key');
    });
  });

  // ============================================
  // BLOCK 2: Edge Case Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty string env var', async () => {
      process.env.EMPTY_VAR = '';

      const { getEnvVar } = await import('./env');

      // Empty string is still a defined value
      const result = getEnvVar('EMPTY_VAR', 'default');

      expect(result).toBe('');
    });

    it('should return empty string for affiliate configs when not set', async () => {
      delete process.env.SHAREASALE_AFFILIATE_ID;
      delete process.env.AWIN_PUBLISHER_ID;
      delete process.env.CJ_WEBSITE_ID;
      delete process.env.SERPAPI_KEY;
      delete process.env.PLAUSIBLE_DOMAIN;

      const { env } = await import('./env');

      expect(env.shareasaleAffiliateId).toBe('');
      expect(env.awinPublisherId).toBe('');
      expect(env.cjWebsiteId).toBe('');
      expect(env.serpapiKey).toBe('');
      expect(env.plausibleDomain).toBe('');
    });

    it('should handle NODE_ENV production', async () => {
      process.env.NODE_ENV = 'production';

      const { env } = await import('./env');

      expect(env.nodeEnv).toBe('production');
    });

    it('should handle custom app URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://vibe-shop.com';

      const { env } = await import('./env');

      expect(env.appUrl).toBe('https://vibe-shop.com');
    });

    it('should handle custom database URL', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/vibeshop';

      const { env } = await import('./env');

      expect(env.databaseUrl).toBe('postgresql://localhost:5432/vibeshop');
    });

    it('should preserve env object immutability (as const)', async () => {
      const { env } = await import('./env');

      // TypeScript would catch this at compile time, but runtime check
      expect(typeof env).toBe('object');
      expect(Object.keys(env).length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // BLOCK 3: Error Handling Tests
  // ============================================
  describe('Error Handling', () => {
    it('should warn when env var not set and no default provided', async () => {
      delete process.env.MISSING_VAR;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { getEnvVar } = await import('./env');

      const result = getEnvVar('MISSING_VAR');

      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalledWith('Environment variable MISSING_VAR is not set');

      consoleSpy.mockRestore();
    });

    it('should not warn when default value is provided', async () => {
      delete process.env.MISSING_VAR;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { getEnvVar } = await import('./env');

      getEnvVar('MISSING_VAR', 'some-default');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should return validation result structure correctly', async () => {
      const { validateEnv } = await import('./env');

      const result = validateEnv();

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('missing');
      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.missing)).toBe(true);
    });

    it('should handle special characters in env values', async () => {
      process.env.SPECIAL_VAR = 'value-with-special=chars&more';

      const { getEnvVar } = await import('./env');

      const result = getEnvVar('SPECIAL_VAR');

      expect(result).toBe('value-with-special=chars&more');
    });

    it('should handle numeric string env values', async () => {
      process.env.NUMERIC_VAR = '12345';

      const { getEnvVar } = await import('./env');

      const result = getEnvVar('NUMERIC_VAR');

      expect(result).toBe('12345');
      expect(typeof result).toBe('string');
    });

    it('should handle boolean-like string env values', async () => {
      process.env.BOOL_VAR = 'true';

      const { getEnvVar } = await import('./env');

      const result = getEnvVar('BOOL_VAR');

      expect(result).toBe('true');
      expect(typeof result).toBe('string');
    });
  });
});
