/**
 * reviewConfig tests — defaults, JSONC, partial overrides, schema errors,
 * and the multiAgent deferred-with-warning behavior.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_REVIEW_CONFIG, parseReviewConfig } from '../../../services/review/reviewConfig';

describe('parseReviewConfig', () => {
  it('empty object yields all defaults', () => {
    const result = parseReviewConfig('{}');
    expect(result).toEqual({ ok: true, config: DEFAULT_REVIEW_CONFIG, warnings: [] });
  });

  it('supports JSONC comments and partial overrides layered on defaults', () => {
    const result = parseReviewConfig(`{
      // budget for force-push-happy branches
      "maxReviewPasses": 3,
      "severityThreshold": "info",
      "ai": { "model": "custom/model" } /* keep other ai defaults */
    }`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.maxReviewPasses).toBe(3);
    expect(result.config.severityThreshold).toBe('info');
    expect(result.config.ai.model).toBe('custom/model');
    expect(result.config.ai.maxDiffChars).toBe(DEFAULT_REVIEW_CONFIG.ai.maxDiffChars);
    expect(result.config.suppressCategories).toEqual(DEFAULT_REVIEW_CONFIG.suppressCategories);
  });

  it('rejects invalid JSON with a readable error', () => {
    const result = parseReviewConfig('not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/^Invalid JSON:/);
  });

  it('rejects schema violations with a dotted path', () => {
    const result = parseReviewConfig('{"maxReviewPasses": 0}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/^Schema error at maxReviewPasses/);
  });

  it('rejects unknown severity values', () => {
    const result = parseReviewConfig('{"severityThreshold": "fatal"}');
    expect(result.ok).toBe(false);
  });

  it('accepts multiAgent config but warns that it is unsupported (mock service)', () => {
    const result = parseReviewConfig('{"multiAgent": {"enabled": true}}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/multiAgent/);
  });

  it('multiAgent disabled produces no warning', () => {
    const result = parseReviewConfig('{"multiAgent": {"enabled": false}}');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toHaveLength(0);
  });

  it('accepts full custom config', () => {
    const result = parseReviewConfig(
      JSON.stringify({
        version: '1',
        maxReviewPasses: 10,
        severityThreshold: 'error',
        suppressCategories: ['style', 'best-practice'],
        requestChangesEnabled: true,
        ai: { enabled: false, model: 'm', maxDiffChars: 5000 },
      })
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.requestChangesEnabled).toBe(true);
    expect(result.config.ai.enabled).toBe(false);
    expect(result.config.suppressCategories).toEqual(['style', 'best-practice']);
  });
});
