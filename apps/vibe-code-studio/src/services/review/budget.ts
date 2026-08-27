/**
 * Review-pass budget — bounds AI cost on force-push-happy PRs (spec AC #9).
 * Each pass posts one summary comment carrying SUMMARY_MARKER; the pass count
 * is simply how many such comments exist. GitHub is the only store.
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import { BUDGET_MARKER, SUMMARY_MARKER } from './fingerprint';
import type { ReviewBotConfig } from './types';

/** Number of review passes already posted on this PR */
export function countReviewPasses(issueCommentBodies: Array<string | undefined>): number {
  return issueCommentBodies.filter(body => body?.includes(SUMMARY_MARKER)).length;
}

export function isBudgetExhausted(passes: number, config: ReviewBotConfig): boolean {
  return passes >= config.maxReviewPasses;
}

/** True when the "budget exhausted" notice was already posted (post once) */
export function budgetExhaustedAlreadyPosted(
  issueCommentBodies: Array<string | undefined>
): boolean {
  return issueCommentBodies.some(body => body?.includes(BUDGET_MARKER));
}

export function buildBudgetExhaustedBody(config: ReviewBotConfig): string {
  return [
    `⛔ **Review budget exhausted for this PR** (${config.maxReviewPasses} passes).`,
    '',
    'Further pushes will not be re-reviewed automatically. Raise `maxReviewPasses`',
    'in `.vcs/review.json` or re-open the PR to reset the budget.',
    '',
    BUDGET_MARKER,
  ].join('\n');
}
