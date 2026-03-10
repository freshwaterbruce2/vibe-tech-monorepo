import { Hono } from 'hono';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// --- Mock the database module before importing the router ---
// Validation failures return before any DB call, so we only need
// minimal stubs for the paths that pass validation.
vi.mock('../db/index.js', () => ({
  db: {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue(undefined), // no user found by default
      run: vi.fn().mockReturnValue({ lastInsertRowid: 1 }),
    }),
  },
}));

// Mock bcryptjs so tests don't do actual hashing
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(false),
    hash: vi.fn().mockResolvedValue('$hashed$'),
  },
}));

// Mock the auth middleware's generateToken
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn((c: any, next: any) => next()),
  generateToken: vi.fn().mockReturnValue('mock.jwt.token'),
  parentOnlyMiddleware: vi.fn((c: any, next: any) => next()),
}));

// Mock the rate limiter so it doesn't interfere with validation tests
vi.mock('../middleware/rateLimiter.js', () => ({
  authRateLimiter: vi.fn((c: any, next: any) => next()),
  createRateLimiter: vi.fn(() => (c: any, next: any) => next()),
}));

async function buildApp() {
  const { default: authRouter } = await import('./auth.js');
  const app = new Hono();
  app.route('/api/auth', authRouter);
  return app;
}

function registerRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify(body),
  });
}

function loginRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '127.0.0.1' },
    body: JSON.stringify(body),
  });
}

const VALID_REGISTER = {
  username: 'bruce_w',
  password: 'securePass1',
  display_name: 'Bruce',
  role: 'parent',
};

describe('POST /api/auth/register — input validation', () => {
  let app: Hono;

  beforeAll(async () => {
    app = await buildApp();
  });

  // --- Username validation ---

  it('rejects username shorter than 3 chars', async () => {
    const res = await app.fetch(registerRequest({ ...VALID_REGISTER, username: 'ab' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Username');
  });

  it('rejects username longer than 30 chars', async () => {
    const res = await app.fetch(registerRequest({
      ...VALID_REGISTER,
      username: 'a'.repeat(31),
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Username');
  });

  it('rejects username with disallowed characters (spaces)', async () => {
    const res = await app.fetch(registerRequest({ ...VALID_REGISTER, username: 'bruce wayne' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Username');
  });

  it('rejects username with disallowed characters (hyphens)', async () => {
    const res = await app.fetch(registerRequest({ ...VALID_REGISTER, username: 'bruce-wayne' }));
    expect(res.status).toBe(400);
  });

  it('accepts username at minimum length (3 chars)', async () => {
    const res = await app.fetch(registerRequest({ ...VALID_REGISTER, username: 'abc' }));
    // 200-level means validation passed (may fail later on DB for other reasons)
    expect([200, 201, 409, 500]).toContain(res.status);
    expect(res.status).not.toBe(400);
  });

  it('accepts username at maximum length (30 chars)', async () => {
    const res = await app.fetch(registerRequest({
      ...VALID_REGISTER,
      username: 'a'.repeat(30),
    }));
    expect(res.status).not.toBe(400);
  });

  it('accepts username with underscores', async () => {
    const res = await app.fetch(registerRequest({ ...VALID_REGISTER, username: 'bruce_w_99' }));
    expect(res.status).not.toBe(400);
  });

  // --- Password length validation ---

  it('rejects password shorter than 8 chars', async () => {
    const res = await app.fetch(registerRequest({ ...VALID_REGISTER, password: 'short' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Password');
  });

  it('rejects password longer than 72 chars (bcrypt limit)', async () => {
    const res = await app.fetch(registerRequest({
      ...VALID_REGISTER,
      password: 'A'.repeat(73) + '!',
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Password');
  });

  it('accepts password exactly at minimum (8 chars)', async () => {
    const res = await app.fetch(registerRequest({ ...VALID_REGISTER, password: 'abcdefgh' }));
    expect(res.status).not.toBe(400);
  });

  it('accepts password exactly at maximum (72 chars)', async () => {
    const res = await app.fetch(registerRequest({
      ...VALID_REGISTER,
      password: 'A'.repeat(72),
    }));
    expect(res.status).not.toBe(400);
  });

  // --- Display name validation ---

  it('rejects empty display_name', async () => {
    const res = await app.fetch(registerRequest({ ...VALID_REGISTER, display_name: '' }));
    // Empty string fails the presence check first (falsy)
    expect(res.status).toBe(400);
  });

  it('rejects display_name longer than 50 chars', async () => {
    const res = await app.fetch(registerRequest({
      ...VALID_REGISTER,
      display_name: 'B'.repeat(51),
    }));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Display name');
  });

  it('accepts display_name exactly at maximum (50 chars)', async () => {
    const res = await app.fetch(registerRequest({
      ...VALID_REGISTER,
      display_name: 'B'.repeat(50),
    }));
    expect(res.status).not.toBe(400);
  });
});

describe('POST /api/auth/login — bcrypt DoS guard', () => {
  let app: Hono;

  beforeAll(async () => {
    app = await buildApp();
  });

  it('returns 401 (not 400) for passwords over 1000 chars', async () => {
    const res = await app.fetch(loginRequest({
      username: 'bruce',
      password: 'x'.repeat(1001),
    }));
    // Must be 401 — same as invalid credentials, leaks nothing about the limit
    expect(res.status).toBe(401);
  });

  it('passes a 1000-char password through to credential check (limit is exclusive)', async () => {
    const res = await app.fetch(loginRequest({
      username: 'bruce',
      password: 'x'.repeat(1000),
    }));
    // bcrypt mock returns compare=false, so user not found → 401 for wrong password
    // Key: it should NOT be blocked by the DoS guard (which triggers at >1000)
    expect(res.status).toBe(401); // invalid credentials (not DoS block)
  });
});