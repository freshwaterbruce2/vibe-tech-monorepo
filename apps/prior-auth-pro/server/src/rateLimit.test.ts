import { afterAll, describe, expect, it } from 'vitest';

import { app } from './app.js';

afterAll(async () => {
  await app.close();
});

describe('PriorAuthPro rate limits', () => {
  it('returns HTTP 429 after repeated login attempts', async () => {
    const payload = {
      email: 'owner@example.com',
      password: 'wrong-password',
    };

    let response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload,
    });

    expect(response.statusCode).not.toBe(429);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload,
      });
    }

    expect(response.statusCode).toBe(429);
  });
});
