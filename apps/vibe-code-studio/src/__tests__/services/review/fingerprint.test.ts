/**
 * fingerprint tests — normalization idempotence, FNV-1a stability, and
 * marker round-trips through extractFingerprints.
 */
import { describe, expect, it } from 'vitest';
import {
  BUDGET_MARKER,
  commentFingerprint,
  extractFingerprints,
  fnv1a,
  fpMarker,
  normalizeMessage,
  SUMMARY_MARKER,
} from '../../../services/review/fingerprint';

describe('normalizeMessage', () => {
  it('trims, lowercases, and collapses whitespace idempotently', () => {
    const once = normalizeMessage('  Potential   NULL\treference \n');
    expect(once).toBe('potential null reference');
    expect(normalizeMessage(once)).toBe(once);
  });
});

describe('fnv1a / commentFingerprint', () => {
  it('is stable and 8 hex chars', () => {
    expect(fnv1a('abc')).toBe(fnv1a('abc'));
    expect(fnv1a('abc')).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'));
  });

  it('fingerprint ignores message casing/whitespace but not path/line', () => {
    const a = commentFingerprint('src/a.ts', 10, 'Debug statement found');
    expect(commentFingerprint('src/a.ts', 10, '  debug   STATEMENT found ')).toBe(a);
    expect(commentFingerprint('src/a.ts', 11, 'Debug statement found')).not.toBe(a);
    expect(commentFingerprint('src/b.ts', 10, 'Debug statement found')).not.toBe(a);
  });
});

describe('markers', () => {
  it('round-trips fingerprints through comment bodies', () => {
    const fp1 = commentFingerprint('src/a.ts', 10, 'msg one');
    const fp2 = commentFingerprint('src/b.ts', 4, 'msg two');
    const bodies = [
      `**warning** (style): msg one\n\n${fpMarker(fp1)}`,
      `unrelated human comment`,
      undefined,
      `two markers ${fpMarker(fp1)} ${fpMarker(fp2)}`,
    ];
    const found = extractFingerprints(bodies);
    expect(found).toEqual(new Set([fp1, fp2]));
  });

  it('summary/budget markers are HTML comments (invisible in rendered markdown)', () => {
    expect(SUMMARY_MARKER).toMatch(/^<!--.*-->$/);
    expect(BUDGET_MARKER).toMatch(/^<!--.*-->$/);
    expect(SUMMARY_MARKER).not.toBe(BUDGET_MARKER);
  });
});
