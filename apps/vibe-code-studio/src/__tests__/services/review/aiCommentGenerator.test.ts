/**
 * aiCommentGenerator tests — prompt truncation, JSON extraction (fenced and
 * bare), zod rejection → [], hallucinated line clamping/dropping, provider
 * throw → [] (drop-not-fail).
 */
import { describe, expect, it, vi } from 'vitest';
import { AICodeReviewer } from '../../../services/AICodeReviewer';
import type { UnifiedAIService } from '../../../services/ai/UnifiedAIService';
import {
  buildInlinePrompt,
  createAiCommentProvider,
  parseAiComments,
} from '../../../services/review/aiCommentGenerator';
import { buildCommentableLineIndex } from '../../../services/review/diffLineIndex';
import { DEFAULT_REVIEW_CONFIG } from '../../../services/review/reviewConfig';
import { FIXTURE_DIFF } from './fixtures';

const reviewer = new AICodeReviewer({} as unknown as UnifiedAIService);
const parsed = reviewer.parseDiff(FIXTURE_DIFF);
const index = buildCommentableLineIndex(parsed);

const finding = {
  file: 'src/a.ts',
  line: 10,
  severity: 'warning',
  category: 'bug',
  message: 'Debug statement left in code',
  suggestion: 'Use the logger',
  replacement: "logger.debug('debug');",
};

describe('buildInlinePrompt', () => {
  it('lists changed files and truncates the diff to maxChars', () => {
    const prompt = buildInlinePrompt(parsed, FIXTURE_DIFF, 50);
    expect(prompt).toContain('- src/a.ts (+4/-1)');
    expect(prompt).toContain('- src/b.ts (+1/-0)');
    expect(prompt).toContain(FIXTURE_DIFF.substring(0, 50));
    expect(prompt).not.toContain('export const z'); // late diff content truncated away
  });
});

describe('parseAiComments', () => {
  it('parses a valid bare-JSON response with all fields', () => {
    const raw = JSON.stringify({ findings: [finding] });
    const comments = parseAiComments(raw, index);
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({
      file: 'src/a.ts',
      line: 10,
      severity: 'warning',
      category: 'bug',
      type: 'issue',
      suggestion: 'Use the logger',
      replacement: "logger.debug('debug');",
    });
  });

  it('extracts JSON from a fenced code block with prose around it', () => {
    const raw = `Here you go:\n\`\`\`json\n${JSON.stringify({ findings: [finding] })}\n\`\`\`\nDone!`;
    expect(parseAiComments(raw, index)).toHaveLength(1);
  });

  it('returns [] for non-JSON responses', () => {
    expect(parseAiComments('I cannot review this.', index)).toEqual([]);
  });

  it('returns [] when the schema does not match', () => {
    expect(parseAiComments('{"findings": [{"file": "x"}]}', index)).toEqual([]);
    expect(parseAiComments('{"results": []}', index)).toEqual([]);
  });

  it('clamps near-miss lines and drops hallucinated files/lines', () => {
    const raw = JSON.stringify({
      findings: [
        { ...finding, line: 15 }, // clamps to 13
        { ...finding, file: 'src/hallucinated.ts' }, // dropped
        { ...finding, line: 500 }, // dropped (out of window)
      ],
    });
    const comments = parseAiComments(raw, index);
    expect(comments).toHaveLength(1);
    expect(comments[0]?.line).toBe(13);
  });

  it('omits absent optional fields instead of writing undefined', () => {
    const raw = JSON.stringify({
      findings: [{ file: 'src/b.ts', line: 4, severity: 'info', category: 'style', message: 'm' }],
    });
    const comments = parseAiComments(raw, index);
    expect(comments[0]).not.toHaveProperty('suggestion');
    expect(comments[0]).not.toHaveProperty('replacement');
  });
});

describe('createAiCommentProvider', () => {
  it('wires completion → parse → clamp', async () => {
    const complete = vi.fn().mockResolvedValue(JSON.stringify({ findings: [finding] }));
    const provider = createAiCommentProvider(complete, DEFAULT_REVIEW_CONFIG);
    const comments = await provider(parsed, FIXTURE_DIFF);
    expect(comments).toHaveLength(1);
    expect(complete).toHaveBeenCalledWith(expect.stringContaining('unified diff'));
  });

  it('returns [] when the completion throws (heuristics still post)', async () => {
    const complete = vi.fn().mockRejectedValue(new Error('rate limited'));
    const provider = createAiCommentProvider(complete, DEFAULT_REVIEW_CONFIG);
    await expect(provider(parsed, FIXTURE_DIFF)).resolves.toEqual([]);
  });
});
