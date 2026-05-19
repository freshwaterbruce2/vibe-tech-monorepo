import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { createRateLimitPreHandler } from './rateLimit.js';

describe('createRateLimitPreHandler', () => {
  it('returns 429 after the client exceeds the route limit', async () => {
    const app = Fastify();
    app.get(
      '/limited',
      {
        preHandler: createRateLimitPreHandler({
          keyPrefix: 'test',
          maxRequests: 2,
          windowMs: 60_000,
          message: 'Too many test requests',
        }),
      },
      async () => ({ ok: true }),
    );

    const request = async () =>
      await app.inject({
        method: 'GET',
        url: '/limited',
        headers: {
          'x-forwarded-for': '203.0.113.10',
        },
      });

    expect((await request()).statusCode).toBe(200);
    expect((await request()).statusCode).toBe(200);

    const limited = await request();
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({
      error: 'Too many test requests',
      retryAfter: 60,
    });
    expect(limited.headers['x-ratelimit-remaining']).toBe('0');

    await app.close();
  });
});
