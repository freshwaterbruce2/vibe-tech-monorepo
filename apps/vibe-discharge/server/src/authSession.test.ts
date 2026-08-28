import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { openAuthDb, upsertUser } from '@vibetech/auth';

const AUTH_SECRET = 'discharge-ez-local-auth-secret-12345';
const TEST_DB_PATH = 'D:\\databases\\discharge-test-auth-unit.db';

describe('authSession', () => {
  beforeAll(async () => {
    vi.stubEnv('AUTH_DB_PATH', TEST_DB_PATH);
    const db = openAuthDb(TEST_DB_PATH);
    await upsertUser(db, {
      email: 'owner@discharge-ez.test',
      password: 'super-secret-password',
      isAdmin: true,
      fullName: 'DischargeEZ Admin',
    });
    db.close();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('requires AUTH_SECRET before auth is configured', async () => {
    vi.stubEnv('AUTH_SECRET', '');
    const auth = await import('./authSession.js');

    await expect(auth.isAuthConfigured()).resolves.toBe(false);
    expect(auth.getAuthConfigError()).toContain('AUTH_SECRET');
    await expect(auth.readAuthStatus(undefined)).resolves.toEqual({
      configured: false,
      user: null,
    });
  });

  it('verifies login against the central DB store', async () => {
    vi.stubEnv('AUTH_SECRET', AUTH_SECRET);
    const auth = await import('./authSession.js');

    await expect(auth.isAuthConfigured()).resolves.toBe(true);
    await expect(auth.verifyLogin('owner@discharge-ez.test', 'super-secret-password')).resolves.toMatchObject({
      email: 'owner@discharge-ez.test',
      fullName: 'DischargeEZ Admin',
    });
    await expect(auth.verifyLogin('owner@discharge-ez.test', 'wrong-password')).resolves.toBeNull();
  });

  it('round-trips a database-backed session cookie', async () => {
    vi.stubEnv('AUTH_SECRET', AUTH_SECRET);
    const auth = await import('./authSession.js');
    const user = await auth.verifyLogin('owner@discharge-ez.test', 'super-secret-password');

    expect(user).not.toBeNull();
    const cookie = auth.buildSessionCookie(user!);

    expect(cookie).toContain('invoiceflow_session=');
    expect(cookie).toContain('HttpOnly');
    await expect(auth.readAuthStatus(cookie)).resolves.toEqual({
      configured: true,
      user: {
        id: user!.id,
        email: 'owner@discharge-ez.test',
        fullName: 'DischargeEZ Admin',
      },
    });
    expect(auth.buildLogoutCookie()).toContain('Max-Age=0');
  });
});

