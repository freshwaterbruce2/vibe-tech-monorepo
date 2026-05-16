import { BrowserAnalytics, initAnalytics, shouldDisableAnalytics } from '../src/index.js';
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
});
