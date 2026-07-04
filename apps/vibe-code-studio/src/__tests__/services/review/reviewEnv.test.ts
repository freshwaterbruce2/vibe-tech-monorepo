/**
 * reviewEnv tests — required vars, provider selection precedence, and
 * malformed inputs.
 */
import { describe, expect, it } from 'vitest';
import { parseReviewCiEnv } from '../../../services/review/reviewEnv';

const base = {
  GITHUB_TOKEN: 'ghs_token',
  REPO: 'freshwaterbruce2/vibe-tech-monorepo',
  PR_NUMBER: '42',
};

describe('parseReviewCiEnv', () => {
  it('parses a full environment with OpenRouter preferred over DeepSeek', () => {
    const result = parseReviewCiEnv({
      ...base,
      OPENROUTER_API_KEY: 'or-key',
      DEEPSEEK_API_KEY: 'ds-key',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.env).toEqual({
      githubToken: 'ghs_token',
      provider: 'openrouter',
      apiKey: 'or-key',
      repo: { owner: 'freshwaterbruce2', repo: 'vibe-tech-monorepo' },
      prNumber: 42,
    });
  });

  it('falls back to DeepSeek, then to none', () => {
    const deepseek = parseReviewCiEnv({ ...base, DEEPSEEK_API_KEY: 'ds-key' });
    expect(deepseek.ok && deepseek.env.provider).toBe('deepseek');
    const none = parseReviewCiEnv(base);
    expect(none.ok && none.env.provider).toBe('none');
    expect(none.ok && none.env.apiKey).toBeNull();
  });

  it('requires GITHUB_TOKEN', () => {
    const result = parseReviewCiEnv({ ...base, GITHUB_TOKEN: '  ' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/GITHUB_TOKEN/);
  });

  it('rejects malformed REPO', () => {
    for (const bad of [undefined, 'no-slash', 'a/b/c', 'a b/c']) {
      const result = parseReviewCiEnv({ ...base, REPO: bad });
      expect(result.ok).toBe(false);
    }
  });

  it('rejects missing or non-integer PR_NUMBER', () => {
    for (const bad of [undefined, 'abc', '0', '-3', '1.5']) {
      const result = parseReviewCiEnv({ ...base, PR_NUMBER: bad });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.error).toMatch(/PR_NUMBER/);
    }
  });

  it('ignores whitespace-only AI keys', () => {
    const result = parseReviewCiEnv({ ...base, OPENROUTER_API_KEY: '   ' });
    expect(result.ok && result.env.provider).toBe('none');
  });
});
