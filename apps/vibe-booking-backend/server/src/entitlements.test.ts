// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hasFeature } from './entitlements.js';

describe('vibe-booking-backend entitlements', () => {
  it('grants a pro-tier feature on the pro plan', () => {
    expect(hasFeature('pro', 'analytics.revenue')).toBe(true);
  });

  it('denies a pro-tier feature on the free plan', () => {
    expect(hasFeature('free', 'analytics.revenue')).toBe(false);
  });
});
