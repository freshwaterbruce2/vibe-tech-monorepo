import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { openAuthDb, upsertUser } from '@vibetech/auth';
import {
  isGeneratedAuthConfigured,
  getGeneratedAuthConfigError,
  readGeneratedAuthStatus,
  verifyGeneratedLogin,
  buildGeneratedSessionCookie,
  buildGeneratedLogoutCookie,
} from './authSession.js';

describe('authSession tests', () => {
  const TEST_DB_PATH = 'D:\\databases\\vibe-booking-test-auth-unit.db';
  const VALID_SECRET = 'super-secret-auth-key-must-be-32-chars-long';

  beforeAll(async () => {
    vi.stubEnv('AUTH_DB_PATH', TEST_DB_PATH);
    const db = openAuthDb(TEST_DB_PATH);
    await upsertUser(db, {
      email: 'admin@vibebooking.test',
      password: 'correct-password-123',
      isAdmin: true,
      fullName: 'Vibe Booking Admin',
    });
    db.close();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv('AUTH_SECRET', VALID_SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    // Restore AUTH_DB_PATH to ensure other test runs are not affected
    vi.stubEnv('AUTH_DB_PATH', TEST_DB_PATH);
  });

  describe('isGeneratedAuthConfigured', () => {
    it('should return false if AUTH_SECRET is not set', () => {
      vi.stubEnv('AUTH_SECRET', '');
      expect(isGeneratedAuthConfigured()).toBe(false);
    });

    it('should return false if AUTH_SECRET is less than 32 characters', () => {
      vi.stubEnv('AUTH_SECRET', 'short-secret');
      expect(isGeneratedAuthConfigured()).toBe(false);
    });

    it('should return true if AUTH_SECRET is at least 32 characters', () => {
      vi.stubEnv('AUTH_SECRET', VALID_SECRET);
      expect(isGeneratedAuthConfigured()).toBe(true);
    });
  });

  describe('getGeneratedAuthConfigError', () => {
    it('should return the correct error message', () => {
      expect(getGeneratedAuthConfigError()).toBe(
        'AUTH_SECRET must be set to at least 32 characters to enable auth.'
      );
    });
  });

  describe('readGeneratedAuthStatus', () => {
    it('should return not configured if AUTH_SECRET is invalid', () => {
      vi.stubEnv('AUTH_SECRET', 'short-secret');
      const status = readGeneratedAuthStatus('invoiceflow_session=sometoken');
      expect(status).toEqual({
        configured: false,
        user: null,
      });
    });

    it('should return configured with null user if cookieHeader is undefined', () => {
      const status = readGeneratedAuthStatus(undefined);
      expect(status).toEqual({
        configured: true,
        user: null,
      });
    });

    it('should return configured with null user if cookieHeader does not contain session cookie', () => {
      const status = readGeneratedAuthStatus('other_cookie=value; another=one');
      expect(status).toEqual({
        configured: true,
        user: null,
      });
    });

    it('should return configured with null user if session token is invalid or malformed', () => {
      const status = readGeneratedAuthStatus('invoiceflow_session=invalid-token-here');
      expect(status).toEqual({
        configured: true,
        user: null,
      });
    });

    it('should parse and return the user details if session cookie is valid', () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        isAdmin: true,
      };
      const cookieHeader = buildGeneratedSessionCookie(user);
      const status = readGeneratedAuthStatus(cookieHeader);

      expect(status).toEqual({
        configured: true,
        user,
      });
    });
  });

  describe('verifyGeneratedLogin', () => {
    it('should return the authenticated user if credentials are correct', async () => {
      const user = await verifyGeneratedLogin('admin@vibebooking.test', 'correct-password-123');
      expect(user).not.toBeNull();
      expect(user?.email).toBe('admin@vibebooking.test');
      expect(user?.isAdmin).toBe(true);
    });

    it('should return null if password is incorrect', async () => {
      const user = await verifyGeneratedLogin('admin@vibebooking.test', 'wrong-password');
      expect(user).toBeNull();
    });

    it('should return null if email is not found', async () => {
      const user = await verifyGeneratedLogin('nonexistent@vibebooking.test', 'correct-password-123');
      expect(user).toBeNull();
    });
  });

  describe('buildGeneratedSessionCookie', () => {
    const user = {
      id: 'test-user-id',
      email: 'test@example.com',
      isAdmin: false,
    };

    it('should build a non-secure Lax cookie when not in production and not HTTPS APP_BASE_URL', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('APP_BASE_URL', 'http://localhost:3000');

      const cookie = buildGeneratedSessionCookie(user);
      expect(cookie).toContain('invoiceflow_session=');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('Secure');
      expect(cookie).not.toContain('SameSite=None');
    });

    it('should build a secure None cookie when NODE_ENV is production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('APP_BASE_URL', 'http://localhost:3000');

      const cookie = buildGeneratedSessionCookie(user);
      expect(cookie).toContain('invoiceflow_session=');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=None');
      expect(cookie).toContain('Secure');
      expect(cookie).not.toContain('SameSite=Lax');
    });

    it('should build a secure None cookie when APP_BASE_URL is HTTPS', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('APP_BASE_URL', 'https://vibe-booking.com');

      const cookie = buildGeneratedSessionCookie(user);
      expect(cookie).toContain('invoiceflow_session=');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=None');
      expect(cookie).toContain('Secure');
      expect(cookie).not.toContain('SameSite=Lax');
    });
  });

  describe('buildGeneratedLogoutCookie', () => {
    it('should build logout cookie with Max-Age=0 and correct attributes in non-production/HTTP', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('APP_BASE_URL', 'http://localhost:3000');

      const cookie = buildGeneratedLogoutCookie();
      expect(cookie).toContain('invoiceflow_session=;');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Max-Age=0');
      expect(cookie).not.toContain('Secure');
    });

    it('should build logout cookie with Secure and SameSite=None in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('APP_BASE_URL', 'http://localhost:3000');

      const cookie = buildGeneratedLogoutCookie();
      expect(cookie).toContain('invoiceflow_session=;');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=None');
      expect(cookie).toContain('Max-Age=0');
      expect(cookie).toContain('Secure');
    });

    it('should build logout cookie with Secure and SameSite=None when APP_BASE_URL is HTTPS', () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('APP_BASE_URL', 'https://vibe-booking.com');

      const cookie = buildGeneratedLogoutCookie();
      expect(cookie).toContain('invoiceflow_session=;');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=None');
      expect(cookie).toContain('Max-Age=0');
      expect(cookie).toContain('Secure');
    });
  });
});
