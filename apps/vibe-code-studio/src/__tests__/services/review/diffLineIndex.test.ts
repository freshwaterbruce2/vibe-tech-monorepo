/**
 * diffLineIndex tests — RIGHT-side anchor semantics against real parseDiff
 * output: add/context lines anchorable, remove lines excluded, multi-chunk
 * numbering, nearestAnchor window behavior.
 */
import { describe, expect, it } from 'vitest';
import { AICodeReviewer } from '../../../services/AICodeReviewer';
import type { UnifiedAIService } from '../../../services/ai/UnifiedAIService';
import { buildCommentableLineIndex, nearestAnchor } from '../../../services/review/diffLineIndex';
import { FIXTURE_DIFF } from './fixtures';

const reviewer = new AICodeReviewer({} as unknown as UnifiedAIService);
const parsed = reviewer.parseDiff(FIXTURE_DIFF);
const index = buildCommentableLineIndex(parsed);

describe('buildCommentableLineIndex', () => {
  it('indexes add + context lines with new-file numbers', () => {
    expect(index.get('src/a.ts')).toEqual(new Set([8, 9, 10, 11, 12, 13]));
    expect(index.get('src/b.ts')).toEqual(new Set([3, 4, 5]));
  });

  it('excludes remove lines (they hold non-incremented new-file numbers)', () => {
    // The removed line sat between context 8 and add 9 — set is contiguous,
    // proving no phantom entry was added for the removal.
    expect(index.get('src/a.ts')?.size).toBe(6);
  });

  it('handles multiple chunks in one file', () => {
    const multiChunk = [
      'diff --git a/src/c.ts b/src/c.ts',
      '--- a/src/c.ts',
      '+++ b/src/c.ts',
      '@@ -1,2 +1,3 @@',
      ' line one',
      '+inserted two',
      ' line three',
      '@@ -10,2 +11,3 @@',
      ' line eleven',
      '+inserted twelve',
      ' line thirteen',
      '',
    ].join('\n');
    const chunked = buildCommentableLineIndex(reviewer.parseDiff(multiChunk));
    expect(chunked.get('src/c.ts')).toEqual(new Set([1, 2, 3, 11, 12, 13]));
  });
});

describe('nearestAnchor', () => {
  it('returns the exact line when anchorable', () => {
    expect(nearestAnchor(index, 'src/a.ts', 10)).toBe(10);
  });

  it('clamps to the nearest anchorable line within the window', () => {
    expect(nearestAnchor(index, 'src/a.ts', 15)).toBe(13); // 15 not in diff, -2
    expect(nearestAnchor(index, 'src/a.ts', 6)).toBe(8); // below range, +2
  });

  it('prefers the closer line and +side on ties', () => {
    expect(nearestAnchor(index, 'src/b.ts', 2)).toBe(3);
  });

  it('returns null outside the window or for unknown files', () => {
    expect(nearestAnchor(index, 'src/a.ts', 100)).toBeNull();
    expect(nearestAnchor(index, 'src/unknown.ts', 10)).toBeNull();
    expect(nearestAnchor(new Map(), 'src/a.ts', 10)).toBeNull();
  });

  it('respects a custom window', () => {
    expect(nearestAnchor(index, 'src/a.ts', 20, 10)).toBe(13);
    expect(nearestAnchor(index, 'src/a.ts', 20, 3)).toBeNull();
  });
});
