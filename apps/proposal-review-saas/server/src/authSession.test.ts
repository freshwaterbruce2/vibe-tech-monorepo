import { describe, expect, it, vi } from 'vitest';

import {
  buildGeneratedLogoutCookie,
  buildGeneratedSessionCookie,
  getGeneratedAuthConfigError,
  getGeneratedAuthUser,
  isGeneratedAuthConfigured,
  readGeneratedAuthStatus,
  verifyGeneratedLogin,
} from './authSession.js';

describe('authSession', () => {
  it('uses the configured generated user and password defaults', () => {
    vi.stubEnv('DEMO_USER_EMAIL', 'owner@proposal-review.test');
    vi.stubEnv('DEMO_USER_NAME', 'Proposal Review Admin');
    vi.stubEnv('DEMO_USER_PASSWORD', 'super-secret-password');

    expect(getGeneratedAuthUser()).toEqual({
      id: 'generated-owner',
      email: 'owner@proposal-review.test',
      fullName: 'Proposal Review Admin',
    });
    expect(verifyGeneratedLogin('owner@proposal-review.test', 'super-secret-password')).toEqual({
      id: 'generated-owner',
      email: 'owner@proposal-review.test',
      fullName: 'Proposal Review Admin',
    });
    expect(verifyGeneratedLogin('owner@proposal-review.test', 'wrong-password')).toBeNull();
  });

  it('requires AUTH_SECRET before a session can be parsed', () => {
    vi.unstubAllEnvs();
    vi.stubEnv('AUTH_SECRET', '');

    expect(isGeneratedAuthConfigured()).toBe(false);
    expect(getGeneratedAuthConfigError()).toContain('AUTH_SECRET');
    expect(readGeneratedAuthStatus(undefined)).toEqual({
      configured: false,
      user: null,
    });
  });

  it('round-trips a generated session cookie when auth is configured', () => {
    vi.stubEnv('AUTH_SECRET', 'proposal-review-local-auth-secret-12345');
    vi.stubEnv('DEMO_USER_EMAIL', 'owner@proposal-review.test');
    vi.stubEnv('DEMO_USER_NAME', 'Proposal Review Admin');

    const user = getGeneratedAuthUser();
    const cookie = buildGeneratedSessionCookie(user);

    expect(cookie).toContain('invoiceflow_session=');
    expect(cookie).toContain('HttpOnly');
    expect(readGeneratedAuthStatus(cookie)).toEqual({
      configured: true,
      user,
    });
    expect(buildGeneratedLogoutCookie()).toContain('Max-Age=0');
  });
});
