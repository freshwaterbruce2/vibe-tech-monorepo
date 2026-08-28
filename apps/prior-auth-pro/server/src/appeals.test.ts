import { describe, expect, it } from 'vitest';
import { generateFallbackAppeal, normalizeAppealInput } from './appeals.js';

describe('appeals', () => {
  it('normalizes required appeal case fields', () => {
    expect(
      normalizeAppealInput({
        diagnosis: '  severe migraine  ',
        procedure: ' Botox therapy ',
        denialReason: ' not medically necessary ',
      }),
    ).toEqual({
      diagnosis: 'severe migraine',
      procedure: 'Botox therapy',
      denialReason: 'not medically necessary',
    });
  });

  it('rejects incomplete appeal case fields', () => {
    expect(
      normalizeAppealInput({
        diagnosis: 'severe migraine',
        procedure: '',
        denialReason: 'not medically necessary',
      }),
    ).toBeNull();
  });

  it('builds a formal medical necessity fallback draft', () => {
    const letter = generateFallbackAppeal({
      diagnosis: 'severe migraine',
      procedure: 'Botox therapy',
      denialReason: 'not medically necessary',
    });

    expect(letter).toContain('medical necessity');
    expect(letter).toContain('severe migraine');
    expect(letter).toContain('Botox therapy');
    expect(letter).toContain('not medically necessary');
  });
});
