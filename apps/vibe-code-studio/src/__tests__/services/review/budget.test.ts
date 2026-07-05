/**
 * budget tests — pass counting from summary markers, exhaustion boundary,
 * and one-time exhausted-notice posting.
 */
import { describe, expect, it } from 'vitest';
import {
  budgetExhaustedAlreadyPosted,
  buildBudgetExhaustedBody,
  countReviewPasses,
  isBudgetExhausted,
} from '../../../services/review/budget';
import { BUDGET_MARKER, SUMMARY_MARKER } from '../../../services/review/fingerprint';
import { DEFAULT_REVIEW_CONFIG } from '../../../services/review/reviewConfig';

const config = { ...DEFAULT_REVIEW_CONFIG, maxReviewPasses: 2 };

describe('countReviewPasses', () => {
  it('counts only bodies carrying the summary marker', () => {
    const bodies = [
      `## review pass\n${SUMMARY_MARKER}`,
      'a human comment',
      undefined,
      `another pass ${SUMMARY_MARKER}`,
      BUDGET_MARKER,
    ];
    expect(countReviewPasses(bodies)).toBe(2);
    expect(countReviewPasses([])).toBe(0);
  });
});

describe('isBudgetExhausted', () => {
  it('exhausts exactly at maxReviewPasses', () => {
    expect(isBudgetExhausted(1, config)).toBe(false);
    expect(isBudgetExhausted(2, config)).toBe(true);
    expect(isBudgetExhausted(3, config)).toBe(true);
  });
});

describe('exhausted notice', () => {
  it('is posted once — detection via BUDGET_MARKER', () => {
    expect(budgetExhaustedAlreadyPosted(['hello', undefined])).toBe(false);
    expect(budgetExhaustedAlreadyPosted([buildBudgetExhaustedBody(config)])).toBe(true);
  });

  it('body names the configured cap and the config file', () => {
    const body = buildBudgetExhaustedBody(config);
    expect(body).toContain('2 passes');
    expect(body).toContain('.vcs/review.json');
    expect(body).toContain(BUDGET_MARKER);
  });
});
