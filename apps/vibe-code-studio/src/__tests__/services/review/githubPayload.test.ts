/**
 * githubPayload tests — the ReviewComment→GitHub mapping table: severity
 * threshold, category suppression, anchoring/clamping/unanchored fold,
 * verdict→event (with requestChanges downgrade), prose-vs-replacement
 * suggestion rendering, fingerprint markers, and summary body.
 */
import { describe, expect, it } from 'vitest';
import type { CodeReview } from '../../../services/AICodeReviewer';
import { AICodeReviewer } from '../../../services/AICodeReviewer';
import type { UnifiedAIService } from '../../../services/ai/UnifiedAIService';
import { SUMMARY_MARKER } from '../../../services/review/fingerprint';
import {
  buildCommentBody,
  buildReviewPayload,
  buildSummaryBody,
  meetsThreshold,
} from '../../../services/review/githubPayload';
import type { BotReviewComment } from '../../../services/review/githubPayload';
import { DEFAULT_REVIEW_CONFIG } from '../../../services/review/reviewConfig';
import { FIXTURE_DIFF } from './fixtures';

const reviewer = new AICodeReviewer({} as unknown as UnifiedAIService);
const parsed = reviewer.parseDiff(FIXTURE_DIFF);

const comment = (overrides: Partial<BotReviewComment> = {}): BotReviewComment => ({
  file: 'src/a.ts',
  line: 10,
  severity: 'error',
  category: 'bug',
  type: 'issue',
  message: 'Potential null reference',
  ...overrides,
});

const reviewOf = (
  comments: BotReviewComment[],
  verdict: CodeReview['verdict'] = 'comment'
): CodeReview => ({
  comments,
  qualityScore: 80,
  issueCount: {
    errors: comments.filter(c => c.severity === 'error').length,
    warnings: comments.filter(c => c.severity === 'warning').length,
    info: comments.filter(c => c.severity === 'info').length,
  },
  verdict,
});

describe('meetsThreshold', () => {
  it('ranks error >= warning >= info', () => {
    expect(meetsThreshold('error', 'warning')).toBe(true);
    expect(meetsThreshold('warning', 'warning')).toBe(true);
    expect(meetsThreshold('info', 'warning')).toBe(false);
    expect(meetsThreshold('info', 'info')).toBe(true);
  });
});

describe('buildCommentBody', () => {
  it('renders severity/category/message with a fingerprint marker', () => {
    const body = buildCommentBody(comment());
    expect(body).toContain('**error** (bug): Potential null reference');
    expect(body).toMatch(/<!-- vcs-review-bot:fp:[0-9a-f]+ -->/);
  });

  it('prose suggestion renders as text, never a suggestion fence', () => {
    const body = buildCommentBody(comment({ suggestion: 'Use optional chaining' }));
    expect(body).toContain('_Suggestion:_ Use optional chaining');
    expect(body).not.toContain('```suggestion');
  });

  it('replacement renders as a one-click suggestion fence', () => {
    const body = buildCommentBody(comment({ replacement: 'const x = y?.z;' }));
    expect(body).toContain('```suggestion\nconst x = y?.z;\n```');
  });
});

describe('buildReviewPayload', () => {
  it('filters below-threshold and suppressed categories', () => {
    const review = reviewOf([
      comment(), // error/bug — kept
      comment({ line: 9, severity: 'info', message: 'nit' }), // below 'warning'
      comment({ line: 11, severity: 'warning', category: 'style', message: 'style thing' }), // suppressed
    ]);
    const payload = buildReviewPayload(review, parsed, DEFAULT_REVIEW_CONFIG);
    expect(payload.comments).toHaveLength(1);
    expect(payload.comments[0]).toMatchObject({ path: 'src/a.ts', line: 10, side: 'RIGHT' });
  });

  it('clamps near-miss lines and folds unanchorable findings into the body', () => {
    const review = reviewOf([
      comment({ line: 15, message: 'near miss' }), // clamps to 13
      comment({ file: 'src/nowhere.ts', message: 'ghost file' }), // unanchorable
    ]);
    const payload = buildReviewPayload(review, parsed, DEFAULT_REVIEW_CONFIG);
    expect(payload.comments).toHaveLength(1);
    expect(payload.comments[0]?.line).toBe(13);
    expect(payload.unanchored).toHaveLength(1);
    expect(payload.body).toContain('src/nowhere.ts');
    expect(payload.body).toContain('ghost file');
  });

  it('request_changes downgrades to COMMENT unless enabled', () => {
    const review = reviewOf([comment()], 'request_changes');
    expect(buildReviewPayload(review, parsed, DEFAULT_REVIEW_CONFIG).event).toBe('COMMENT');
    expect(
      buildReviewPayload(review, parsed, {
        ...DEFAULT_REVIEW_CONFIG,
        requestChangesEnabled: true,
      }).event
    ).toBe('REQUEST_CHANGES');
  });

  it('approve verdict posts as COMMENT (Actions tokens cannot APPROVE)', () => {
    const payload = buildReviewPayload(reviewOf([], 'approve'), parsed, DEFAULT_REVIEW_CONFIG);
    expect(payload.event).toBe('COMMENT');
    expect(payload.body).toContain('approve');
  });
});

describe('buildSummaryBody', () => {
  it('includes verdict, counts, pass number, and the summary marker', () => {
    const review = reviewOf([comment(), comment({ line: 9, severity: 'warning' })]);
    const body = buildSummaryBody(review, {
      passNumber: 2,
      maxPasses: 5,
      aiEnabled: true,
      inlinePosted: 2,
      dedupSkipped: 1,
    });
    expect(body).toContain('pass 2/5');
    expect(body).toContain('1 errors · 1 warnings · 0 info');
    expect(body).toContain('2 posted (1 unchanged, skipped)');
    expect(body).toContain(SUMMARY_MARKER);
    expect(body).not.toContain('AI comments disabled');
  });

  it('notes heuristics-only mode when AI is off', () => {
    const body = buildSummaryBody(reviewOf([]), {
      passNumber: 1,
      maxPasses: 5,
      aiEnabled: false,
      inlinePosted: 0,
      dedupSkipped: 0,
    });
    expect(body).toContain('AI comments disabled');
  });

  it('notes partial file coverage when the diff was reconstructed from the files API', () => {
    const body = buildSummaryBody(reviewOf([]), {
      passNumber: 1,
      maxPasses: 5,
      aiEnabled: true,
      inlinePosted: 0,
      dedupSkipped: 0,
      diffCoverage: { includedFiles: 3, totalFiles: 8, skippedFiles: ['a.ts', 'b.ts'] },
    });
    expect(body).toContain('Large PR:** reviewed 3 of 8 changed files');
  });
});
