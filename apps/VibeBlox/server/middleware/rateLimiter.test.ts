import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './rateLimiter.js';

/**
 * Helper: create a minimal Hono app with rate limiter applied,
 * returning a reusable fetch function.
 */
function buildApp(maxRequests: number, windowMs: number) {
  const app = new Hono();
  const limiter = createRateLimiter({ maxRequests, windowMs });

  app.use('/test', limiter);
  app.post('/test', (c) => c.json({ ok: true }, 200));

  return app;
}

/**
 * Helper: fire N requests from the same IP against the app.
 * Returns array of status codes.
 */
async function fireRequests(
  app: Hono,
  count: number,
  ip = '192.168.1.1',
): Promise<number[]> {
  const results: number[] = [];
  for (let i = 0; i < count; i++) {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
    });
    const res = await app.fetch(req);
    results.push(res.status);
  }
  return results;
}

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit', async () => {
    const app = buildApp(5, 60_000);
    const statuses = await fireRequests(app, 5);

    expect(statuses).toHaveLength(5);
    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it('returns 429 on the request that exceeds the limit', async () => {
    const app = buildApp(5, 60_000);
    const statuses = await fireRequests(app, 6);

    // First 5 should pass, 6th should be blocked
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('blocks all requests beyond the limit', async () => {
    const app = buildApp(3, 60_000);
    const statuses = await fireRequests(app, 10);

    const passed = statuses.filter((s) => s === 200);
    const blocked = statuses.filter((s) => s === 429);

    expect(passed).toHaveLength(3);
    expect(blocked).toHaveLength(7);
  });

  it('isolates rate limits per IP address', async () => {
    const app = buildApp(5, 60_000);

    // Exhaust the limit for IP A
    const statusesA = await fireRequests(app, 6, '10.0.0.1');
    expect(statusesA[5]).toBe(429);

    // IP B should still have a full window
    const statusesB = await fireRequests(app, 5, '10.0.0.2');
    expect(statusesB.every((s) => s === 200)).toBe(true);
  });

  it('resets the window after windowMs has elapsed', async () => {
    const app = buildApp(5, 60_000);

    // Exhaust the limit
    const first = await fireRequests(app, 6);
    expect(first[5]).toBe(429);

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    // Should be allowed again
    const second = await fireRequests(app, 1);
    expect(second[0]).toBe(200);
  });

  it('sets Retry-After header when rate limited', async () => {
    const app = buildApp(1, 60_000);

    // Use up the 1 allowed request
    await fireRequests(app, 1);

    // This one should be blocked
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    const res = await app.fetch(req);

    expect(res.status).toBe(429);
    const retryAfter = res.headers.get('Retry-After');
    expect(retryAfter).not.toBeNull();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it('sets X-RateLimit headers on successful requests', async () => {
    const app = buildApp(5, 60_000);

    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
    expect(res.headers.get('X-RateLimit-Reset')).not.toBeNull();
  });

  it('returns 429 JSON body with error message', async () => {
    const app = buildApp(1, 60_000);

    // Exhaust
    await fireRequests(app, 1);

    // Get the blocked response
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    const res = await app.fetch(req);
    const body = await res.json() as { error: string };

    expect(res.status).toBe(429);
    expect(body.error).toContain('Too many');
  });

  it('uses custom message when provided', async () => {
    const app = new Hono();
    const limiter = createRateLimiter({
      maxRequests: 1,
      windowMs: 60_000,
      message: 'Custom rate limit message',
    });
    app.use('/custom', limiter);
    app.post('/custom', (c) => c.json({ ok: true }));

    // Exhaust
    await app.fetch(new Request('http://localhost/custom', {
      method: 'POST',
      headers: { 'x-forwarded-for': '1.2.3.4' },
    }));

    // Blocked
    const res = await app.fetch(new Request('http://localhost/custom', {
      method: 'POST',
      headers: { 'x-forwarded-for': '1.2.3.4' },
    }));
    const body = await res.json() as { error: string };

    expect(body.error).toBe('Custom rate limit message');
  });

  it('handles unknown IP gracefully (no x-forwarded-for header)', async () => {
    const app = buildApp(5, 60_000);

    const req = new Request('http://localhost/test', { method: 'POST' });
    const res = await app.fetch(req);

    // Should not throw, should apply rate limiting under 'unknown' key
    expect([200, 429]).toContain(res.status);
  });

  it('decrement X-RateLimit-Remaining with each request', async () => {
    const app = buildApp(5, 60_000);
    const remainings: number[] = [];

    for (let i = 0; i < 5; i++) {
      const req = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'x-forwarded-for': '5.5.5.5' },
      });
      const res = await app.fetch(req);
      remainings.push(Number(res.headers.get('X-RateLimit-Remaining')));
    }

    expect(remainings).toEqual([4, 3, 2, 1, 0]);
  });
});

describe('authRateLimiter (pre-configured)', () => {
  it('exports a pre-configured limiter at 5 req/min', async () => {
    // Import the pre-configured limiter and verify it enforces 5 req limit
    const { authRateLimiter } = await import('./rateLimiter.js');

    const app = new Hono();
    app.use('/api/auth/login', authRateLimiter);
    app.post('/api/auth/login', (c) => c.json({ ok: true }));

    const fire = async (ip: string) => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      });
      return (await app.fetch(req)).status;
    };

    // 5 should pass
    for (let i = 0; i < 5; i++) {
      expect(await fire('99.99.99.99')).toBe(200);
    }
    // 6th should be blocked
    expect(await fire('99.99.99.99')).toBe(429);
  });
});
