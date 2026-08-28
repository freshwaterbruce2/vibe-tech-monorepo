/**
 * AI inline-comment generator — turns one LLM completion into validated
 * ReviewComment[]s clamped to lines that exist in the diff. Never throws:
 * any parse/validation/provider failure degrades to [] so the heuristic
 * review still posts (drop-not-fail).
 * Spec: FEATURE_SPECS/competitive-gaps/15-PR-REVIEW-BOT.md
 */
import { z } from 'zod';
import type { ParsedDiff } from '../AICodeReviewer';
import { logger } from '../Logger';
import { buildCommentableLineIndex, nearestAnchor } from './diffLineIndex';
import type { CommentableLineIndex } from './diffLineIndex';
import type { BotReviewComment } from './githubPayload';
import type { AiCommentProvider, CompletionFn, ReviewBotConfig } from './types';

const aiFindingSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().min(1),
  severity: z.enum(['error', 'warning', 'info']),
  category: z.enum(['bug', 'style', 'performance', 'security', 'best-practice']),
  message: z.string().min(1),
  suggestion: z.string().optional(),
  // Exact replacement code for the flagged line(s) — becomes a one-click
  // GitHub ```suggestion fence. Distinct from prose `suggestion`.
  replacement: z.string().optional(),
});

const aiResponseSchema = z.object({ findings: z.array(aiFindingSchema) });

/** Prompt over the diff, truncated to keep cost bounded (config.maxDiffChars) */
export function buildInlinePrompt(parsed: ParsedDiff, diff: string, maxChars: number): string {
  const fileList = parsed.files.map(f => `- ${f.path} (+${f.additions}/-${f.deletions})`);
  return [
    'You are a precise code reviewer. Review ONLY the added lines of this unified diff.',
    'Report genuine bugs, security issues, performance problems, or best-practice',
    'violations. Do NOT report style nits or issues you are unsure about.',
    '',
    'Files changed:',
    ...fileList,
    '',
    'Respond with ONLY a JSON object, no prose, shaped exactly as:',
    '{"findings": [{"file": "<path from diff>", "line": <new-file line number>,',
    ' "severity": "error"|"warning"|"info", "category": "bug"|"style"|"performance"|',
    '"security"|"best-practice", "message": "<what is wrong>",',
    ' "suggestion": "<prose advice, optional>",',
    ' "replacement": "<exact replacement code for that line, optional>"}]}',
    'Return {"findings": []} when nothing meets the bar.',
    '',
    'Diff:',
    diff.substring(0, maxChars),
  ].join('\n');
}

/** Extract the first JSON object from a completion (tolerates code fences) */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  return start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;
}

/** Validate + clamp AI output; anything invalid is dropped, never thrown */
export function parseAiComments(raw: string, index: CommentableLineIndex): BotReviewComment[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    logger.warn('[ReviewBot] AI response was not valid JSON — dropping AI comments');
    return [];
  }
  const result = aiResponseSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn('[ReviewBot] AI response failed schema validation — dropping AI comments');
    return [];
  }
  const comments: BotReviewComment[] = [];
  for (const finding of result.data.findings) {
    const line = nearestAnchor(index, finding.file, finding.line);
    if (line === null) continue; // hallucinated file/line — drop
    comments.push({
      file: finding.file,
      line,
      severity: finding.severity,
      category: finding.category,
      type: 'issue',
      message: finding.message,
      ...(finding.suggestion !== undefined ? { suggestion: finding.suggestion } : {}),
      ...(finding.replacement !== undefined ? { replacement: finding.replacement } : {}),
    });
  }
  return comments;
}

/** Wire a CompletionFn into the AiCommentProvider shape AICodeReviewer takes */
export function createAiCommentProvider(
  complete: CompletionFn,
  config: ReviewBotConfig
): AiCommentProvider {
  return async (parsed, diff) => {
    try {
      const prompt = buildInlinePrompt(parsed, diff, config.ai.maxDiffChars);
      const raw = await complete(prompt);
      return parseAiComments(raw, buildCommentableLineIndex(parsed));
    } catch (error) {
      logger.warn('[ReviewBot] AI completion failed — continuing heuristics-only', error);
      return [];
    }
  };
}
