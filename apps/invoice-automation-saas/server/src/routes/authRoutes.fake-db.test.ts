// @vitest-environment node
import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  authUserId: undefined as string | undefined,
  createSessionToken: vi.fn(() => 'session-token'),
  getSessionCookieName: vi.fn(() => 'invoiceflow_session'),
  getSessionTtlSeconds: vi.fn(() => 3600),
  getUserById: vi.fn(),
  hashPassword: vi.fn(async () => ({
    salt: Buffer.from('salt'),
    hash: Buffer.from('hash'),
  })),
  verifyPassword: vi.fn(async (password: string) => password === 'correct-password'),
}));

vi.mock('../auth.js', () => ({
  createSessionToken: state.createSessionToken,
  getSessionCookieName: state.getSessionCookieName,
  getSessionTtlSeconds: state.getSessionTtlSeconds,
  getUserById: state.getUserById,
  hashPassword: state.hashPassword,
  verifyPassword: state.verifyPassword,
}));

import { registerAuthRoutes } from './authRoutes.js';

interface UserRecord {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  password_salt: Buffer;
  password_hash: Buffer;
}

class FakeStatement {
  constructor(
    private readonly sql: string,
    private readonly db: FakeDb,
  ) {}

  get(...params: unknown[]): unknown {
    if (this.sql === 'select id from users where email = ?') {
      const [email] = params as [string];
      const user = this.db.findByEmail(email);
      return user ? { id: user.id } : undefined;
    }

    if (
      this.sql ===
      'select id, email, full_name, company_name, password_salt, password_hash from users where email = ?'
    ) {
      const [email] = params as [string];
      return this.db.findByEmail(email);
    }

    throw new Error(`Unsupported fake-db get SQL: ${this.sql}`);
  }

  run(...params: unknown[]): { changes: number } {
    if (
      this.sql ===
      'insert into users (id, email, full_name, company_name, password_salt, password_hash, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?)'
    ) {
      const [id, email, fullName, companyName, salt, hash] = params as [
        string,
        string,
        string | null,
        string | null,
        Buffer,
        Buffer,
        string,
        string,
      ];
      this.db.users.set(id, {
        id,
        email,
        full_name: fullName,
        company_name: companyName,
        password_salt: salt,
        password_hash: hash,
      });
      return { changes: 1 };
    }

    if (
      this.sql ===
      'update users set full_name = coalesce(?, full_name), company_name = coalesce(?, company_name), updated_at = ? where id = ?'
    ) {
      const [fullName, companyName, , userId] = params as [
        string | null,
        string | null,
        string,
        string,
      ];
      const existing = this.db.users.get(userId);
      if (!existing) {
        return { changes: 0 };
      }

      this.db.users.set(userId, {
        ...existing,
        full_name: fullName ?? existing.full_name,
        company_name: companyName ?? existing.company_name,
      });
      return { changes: 1 };
    }

    throw new Error(`Unsupported fake-db run SQL: ${this.sql}`);
  }
}

class FakeDb {
  users = new Map<string, UserRecord>();

  prepare(sql: string): FakeStatement {
    return new FakeStatement(sql, this);
  }

  findByEmail(email: string): UserRecord | undefined {
    return [...this.users.values()].find((user) => user.email === email);
  }
}

const toAuthUser = (user: UserRecord) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name ?? undefined,
  companyName: user.company_name ?? undefined,
});

describe('auth routes with fake db', () => {
  let db: FakeDb;
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
      } as Response),
    ));
    state.authUserId = undefined;
    db = new FakeDb();
    db.users.set('user-1', {
      id: 'user-1',
      email: 'owner@example.com',
      full_name: 'Owner',
      company_name: 'Northwind',
      password_salt: Buffer.from('salt'),
      password_hash: Buffer.from('hash'),
    });
    state.getUserById.mockImplementation((database: FakeDb, userId: string) => {
      const user = database.users.get(userId);
      return user ? toAuthUser(user) : null;
    });

    app = Fastify();
    await app.register(cookie);
    app.addHook('preHandler', async (req) => {
      if (state.authUserId) {
        (req as unknown as { authUserId: string }).authUserId = state.authUserId;
      }
    });
    registerAuthRoutes(app, db as never);
    await app.ready();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await app.close();
  });

  it('signs up a new user and sets the session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      payload: {
        email: 'new-user@example.com',
        password: 'strong-pass',
        fullName: 'New User',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      user: {
        id: expect.any(String),
        email: 'new-user@example.com',
        fullName: 'New User',
        companyName: undefined,
      },
    });
    expect(state.hashPassword).toHaveBeenCalledWith('strong-pass');
    expect(res.headers['set-cookie']).toContain('invoiceflow_session=session-token');
  });

  it('rejects invalid credentials on login without setting a cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'owner@example.com',
        password: 'wrong-password',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({
      error: 'Invalid credentials',
    });
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('logs in an existing user and sets the session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'owner@example.com',
        password: 'correct-password',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        fullName: 'Owner',
        companyName: 'Northwind',
      },
    });
    expect(state.verifyPassword).toHaveBeenCalledWith(
      'correct-password',
      Buffer.from('salt'),
      Buffer.from('hash'),
    );
    expect(res.headers['set-cookie']).toContain('invoiceflow_session=session-token');
  });

  it('returns the current user from /api/auth/me when authUserId is set', async () => {
    state.authUserId = 'user-1';

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        fullName: 'Owner',
        companyName: 'Northwind',
      },
    });
  });

  it('clears the session cookie on logout', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      ok: true,
    });
    expect(res.headers['set-cookie']).toContain('invoiceflow_session=');
    expect(res.headers['set-cookie']).toContain('Max-Age=0');
  });
});
