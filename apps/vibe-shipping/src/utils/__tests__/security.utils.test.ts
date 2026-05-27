import { describe, expect, it } from 'vitest';
import { maskApiKey, sanitizeUsername, validateCredentials } from '../security.utils';

describe('security.utils', () => {
  describe('maskApiKey', () => {
    it('masks keys longer than 8 chars', () => {
      expect(maskApiKey('sk-1234567890abcdef')).toBe('sk-12345...');
    });

    it('returns *** for short keys', () => {
      expect(maskApiKey('short')).toBe('***');
      expect(maskApiKey('')).toBe('***');
    });

    it('returns *** for empty string', () => {
      expect(maskApiKey('')).toBe('***');
    });

    it('shows exactly first 8 characters', () => {
      const result = maskApiKey('ABCDEFGHrest');
      expect(result).toBe('ABCDEFGH...');
    });
  });

  describe('sanitizeUsername', () => {
    it('removes angle brackets', () => {
      expect(sanitizeUsername('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('trims whitespace', () => {
      expect(sanitizeUsername('  alice  ')).toBe('alice');
    });

    it('truncates at 100 characters', () => {
      const long = 'a'.repeat(200);
      expect(sanitizeUsername(long).length).toBe(100);
    });

    it('handles normal usernames unchanged', () => {
      expect(sanitizeUsername('john_doe')).toBe('john_doe');
    });
  });

  describe('validateCredentials', () => {
    it('returns valid for normal credentials', () => {
      const result = validateCredentials('alice', 'password123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('fails on missing username', () => {
      const result = validateCredentials('', 'password');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing credentials');
    });

    it('fails on missing password', () => {
      const result = validateCredentials('alice', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing credentials');
    });

    it('fails when username exceeds 100 chars', () => {
      const result = validateCredentials('a'.repeat(101), 'pass');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Credentials too long');
    });

    it('fails when password exceeds 256 chars', () => {
      const result = validateCredentials('alice', 'p'.repeat(257));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Credentials too long');
    });
  });
});
