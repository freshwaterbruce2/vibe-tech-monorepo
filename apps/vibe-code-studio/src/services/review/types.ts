/**
 * PR review bot types — spec 15 (Hosted PR Review Bot), Phases 1-2.
 * The bot reuses AICodeReviewer's pipeline headless; these types cover the
 * GitHub-payload mapping, config, and orchestration seams.
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import type { CodeReview, ParsedDiff, ReviewComment } from '../AICodeReviewer';
import type {
  PullRequestDiffCoverage,
  Repository,
  Review,
  ReviewComment as GitHubReviewComment,
} from '../GitHubService';

export type ReviewSeverity = 'error' | 'warning' | 'info';
export type ReviewCategory = 'bug' | 'style' | 'performance' | 'security' | 'best-practice';

export interface ReviewBotConfig {
  version: '1';
  maxReviewPasses: number;
  /** Inline-post floor; findings below it fold into the summary counts only */
  severityThreshold: ReviewSeverity;
  suppressCategories: ReviewCategory[];
  /** When false (default), request_changes verdicts post as COMMENT reviews */
  requestChangesEnabled: boolean;
  ai: {
    enabled: boolean;
    model: string;
    maxDiffChars: number;
  };
}

/** One inline comment ready for GitHub's review API */
export interface AnchoredComment {
  path: string;
  line: number;
  side: 'RIGHT';
  body: string;
  fingerprint: string;
}

export interface ReviewPayload {
  event: 'COMMENT' | 'REQUEST_CHANGES';
  body: string;
  comments: AnchoredComment[];
  /** Findings that could not be anchored to a diff line (rendered in summary) */
  unanchored: ReviewComment[];
}

/** Single LLM completion call — the only AI seam the generator needs */
export type CompletionFn = (prompt: string) => Promise<string>;

/** AI inline-comment provider injected into AICodeReviewer.reviewChanges */
export type AiCommentProvider = (parsed: ParsedDiff, diff: string) => Promise<ReviewComment[]>;

export interface ReviewBotResult {
  posted: boolean;
  reason: 'posted' | 'budget-exhausted' | 'forbidden' | 'summary-only-fallback' | 'empty-diff';
  passNumber: number;
  inlineCount: number;
  review: CodeReview | null;
  /** Present when the diff came from the paginated-files fallback (large PR,
   *  406 on the single-diff request) and some files were skipped to stay
   *  under the reconstruction size cap. */
  diffCoverage?: {
    includedFiles: number;
    totalFiles: number;
    skippedFiles: string[];
  };
}

/**
 * Narrow structural view of GitHubService used by the orchestrator — tests
 * substitute a plain object; the CI shim passes the real service.
 */
export interface ReviewBotGitHub {
  getPullRequestDiffWithCoverage(
    repo: Repository,
    prNumber: number
  ): Promise<PullRequestDiffCoverage>;
  getReviewComments(repo: Repository, prNumber: number): Promise<GitHubReviewComment[]>;
  listIssueComments(repo: Repository, issueNumber: number): Promise<Array<{ body?: string }>>;
  createIssueComment(repo: Repository, issueNumber: number, body: string): Promise<unknown>;
  submitReview(
    repo: Repository,
    prNumber: number,
    review: {
      event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
      body?: string;
      comments?: Array<{ path: string; line: number; side: 'RIGHT'; body: string }>;
    }
  ): Promise<Review>;
}

export interface ReviewCiEnv {
  githubToken: string;
  provider: 'openrouter' | 'deepseek' | 'none';
  apiKey: string | null;
  repo: Repository;
  prNumber: number;
}
