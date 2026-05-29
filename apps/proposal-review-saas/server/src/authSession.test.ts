import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { openAuthDb, upsertUser } from '@vibetech/auth';
import {
  buildGeneratedLogoutCookie,
  buildGeneratedSessionCookie,
  getGeneratedAuthConfigError,
  isGeneratedAuthConfigured,
  readGeneratedAuthStatus,
  verifyGeneratedLogin,
} from './authSession.js';

describe('authSession', () => {
  const testDbPath = 'D:\\databases\\proposal-review-test-auth-unit.db';

  beforeAll(async () => {
    vi.stubEnv('AUTH_DB_PATH', testDbPath);
    const db = openAuthDb(testDbPath);
    await upsertUser(db, {
      email: 'owner@proposal-review.test',
      password: 'super-secret-password',
      isAdmin: true,
      fullName: 'Proposal Review Admin',
    });
    db.close();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('verifies login against the central DB store', async () => {
    const user = await verifyGeneratedLogin('owner@proposal-review.test', 'super-secret-password');
    expect(user).not.toBeNull();
    expect(user?.email).toBe('owner@proposal-review.test');
    expect(user?.isAdmin).toBe(true);

    const wrong = await verifyGeneratedLogin('owner@proposal-review.test', 'wrong-password');
    expect(wrong).toBeNull();
  });

  it('requires AUTH_SECRET before a session can be parsed', () => {
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

    const user = {
      id: 'generated-owner',
      email: 'owner@proposal-review.test',
      isAdmin: true,
    };
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
