import { describe, expect, it } from 'vitest';

import { buildApiRootMetadata } from './rootMetadata.js';

describe('rootMetadata', () => {
  it('builds useful metadata for the API root', () => {
    expect(buildApiRootMetadata('https://prior-auth-pro.vercel.app')).toEqual({
      ok: true,
      app: 'prior-auth-pro',
      service: 'prior-auth-pro-api',
      frontendUrl: 'https://prior-auth-pro.vercel.app',
      health: '/api/health',
      checkout: '/api/billing/demo-checkout',
    });
  });
});
