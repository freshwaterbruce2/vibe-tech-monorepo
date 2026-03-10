import { describe, it, expect } from 'vitest';
import { generateSlug } from './index.js';

describe('generateSlug', () => {
  it('should handle basic strings', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should handle unicode and accents', () => {
    expect(generateSlug('Café au Lait!')).toBe('cafe-au-lait');
    expect(generateSlug('über über-mensch')).toBe('uber-uber-mensch');
    expect(generateSlug('München is in Bayern')).toBe('munchen-is-in-bayern');
  });

  it('should strip emojis and special characters', () => {
    expect(generateSlug('Hello 🌍 World! @#$%')).toBe('hello-world');
    expect(generateSlug('I ❤️  coding!!')).toBe('i-coding');
    expect(generateSlug('Look at this 🐕🐶 emoji')).toBe('look-at-this-emoji');
  });

  it('should collapse multiple spaces and dashes', () => {
    expect(generateSlug('this   is -- a --- test')).toBe('this-is-a-test');
    expect(generateSlug('multiple     spaces')).toBe('multiple-spaces');
    expect(generateSlug('multiple---dashes')).toBe('multiple-dashes');
  });

  it('should trim leading and trailing dashes and spaces', () => {
    expect(generateSlug('---Hello World---')).toBe('hello-world');
    expect(generateSlug('  Trailing spaces  ')).toBe('trailing-spaces');
    expect(generateSlug(' -  Spaces and dashes  - ')).toBe('spaces-and-dashes');
  });

  it('should handle empty strings or non-string inputs gracefully', () => {
    expect(generateSlug('')).toBe('');
    expect(generateSlug(null)).toBe('');
    expect(generateSlug(undefined)).toBe('');
    expect(generateSlug(123)).toBe('');
  });
});
