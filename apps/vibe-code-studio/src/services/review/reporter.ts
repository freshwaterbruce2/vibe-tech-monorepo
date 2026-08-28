/**
 * Shared review report text — the local CLI prints exactly what CI posts
 * (spec AC #8: one code path, no local/hosted drift).
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import type { CodeReview } from '../AICodeReviewer';
import type { ReviewPayload } from './types';

/** Plain-text report of a review + its would-be GitHub payload */
export function formatLocalReport(review: CodeReview, payload: ReviewPayload): string {
  const { issueCount } = review;
  const lines = [
    `VCS Review — verdict: ${review.verdict} · quality ${review.qualityScore}/100`,
    `Findings: ${issueCount.errors} errors, ${issueCount.warnings} warnings, ` +
      `${issueCount.info} info`,
    `Would post: ${payload.comments.length} inline comment(s) as ${payload.event}`,
    '',
  ];
  for (const comment of payload.comments) {
    const firstLine = comment.body.split('\n')[0] ?? '';
    lines.push(`  ${comment.path}:${comment.line}  ${firstLine}`);
  }
  if (payload.unanchored.length > 0) {
    lines.push('', 'Outside the visible diff:');
    for (const comment of payload.unanchored) {
      lines.push(`  ${comment.file}:${comment.line}  [${comment.severity}] ${comment.message}`);
    }
  }
  return lines.join('\n');
}
