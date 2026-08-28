/**
 * review-local.mjs — local pre-push parity for the PR review bot (spec 15
 * AC #8): runs the IDENTICAL pipeline CI runs, against `git diff`, and prints
 * the report instead of posting (tsx resolves the TypeScript src imports).
 * Usage:
 *   pnpm exec tsx apps/vibe-code-studio/scripts/review-local.mjs [baseRef]
 * Default baseRef: origin/main
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AICodeReviewer } from '../src/services/AICodeReviewer';
import { buildReviewPayload } from '../src/services/review/githubPayload';
import { formatLocalReport } from '../src/services/review/reporter';
import { DEFAULT_REVIEW_CONFIG, parseReviewConfig } from '../src/services/review/reviewConfig';

/** CLI report output (console.log is lint-restricted to warn/error) */
function writeLine(message) {
  process.stdout.write(`${message}\n`);
}

function loadConfig() {
  try {
    const content = readFileSync(join(process.cwd(), '.vcs', 'review.json'), 'utf8');
    const result = parseReviewConfig(content);
    return result.ok ? result.config : DEFAULT_REVIEW_CONFIG;
  } catch {
    return DEFAULT_REVIEW_CONFIG;
  }
}

async function main() {
  const baseRef = process.argv[2] ?? 'origin/main';
  const diff = execFileSync('git', ['diff', `${baseRef}...HEAD`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (!diff.trim()) {
    writeLine(`[ReviewBot] No diff against ${baseRef} — nothing to review`);
    return;
  }
  const config = loadConfig();
  const aiStub = { sendContextualMessage: () => Promise.resolve({ content: '' }) };
  const reviewer = new AICodeReviewer(aiStub);
  const review = await reviewer.reviewChanges(diff);
  const payload = buildReviewPayload(review, reviewer.parseDiff(diff), config);
  writeLine(formatLocalReport(review, payload));
  if (review.verdict === 'request_changes') process.exitCode = 1;
}

main().catch(err => {
  console.error('[ReviewBot] Fatal:', err);
  process.exitCode = 1;
});
