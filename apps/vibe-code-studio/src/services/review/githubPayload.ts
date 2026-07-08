/**
 * ReviewComment[] → GitHub Pull Request Review API payload mapping — the
 * field-shape translation spec 15 describes, plus severity-threshold and
 * category-suppression filtering and fingerprint markers.
 *
 * Suggestion-fence rule (deviation from the spec's example): GitHub's
 * ```suggestion fence is a LITERAL replacement, but ReviewComment.suggestion
 * is prose — prose renders as plain text; only AI findings carrying an exact
 * `replacement` string get the one-click fence.
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import type { CodeReview, ReviewComment } from '../AICodeReviewer';
import type { ParsedDiff } from '../AICodeReviewer';
import { buildCommentableLineIndex, nearestAnchor } from './diffLineIndex';
import { commentFingerprint, fpMarker, SUMMARY_MARKER } from './fingerprint';
import type { AnchoredComment, ReviewBotConfig, ReviewPayload, ReviewSeverity } from './types';

/** AI findings may carry an exact replacement (see aiCommentGenerator) */
export type BotReviewComment = ReviewComment & { replacement?: string };

const SEVERITY_RANK: Record<ReviewSeverity, number> = { error: 3, warning: 2, info: 1 };

export function meetsThreshold(severity: ReviewSeverity, threshold: ReviewSeverity): boolean {
  return SEVERITY_RANK[severity] >= SEVERITY_RANK[threshold];
}

/** Markdown body for one inline comment, fingerprint marker included */
export function buildCommentBody(comment: BotReviewComment): string {
  const parts = [`**${comment.severity}** (${comment.category}): ${comment.message}`];
  if (comment.suggestion) {
    parts.push('', `_Suggestion:_ ${comment.suggestion}`);
  }
  if (comment.replacement) {
    parts.push('', '```suggestion', comment.replacement, '```');
  }
  parts.push('', fpMarker(commentFingerprint(comment.file, comment.line, comment.message)));
  return parts.join('\n');
}

function anchorComments(
  comments: BotReviewComment[],
  parsed: ParsedDiff
): { anchored: AnchoredComment[]; unanchored: ReviewComment[] } {
  const index = buildCommentableLineIndex(parsed);
  const anchored: AnchoredComment[] = [];
  const unanchored: ReviewComment[] = [];
  for (const comment of comments) {
    const line = nearestAnchor(index, comment.file, comment.line);
    if (line === null) {
      unanchored.push(comment);
      continue;
    }
    anchored.push({
      path: comment.file,
      line,
      side: 'RIGHT',
      body: buildCommentBody(comment),
      fingerprint: commentFingerprint(comment.file, comment.line, comment.message),
    });
  }
  return { anchored, unanchored };
}

/** Full mapping: filter → anchor → event selection → bodies with markers */
export function buildReviewPayload(
  review: CodeReview,
  parsed: ParsedDiff,
  config: ReviewBotConfig
): ReviewPayload {
  const eligible = (review.comments as BotReviewComment[]).filter(
    comment =>
      meetsThreshold(comment.severity, config.severityThreshold) &&
      !config.suppressCategories.includes(comment.category)
  );
  const { anchored, unanchored } = anchorComments(eligible, parsed);
  const event =
    review.verdict === 'request_changes' && config.requestChangesEnabled
      ? 'REQUEST_CHANGES'
      : 'COMMENT';
  return { event, body: buildReviewBody(review, unanchored), comments: anchored, unanchored };
}

function buildReviewBody(review: CodeReview, unanchored: ReviewComment[]): string {
  const lines = [`AI review verdict: **${review.verdict}** (quality ${review.qualityScore}/100)`];
  if (unanchored.length > 0) {
    lines.push('', 'Findings outside the visible diff:');
    for (const comment of unanchored) {
      lines.push(
        `- \`${comment.file}:${comment.line}\` **${comment.severity}**: ${comment.message}`
      );
    }
  }
  return lines.join('\n');
}

export interface SummaryMeta {
  passNumber: number;
  maxPasses: number;
  aiEnabled: boolean;
  inlinePosted: number;
  dedupSkipped: number;
  /** Set when the diff was reconstructed from the paginated files API
   *  (GitHub 406'd the single-diff request as too large) and some files
   *  had to be skipped to stay under the reconstruction size cap. */
  diffCoverage?: { includedFiles: number; totalFiles: number; skippedFiles: string[] };
}

/** PR-level summary comment (also the budget counter via SUMMARY_MARKER) */
export function buildSummaryBody(review: CodeReview, meta: SummaryMeta): string {
  const { issueCount } = review;
  const lines = [
    `## 🤖 VCS Review — pass ${meta.passNumber}/${meta.maxPasses}`,
    '',
    `**Verdict:** ${review.verdict} · **Quality:** ${review.qualityScore}/100`,
    `**Findings:** ${issueCount.errors} errors · ${issueCount.warnings} warnings · ` +
      `${issueCount.info} info`,
    `**Inline comments:** ${meta.inlinePosted} posted` +
      (meta.dedupSkipped > 0 ? ` (${meta.dedupSkipped} unchanged, skipped)` : ''),
  ];
  if (meta.diffCoverage) {
    const { includedFiles, totalFiles } = meta.diffCoverage;
    lines.push(
      '',
      `⚠️ **Large PR:** reviewed ${includedFiles} of ${totalFiles} changed files ` +
        '(diff exceeded the single-request size limit; remaining files were skipped).'
    );
  }
  if (!meta.aiEnabled) {
    lines.push('', '_AI comments disabled (no API key configured) — heuristic checks only._');
  }
  lines.push('', SUMMARY_MARKER);
  return lines.join('\n');
}
