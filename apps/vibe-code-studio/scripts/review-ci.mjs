/**
 * review-ci.mjs — thin CI entry for the PR review bot (spec 15). Runs under
 * `pnpm exec tsx apps/vibe-code-studio/scripts/review-ci.mjs` in the
 * vcs-review workflow (tsx resolves the TypeScript src imports). ALL logic
 * lives in src/services/review/* (covered by the diff-coverage gate); this
 * shim only wires env → services → orchestrator.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AICodeReviewer } from '../src/services/AICodeReviewer';
import { DeepSeekService } from '../src/services/ai/providers/DeepSeekService';
import { OpenRouterService } from '../src/services/ai/providers/OpenRouterService';
import { GitHubService } from '../src/services/GitHubService';
import { createAiCommentProvider } from '../src/services/review/aiCommentGenerator';
import { runReviewBot } from '../src/services/review/orchestrator';
import { DEFAULT_REVIEW_CONFIG, parseReviewConfig } from '../src/services/review/reviewConfig';
import { parseReviewCiEnv } from '../src/services/review/reviewEnv';

/** CLI progress output (console.log is lint-restricted to warn/error) */
function writeLine(message) {
  process.stdout.write(`${message}\n`);
}

function loadConfig() {
  try {
    const content = readFileSync(join(process.cwd(), '.vcs', 'review.json'), 'utf8');
    const result = parseReviewConfig(content);
    if (!result.ok) {
      console.warn(`[ReviewBot] .vcs/review.json invalid (${result.error}) — using defaults`);
      return DEFAULT_REVIEW_CONFIG;
    }
    for (const warning of result.warnings) console.warn(`[ReviewBot] ${warning}`);
    return result.config;
  } catch {
    return DEFAULT_REVIEW_CONFIG; // no config file — defaults
  }
}

async function main() {
  const envResult = parseReviewCiEnv(process.env);
  if (!envResult.ok) {
    console.error(`[ReviewBot] ${envResult.error}`);
    process.exitCode = 1;
    return;
  }
  const { env } = envResult;
  const config = loadConfig();

  let complete = null;
  if (config.ai.enabled && env.provider === 'openrouter') {
    const service = new OpenRouterService({ apiKey: env.apiKey });
    complete = prompt => service.generateText(prompt, { model: config.ai.model });
  } else if (config.ai.enabled && env.provider === 'deepseek') {
    const service = new DeepSeekService({ apiKey: env.apiKey });
    complete = prompt => service.generateText(prompt, { model: 'deepseek-chat' });
  }

  // The orchestrator never calls generateAIReview, so the reviewer's
  // UnifiedAIService dependency is a dead seam here — stub it.
  const aiStub = { sendContextualMessage: () => Promise.resolve({ content: '' }) };
  const reviewer = new AICodeReviewer(aiStub);

  const result = await runReviewBot({
    github: new GitHubService(env.githubToken),
    reviewer,
    repo: env.repo,
    prNumber: env.prNumber,
    config,
    ...(complete ? { aiProvider: createAiCommentProvider(complete, config) } : {}),
    log: message => writeLine(message),
  });

  writeLine(
    `[ReviewBot] ${result.reason} — pass ${result.passNumber}, ` +
      `${result.inlineCount} inline comment(s)`
  );
}

main().catch(err => {
  console.error('[ReviewBot] Fatal:', err);
  process.exitCode = 1;
});
