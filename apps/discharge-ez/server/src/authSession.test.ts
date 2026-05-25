import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const AUTH_SECRET = 'discharge-ez-local-auth-secret-12345';

describe('authSession', () => {
  let tempDir: string;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    tempDir = mkdtempSync(join(tmpdir(), 'discharge-ez-auth-'));
    vi.stubEnv('DISCHARGE_EZ_DB_PATH', join(tempDir, 'auth.test.db'));
  });

  afterEach(async () => {
    const db = await import('./db.js');
    db.closeDatabaseForTests();
    vi.unstubAllEnvs();
    vi.useRealTimers();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('requires AUTH_SECRET and a SQLite user before auth is configured', async () => {
    const auth = await import('./authSession.js');

    await expect(auth.isAuthConfigured()).resolves.toBe(false);
    expect(auth.getAuthConfigError()).toContain('AUTH_SECRET');
    await expect(auth.readAuthStatus(undefined)).resolves.toEqual({
      configured: false,
      user: null,
    });
  });

  it('seeds the first SQLite operator user from bootstrap env once', async () => {
    vi.stubEnv('AUTH_SECRET', AUTH_SECRET);
    vi.stubEnv('DISCHARGE_EZ_BOOTSTRAP_EMAIL', 'owner@discharge-ez.test');
    vi.stubEnv('DISCHARGE_EZ_BOOTSTRAP_NAME', 'DischargeEZ Admin');
    vi.stubEnv('DISCHARGE_EZ_BOOTSTRAP_PASSWORD', 'super-secret-password');

    const auth = await import('./authSession.js');

    await expect(auth.isAuthConfigured()).resolves.toBe(true);
    await expect(auth.verifyLogin('owner@discharge-ez.test', 'super-secret-password')).resolves.toMatchObject({
      id: 'discharge-ez-owner',
      email: 'owner@discharge-ez.test',
      fullName: 'DischargeEZ Admin',
    });
    await expect(auth.verifyLogin('owner@discharge-ez.test', 'wrong-password')).resolves.toBeNull();
  });

  it('round-trips a database-backed session cookie', async () => {
    vi.stubEnv('AUTH_SECRET', AUTH_SECRET);
    vi.stubEnv('DISCHARGE_EZ_BOOTSTRAP_EMAIL', 'owner@discharge-ez.test');
    vi.stubEnv('DISCHARGE_EZ_BOOTSTRAP_NAME', 'DischargeEZ Admin');
    vi.stubEnv('DISCHARGE_EZ_BOOTSTRAP_PASSWORD', 'super-secret-password');

    const auth = await import('./authSession.js');
    const user = await auth.verifyLogin('owner@discharge-ez.test', 'super-secret-password');

    expect(user).not.toBeNull();
    const cookie = auth.buildSessionCookie(user!);

    expect(cookie).toContain('invoiceflow_session=');
    expect(cookie).toContain('HttpOnly');
    await expect(auth.readAuthStatus(cookie)).resolves.toEqual({
      configured: true,
      user,
    });
    expect(auth.buildLogoutCookie()).toContain('Max-Age=0');
  });
});
