import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  getUserById,
  hashPassword,
  parseSessionToken,
  verifyPassword,
} from '../src/index.js';

describe('@vibetech/auth', () => {
  afterEach(() => {
    delete process.env.AUTH_SECRET;
    delete process.env.SESSION_TTL_SECONDS;
    vi.useRealTimers();
  });

  it('returns the default session ttl when env is absent', () => {
    expect(getSessionTtlSeconds()).toBe(60 * 60 * 24 * 7);
  });

  it('honors a valid session ttl override', () => {
    process.env.SESSION_TTL_SECONDS = '7200';
    expect(getSessionTtlSeconds()).toBe(7200);
  });

  it('honors short session ttl overrides for donor-app compatibility', () => {
    process.env.SESSION_TTL_SECONDS = '30';
    expect(getSessionTtlSeconds()).toBe(30);
  });

  it('hashes and verifies passwords', async () => {
    const password = 'correct-horse-battery-staple';
    const { salt, hash } = await hashPassword(password);

    expect(await verifyPassword(password, salt, hash)).toBe(true);
    expect(await verifyPassword('wrong-password', salt, hash)).toBe(false);
  });

  it('creates and parses a signed session token', () => {
    process.env.AUTH_SECRET = '12345678901234567890123456789012';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T16:00:00.000Z'));

    const token = createSessionToken({
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'User One',
    });

    expect(parseSessionToken(token)).toEqual({
      sub: 'user-1',
      email: 'user@example.com',
      iat: 1778860800,
      exp: 1779465600,
    });
  });

  it('rejects expired session tokens', () => {
    process.env.AUTH_SECRET = '12345678901234567890123456789012';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T16:00:00.000Z'));

    const token = createSessionToken({
      id: 'user-1',
      email: 'user@example.com',
    });

    vi.setSystemTime(new Date('2026-05-23T16:00:01.000Z'));
    expect(parseSessionToken(token)).toBeNull();
  });

  it('looks up a user row from the database adapter shape', () => {
    const db = {
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({
          id: 'user-1',
          email: 'user@example.com',
          full_name: 'User One',
          company_name: 'VibeTech',
        }),
      }),
    };

    expect(getUserById(db as never, 'user-1')).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'User One',
      companyName: 'VibeTech',
    });
  });

  it('returns the invoiceflow session cookie name', () => {
    expect(getSessionCookieName()).toBe('invoiceflow_session');
  });

  it('rejects tampered session tokens', () => {
    process.env.AUTH_SECRET = '12345678901234567890123456789012';
    const token = createSessionToken({
      id: 'user-1',
      email: 'user@example.com',
    });

    const parts = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: 'user-1',
        email: 'attacker@example.com',
        iat: 1778860800,
        exp: 1779465600,
      }),
    )
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    expect(parseSessionToken(tamperedToken)).toBeNull();
  });
});
