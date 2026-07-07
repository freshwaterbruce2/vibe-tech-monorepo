/**
 * dedup tests — previously posted fingerprints are skipped on re-runs;
 * human comments and changed findings pass through.
 */
import { describe, expect, it } from 'vitest';
import { filterDuplicates } from '../../../services/review/dedup';
import { commentFingerprint, fpMarker } from '../../../services/review/fingerprint';
import type { AnchoredComment } from '../../../services/review/types';

const candidate = (path: string, line: number, message: string): AnchoredComment => ({
  path,
  line,
  side: 'RIGHT',
  body: `**warning** (style): ${message}\n${fpMarker(commentFingerprint(path, line, message))}`,
  fingerprint: commentFingerprint(path, line, message),
});

describe('filterDuplicates', () => {
  const posted = candidate('src/a.ts', 10, 'Debug statement found');

  it('skips candidates whose fingerprint was already posted', () => {
    const fresh = candidate('src/b.ts', 4, 'New finding');
    const result = filterDuplicates([posted, fresh], [posted.body]);
    expect(result).toEqual([fresh]);
  });

  it('a changed message on the same line posts again', () => {
    const changed = candidate('src/a.ts', 10, 'Different message');
    expect(filterDuplicates([changed], [posted.body])).toEqual([changed]);
  });

  it('ignores bodies without markers (human comments) and undefined bodies', () => {
    const result = filterDuplicates([posted], ['human words', undefined]);
    expect(result).toEqual([posted]);
  });

  it('empty existing set is a no-op passthrough', () => {
    expect(filterDuplicates([posted], [])).toEqual([posted]);
  });
});
