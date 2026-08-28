import {
  BrowserAnalytics,
  initAnalytics,
  shouldDisableAnalytics,
  trackCheckoutStart,
  trackChurnRisk,
  trackSignup,
  trackUpgrade,
} from '../src/index.js';
import { describe, expect, it } from 'vitest';

describe('@vibetech/analytics', () => {
  it('disables analytics on desktop by default', () => {
    expect(
      shouldDisableAnalytics({
        runtime: { isDesktop: true },
      }),
    ).toBe(true);
  });

  it('can stay enabled on browser-like runtimes', () => {
    const client = new BrowserAnalytics({
      runtime: {
        isDesktop: false,
        location: {
          href: 'https://example.test/dashboard',
          pathname: '/dashboard',
        },
      },
    });

    expect(client.enabled).toBe(true);
  });

  it('returns a disabled client when desktop opt-out applies', () => {
    const client = initAnalytics({
      runtime: { isDesktop: true },
    });

    expect(client.enabled).toBe(false);
  });

  it('tracks standardized monetization funnel events', () => {
    const events: Array<{ name: string; properties?: Record<string, unknown> }> = [];
    const client = {
      track: (name: string, properties?: Record<string, unknown>) => {
        events.push({ name, properties });
      },
      revenue: (amount: number, currency?: string, properties?: Record<string, unknown>) => {
        events.push({ name: 'Purchase', properties: { amount, currency, ...properties } });
      },
    };

    trackSignup(client, {
      tenantId: 'tenant-a',
      appId: 'invoice-automation-saas',
      plan: 'free',
    });
    trackCheckoutStart(client, {
      tenantId: 'tenant-a',
      appId: 'invoice-automation-saas',
      plan: 'pro',
    });
    trackUpgrade(client, {
      tenantId: 'tenant-a',
      appId: 'invoice-automation-saas',
      previousPlan: 'free',
      plan: 'pro',
      amount: 19,
      currency: 'USD',
    });
    trackChurnRisk(client, {
      tenantId: 'tenant-a',
      appId: 'invoice-automation-saas',
      reason: 'usage_dropped',
    });

    expect(events.map((event) => event.name)).toEqual([
      'Signup Completed',
      'Checkout Started',
      'Purchase',
      'Churn Risk Detected',
    ]);
    expect(events[0]?.properties).toMatchObject({
      tenant_id: 'tenant-a',
      app_id: 'invoice-automation-saas',
    });
  });
});
