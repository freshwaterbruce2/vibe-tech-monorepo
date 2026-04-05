import { describe, expect, it } from 'vitest';

import { shouldRegisterServiceWorker } from './serviceWorkerRegistration';

describe('shouldRegisterServiceWorker', () => {
  it('returns false for Capacitor native runtimes served from https localhost', () => {
    const runtime = {
      location: { protocol: 'https:' },
      Capacitor: {
        isNativePlatform: () => true,
      },
    };

    expect(shouldRegisterServiceWorker(runtime as never)).toBe(false);
  });

  it('returns false for capacitor protocol runtimes', () => {
    const runtime = {
      location: { protocol: 'capacitor:' },
    };

    expect(shouldRegisterServiceWorker(runtime as never)).toBe(false);
  });

  it('returns true for standard browser runtimes', () => {
    const runtime = {
      location: { protocol: 'https:' },
      Capacitor: {
        isNativePlatform: () => false,
      },
    };

    expect(shouldRegisterServiceWorker(runtime as never)).toBe(true);
  });
});
