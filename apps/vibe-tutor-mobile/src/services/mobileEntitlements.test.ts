import { describe, expect, it } from 'vitest';
import {
  canUseFeature,
  evaluateMobilePlan,
  VIBE_TUTOR_FEATURES,
} from './mobileEntitlements';

describe('mobile monetization entitlements', () => {
  it('locks premium tutoring on the free tier', () => {
    expect(canUseFeature('free', VIBE_TUTOR_FEATURES.premiumLessons)).toBe(false);
  });

  it('unlocks premium tutoring for paid tiers', () => {
    expect(canUseFeature('plus', VIBE_TUTOR_FEATURES.premiumLessons)).toBe(true);
    expect(canUseFeature('family', VIBE_TUTOR_FEATURES.parentInsights)).toBe(true);
  });

  it('reports deterministic entitlement state for the mobile app factory surface', () => {
    const result = evaluateMobilePlan('plus');

    expect(result[VIBE_TUTOR_FEATURES.premiumLessons]?.enabled).toBe(true);
    expect(result[VIBE_TUTOR_FEATURES.parentInsights]?.enabled).toBe(false);
  });
});
