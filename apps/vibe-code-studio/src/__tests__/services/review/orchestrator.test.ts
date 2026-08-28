/**
 * orchestrator tests — full sequencing against a fake ReviewBotGitHub:
 * happy path, dedup on pass 2, budget stop BEFORE any AI/diff spend,
 * heuristics-only, 422 summary-only fallback, fork-403 tolerance,
 * empty diff, and budget-notice idempotence.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AICodeReviewer } from '../../../services/AICodeReviewer';
import type { UnifiedAIService } from '../../../services/ai/UnifiedAIService';
import { BUDGET_MARKER, SUMMARY_MARKER } from '../../../services/review/fingerprint';
import type { PullRequestDiffCoverage } from '../../../services/GitHubService';
import { runReviewBot } from '../../../services/review/orchestrator';
import type { ReviewBotDeps } from '../../../services/review/orchestrator';
import { DEFAULT_REVIEW_CONFIG } from '../../../services/review/reviewConfig';
import type { ReviewBotGitHub } from '../../../services/review/types';
import { FIXTURE_DIFF } from './fixtures';

const repo = { owner: 'o', repo: 'r' };

interface FakeGitHub extends ReviewBotGitHub {
  issueComments: Array<{ body?: string }>;
  reviewComments: Array<{ id: number; body: string }>;
  submitted: Array<Parameters<ReviewBotGitHub['submitReview']>[2]>;
  postedSummaries: string[];
}

function makeGitHub(
  diff = FIXTURE_DIFF,
  coverageOverrides: Partial<PullRequestDiffCoverage> = {}
): FakeGitHub {
  const github: FakeGitHub = {
    issueComments: [],
    reviewComments: [],
    submitted: [],
    postedSummaries: [],
    getPullRequestDiffWithCoverage: vi.fn(async () => ({
      diff,
      truncated: false,
      includedFiles: 0,
      totalFiles: 0,
      skippedFiles: [],
      ...coverageOverrides,
    })),
    getReviewComments: vi.fn(async () => github.reviewComments),
    listIssueComments: vi.fn(async () => github.issueComments),
    createIssueComment: vi.fn(async (_repo, _n, body: string) => {
      github.postedSummaries.push(body);
      github.issueComments.push({ body });
      return {};
    }),
    submitReview: vi.fn(async (_repo, _n, review) => {
      github.submitted.push(review);
      return { id: 1, state: 'COMMENTED' };
    }),
  };
  return github;
}

function makeDeps(github: FakeGitHub, overrides: Partial<ReviewBotDeps> = {}): ReviewBotDeps {
  return {
    github,
    reviewer: new AICodeReviewer({} as unknown as UnifiedAIService),
    repo,
    prNumber: 7,
    config: DEFAULT_REVIEW_CONFIG,
    log: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('runReviewBot happy path', () => {
  it('posts a summary and an inline review from heuristic findings', async () => {
    const github = makeGitHub();
    const result = await runReviewBot(makeDeps(github));

    expect(result.posted).toBe(true);
    expect(result.reason).toBe('posted');
    expect(result.passNumber).toBe(1);
    // console.log heuristic is warning/style — style is suppressed by default,
    // so inline count comes from non-style findings only.
    expect(github.postedSummaries[0]).toContain(SUMMARY_MARKER);
    expect(github.submitted).toHaveLength(1);
    expect(github.submitted[0]?.event).toBe('COMMENT');
  });

  it('merges AI provider findings into the posted review', async () => {
    const github = makeGitHub();
    const aiProvider = vi.fn(async () => [
      {
        file: 'src/b.ts',
        line: 4,
        severity: 'error' as const,
        category: 'bug' as const,
        type: 'issue' as const,
        message: 'Exported constant shadows global',
      },
    ]);
    const result = await runReviewBot(makeDeps(github, { aiProvider }));

    expect(aiProvider).toHaveBeenCalledTimes(1);
    expect(result.inlineCount).toBeGreaterThanOrEqual(1);
    const inline = github.submitted[0]?.comments ?? [];
    expect(inline.some(c => c.path === 'src/b.ts' && c.line === 4)).toBe(true);
  });
});

describe('dedup on synchronize', () => {
  it('skips fingerprints already posted, still posts the summary', async () => {
    const github = makeGitHub();
    await runReviewBot(makeDeps(github));
    const firstInline = github.submitted[0]?.comments ?? [];

    // Simulate GitHub persisting the inline comments, then a re-push
    github.reviewComments = firstInline.map((c, i) => ({ id: i, body: c.body }));
    const second = await runReviewBot(makeDeps(github));

    expect(second.passNumber).toBe(2);
    expect(second.inlineCount).toBe(0); // everything unchanged → all deduped
    expect(github.postedSummaries).toHaveLength(2);
  });
});

describe('budget gate', () => {
  it('stops before fetching the diff or calling AI once exhausted', async () => {
    const github = makeGitHub();
    github.issueComments = Array.from({ length: 5 }, () => ({ body: SUMMARY_MARKER }));
    const aiProvider = vi.fn(async () => []);
    const result = await runReviewBot(makeDeps(github, { aiProvider }));

    expect(result.reason).toBe('budget-exhausted');
    expect(github.getPullRequestDiffWithCoverage).not.toHaveBeenCalled();
    expect(aiProvider).not.toHaveBeenCalled();
    expect(github.postedSummaries[0]).toContain(BUDGET_MARKER);
  });

  it('posts the exhausted notice only once', async () => {
    const github = makeGitHub();
    github.issueComments = [
      ...Array.from({ length: 5 }, () => ({ body: SUMMARY_MARKER })),
      { body: BUDGET_MARKER },
    ];
    await runReviewBot(makeDeps(github));
    expect(github.postedSummaries).toHaveLength(0);
  });
});

describe('large-PR diff coverage (spec 15 406 fallback)', () => {
  it('threads diffCoverage into the result and summary when the diff was truncated', async () => {
    const github = makeGitHub(FIXTURE_DIFF, {
      truncated: true,
      includedFiles: 2,
      totalFiles: 5,
      skippedFiles: ['big/one.ts', 'big/two.ts', 'big/three.ts'],
    });
    const result = await runReviewBot(makeDeps(github));

    expect(result.diffCoverage).toEqual({
      includedFiles: 2,
      totalFiles: 5,
      skippedFiles: ['big/one.ts', 'big/two.ts', 'big/three.ts'],
    });
    expect(github.postedSummaries[0]).toContain('reviewed 2 of 5 changed files');
  });

  it('does not set diffCoverage when the single-diff request succeeded', async () => {
    const github = makeGitHub();
    const result = await runReviewBot(makeDeps(github));

    expect(result.diffCoverage).toBeUndefined();
    expect(github.postedSummaries[0]).not.toContain('changed files');
  });
});

describe('failure tolerance', () => {
  it('empty diff → no posts', async () => {
    const github = makeGitHub('   ');
    const result = await runReviewBot(makeDeps(github));
    expect(result.reason).toBe('empty-diff');
    expect(github.postedSummaries).toHaveLength(0);
  });

  it('422 on inline review retries once summary-only', async () => {
    const github = makeGitHub();
    vi.mocked(github.submitReview)
      .mockRejectedValueOnce(new Error('GitHub API error 422: Unprocessable'))
      .mockResolvedValueOnce({ id: 2, state: 'COMMENTED' });

    const result = await runReviewBot(makeDeps(github));
    expect(result.reason).toBe('summary-only-fallback');
    expect(result.inlineCount).toBe(0);
    expect(github.submitReview).toHaveBeenCalledTimes(2);
    const retry = vi.mocked(github.submitReview).mock.calls[1]?.[2];
    expect(retry?.comments).toBeUndefined();
  });

  it('403 posting (fork PR) is non-fatal', async () => {
    const github = makeGitHub();
    vi.mocked(github.createIssueComment).mockRejectedValue(
      new Error('GitHub API error 403: Resource not accessible')
    );
    const result = await runReviewBot(makeDeps(github));
    expect(result.posted).toBe(false);
    expect(result.reason).toBe('forbidden');
  });

  it('unexpected errors still propagate', async () => {
    const github = makeGitHub();
    vi.mocked(github.getPullRequestDiffWithCoverage).mockRejectedValue(new Error('network down'));
    await expect(runReviewBot(makeDeps(github))).rejects.toThrow('network down');
  });

  it('non-422 submit errors propagate', async () => {
    const github = makeGitHub();
    vi.mocked(github.submitReview).mockRejectedValue(
      new Error('GitHub API error 500: Server error')
    );
    await expect(runReviewBot(makeDeps(github))).rejects.toThrow('500');
  });
});
