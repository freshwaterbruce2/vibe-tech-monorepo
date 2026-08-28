/**
 * Review-bot config parser — `.vcs/review.json`, mirroring the TaskParser
 * pattern: zod safeParse over JSONC, never throws, file IO injected by the
 * caller (renderer via Tauri fs, CI via node:fs).
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import { z } from 'zod';
import { stripJsonComments } from '../tasks/TaskParser';
import type { ReviewBotConfig } from './types';

export const DEFAULT_REVIEW_CONFIG: ReviewBotConfig = {
  version: '1',
  maxReviewPasses: 5,
  // 'warning' floor is load-bearing: the heuristic semicolon rule fires on
  // nearly every line, so unfiltered info-level findings would spam PRs.
  severityThreshold: 'warning',
  suppressCategories: ['style'],
  requestChangesEnabled: false,
  ai: {
    enabled: true,
    model: 'deepseek/deepseek-chat',
    maxDiffChars: 24_000,
  },
};

const reviewFileSchema = z.object({
  version: z.literal('1').default('1'),
  maxReviewPasses: z.number().int().min(1).max(50).optional(),
  severityThreshold: z.enum(['error', 'warning', 'info']).optional(),
  suppressCategories: z
    .array(z.enum(['bug', 'style', 'performance', 'security', 'best-practice']))
    .optional(),
  requestChangesEnabled: z.boolean().optional(),
  ai: z
    .object({
      enabled: z.boolean().optional(),
      model: z.string().min(1).optional(),
      maxDiffChars: z.number().int().min(1000).optional(),
    })
    .optional(),
  // Accepted so a future MultiAgentReview integration doesn't break old
  // configs, but rejected as unsupported today (the service is mock).
  multiAgent: z.object({ enabled: z.boolean().optional() }).optional(),
});

export type ReviewConfigResult =
  | { ok: true; config: ReviewBotConfig; warnings: string[] }
  | { ok: false; error: string };

/** Parse + validate review.json content over defaults. Never throws. */
export function parseReviewConfig(content: string): ReviewConfigResult {
  let raw: unknown;
  try {
    raw = JSON.parse(stripJsonComments(content));
  } catch (err) {
    return { ok: false, error: `Invalid JSON: ${(err as Error).message}` };
  }
  const result = reviewFileSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue && issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return { ok: false, error: `Schema error at ${path}: ${issue?.message ?? 'unknown'}` };
  }
  const parsed = result.data;
  const warnings: string[] = [];
  if (parsed.multiAgent?.enabled) {
    warnings.push('multiAgent.enabled is not supported yet (MultiAgentReview is mock) — ignored');
  }
  const config: ReviewBotConfig = {
    version: '1',
    maxReviewPasses: parsed.maxReviewPasses ?? DEFAULT_REVIEW_CONFIG.maxReviewPasses,
    severityThreshold: parsed.severityThreshold ?? DEFAULT_REVIEW_CONFIG.severityThreshold,
    suppressCategories: parsed.suppressCategories ?? DEFAULT_REVIEW_CONFIG.suppressCategories,
    requestChangesEnabled:
      parsed.requestChangesEnabled ?? DEFAULT_REVIEW_CONFIG.requestChangesEnabled,
    ai: {
      enabled: parsed.ai?.enabled ?? DEFAULT_REVIEW_CONFIG.ai.enabled,
      model: parsed.ai?.model ?? DEFAULT_REVIEW_CONFIG.ai.model,
      maxDiffChars: parsed.ai?.maxDiffChars ?? DEFAULT_REVIEW_CONFIG.ai.maxDiffChars,
    },
  };
  return { ok: true, config, warnings };
}
