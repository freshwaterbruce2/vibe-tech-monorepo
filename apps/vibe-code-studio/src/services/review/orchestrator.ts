/**
 * Review-bot orchestrator — the single code path both the GitHub Action and
 * the local CLI run (spec AC #8). Sequence: budget check FIRST (cost gate,
 * before any AI), fetch diff, review, map to GitHub payload, dedup, post
 * summary, post review. 422 → one summary-only retry; 403 (fork PR with a
 * read-only token) → logged, non-fatal.
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import type { AICodeReviewer, CodeReview } from '../AICodeReviewer';
import type { Repository } from '../GitHubService';
import { logger } from '../Logger';
import {
  buildBudgetExhaustedBody,
  budgetExhaustedAlreadyPosted,
  countReviewPasses,
  isBudgetExhausted,
} from './budget';
import { filterDuplicates } from './dedup';
import { buildReviewPayload, buildSummaryBody } from './githubPayload';
import type {
  AiCommentProvider,
  ReviewBotConfig,
  ReviewBotGitHub,
  ReviewBotResult,
  ReviewPayload,
} from './types';

export interface ReviewBotDeps {
  github: ReviewBotGitHub;
  reviewer: AICodeReviewer;
  repo: Repository;
  prNumber: number;
  config: ReviewBotConfig;
  aiProvider?: AiCommentProvider;
  log?: (message: string) => void;
}

function isStatusError(error: unknown, status: number): boolean {
  return error instanceof Error && error.message.includes(`GitHub API error ${status}`);
}

/** Run one full review pass against a PR. Never throws for expected failures. */
export async function runReviewBot(deps: ReviewBotDeps): Promise<ReviewBotResult> {
  const log = deps.log ?? ((message: string) => logger.info(message));
  const { github, repo, prNumber, config } = deps;

  // 1. Budget gate — before any diff fetch or AI spend (spec AC #9)
  const issueComments = await github.listIssueComments(repo, prNumber);
  const bodies = issueComments.map(comment => comment.body);
  const passNumber = countReviewPasses(bodies) + 1;
  if (isBudgetExhausted(passNumber - 1, config)) {
    if (!budgetExhaustedAlreadyPosted(bodies)) {
      await github.createIssueComment(repo, prNumber, buildBudgetExhaustedBody(config));
    }
    log(`[ReviewBot] Budget exhausted (${config.maxReviewPasses} passes) — skipping review`);
    return { posted: false, reason: 'budget-exhausted', passNumber, inlineCount: 0, review: null };
  }

  // 2. Fetch + review the diff
  const diff = await github.getPullRequestDiff(repo, prNumber);
  if (!diff.trim()) {
    log('[ReviewBot] Empty diff — nothing to review');
    return { posted: false, reason: 'empty-diff', passNumber, inlineCount: 0, review: null };
  }
  const reviewOptions = deps.aiProvider ? { aiCommentProvider: deps.aiProvider } : {};
  const review = await deps.reviewer.reviewChanges(diff, reviewOptions);
  const parsed = deps.reviewer.parseDiff(diff);
  const payload = buildReviewPayload(review, parsed, config);

  // 3. Dedup against previously posted inline comments (spec AC #5)
  const existing = await github.getReviewComments(repo, prNumber);
  const deduped = filterDuplicates(
    payload.comments,
    existing.map(comment => comment.body)
  );
  const dedupSkipped = payload.comments.length - deduped.length;

  // 4. Post summary (also the budget counter), then the review itself
  const summary = buildSummaryBody(review, {
    passNumber,
    maxPasses: config.maxReviewPasses,
    aiEnabled: Boolean(deps.aiProvider),
    inlinePosted: deduped.length,
    dedupSkipped,
  });
  try {
    await github.createIssueComment(repo, prNumber, summary);
    return await postReview(deps, { ...payload, comments: deduped }, review, passNumber, log);
  } catch (error) {
    if (isStatusError(error, 403)) {
      log('[ReviewBot] 403 posting to PR (fork with read-only token?) — skipping, not failing');
      return { posted: false, reason: 'forbidden', passNumber, inlineCount: 0, review };
    }
    throw error;
  }
}

/** Submit the review; on 422 retry once with findings folded into the body */
async function postReview(
  deps: ReviewBotDeps,
  payload: ReviewPayload,
  review: CodeReview,
  passNumber: number,
  log: (message: string) => void
): Promise<ReviewBotResult> {
  const { github, repo, prNumber } = deps;
  try {
    await github.submitReview(repo, prNumber, {
      event: payload.event,
      body: payload.body,
      ...(payload.comments.length > 0 ? { comments: payload.comments } : {}),
    });
    log(`[ReviewBot] Posted review with ${payload.comments.length} inline comment(s)`);
    return {
      posted: true,
      reason: 'posted',
      passNumber,
      inlineCount: payload.comments.length,
      review,
    };
  } catch (error) {
    if (!isStatusError(error, 422)) {
      throw error;
    }
    log('[ReviewBot] 422 on inline review — retrying summary-only');
    const folded = payload.comments.map(c => `- \`${c.path}:${c.line}\`\n${c.body}`).join('\n\n');
    await github.submitReview(repo, prNumber, {
      event: payload.event,
      body: `${payload.body}\n\n${folded}`,
    });
    return {
      posted: true,
      reason: 'summary-only-fallback',
      passNumber,
      inlineCount: 0,
      review,
    };
  }
}
