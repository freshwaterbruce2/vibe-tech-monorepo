/**
 * reporter tests — local report contains verdict, counts, inline anchors,
 * and the unanchored section (AC #8 parity text).
 */
import { describe, expect, it } from 'vitest';
import type { CodeReview } from '../../../services/AICodeReviewer';
import { formatLocalReport } from '../../../services/review/reporter';
import type { ReviewPayload } from '../../../services/review/types';

const review: CodeReview = {
  comments: [],
  qualityScore: 72,
  issueCount: { errors: 1, warnings: 2, info: 3 },
  verdict: 'comment',
};

const payload: ReviewPayload = {
  event: 'COMMENT',
  body: 'body',
  comments: [
    {
      path: 'src/a.ts',
      line: 10,
      side: 'RIGHT',
      body: '**error** (bug): Potential null reference\n<!-- vcs-review-bot:fp:deadbeef -->',
      fingerprint: 'deadbeef',
    },
  ],
  unanchored: [
    {
      file: 'src/gone.ts',
      line: 1,
      severity: 'warning',
      category: 'bug',
      type: 'issue',
      message: 'Outside diff',
    },
  ],
};

describe('formatLocalReport', () => {
  it('prints verdict, counts, inline anchors, and unanchored findings', () => {
    const report = formatLocalReport(review, payload);
    expect(report).toContain('verdict: comment · quality 72/100');
    expect(report).toContain('1 errors, 2 warnings, 3 info');
    expect(report).toContain('Would post: 1 inline comment(s) as COMMENT');
    expect(report).toContain('src/a.ts:10  **error** (bug): Potential null reference');
    expect(report).toContain('Outside the visible diff:');
    expect(report).toContain('src/gone.ts:1  [warning] Outside diff');
  });

  it('omits the unanchored section when empty', () => {
    const report = formatLocalReport(review, { ...payload, unanchored: [] });
    expect(report).not.toContain('Outside the visible diff:');
  });
});
