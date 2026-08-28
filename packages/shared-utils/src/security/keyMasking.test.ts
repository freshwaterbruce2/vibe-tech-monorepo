import { describe, expect, it } from 'vitest';
import { maskApiKey } from './keyMasking';

describe('maskApiKey', () => {
  it('masks keys longer than 8 chars', () => {
    expect(maskApiKey('sk-1234567890abcdef')).toBe('sk-12345...');
  });

  it('returns *** for short keys', () => {
    expect(maskApiKey('short')).toBe('***');
    expect(maskApiKey('')).toBe('***');
  });

  it('shows exactly first 8 characters', () => {
    const result = maskApiKey('ABCDEFGHrest');
    expect(result).toBe('ABCDEFGH...');
  });
});
