/**
 * CI environment parsing for the review bot — pure, injected env record so
 * the scripts/review-ci.ts shim stays logic-free (coverage gate scope).
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import type { ReviewCiEnv } from './types';

export type ReviewCiEnvResult = { ok: true; env: ReviewCiEnv } | { ok: false; error: string };

/**
 * Required: GITHUB_TOKEN, REPO ("owner/name"), PR_NUMBER. AI keys optional —
 * absent keys degrade to provider 'none' (heuristics-only, never a red run).
 * OpenRouter preferred over DeepSeek when both are present (user decision).
 */
export function parseReviewCiEnv(env: Record<string, string | undefined>): ReviewCiEnvResult {
  const githubToken = env['GITHUB_TOKEN']?.trim();
  if (!githubToken) {
    return { ok: false, error: 'GITHUB_TOKEN is required' };
  }
  const repoRaw = env['REPO']?.trim() ?? '';
  const repoMatch = repoRaw.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!repoMatch) {
    return { ok: false, error: `REPO must be "owner/name", got "${repoRaw}"` };
  }
  const prNumber = Number(env['PR_NUMBER']);
  if (!Number.isInteger(prNumber) || prNumber < 1) {
    return { ok: false, error: `PR_NUMBER must be a positive integer, got "${env['PR_NUMBER']}"` };
  }
  const openrouterKey = env['OPENROUTER_API_KEY']?.trim();
  const deepseekKey = env['DEEPSEEK_API_KEY']?.trim();
  let provider: ReviewCiEnv['provider'] = 'none';
  let apiKey: string | null = null;
  if (openrouterKey) {
    provider = 'openrouter';
    apiKey = openrouterKey;
  } else if (deepseekKey) {
    provider = 'deepseek';
    apiKey = deepseekKey;
  }
  return {
    ok: true,
    env: {
      githubToken,
      provider,
      apiKey,
      repo: { owner: repoMatch[1]!, repo: repoMatch[2]! },
      prNumber,
    },
  };
}
