// @vitest-environment node
import Fastify from 'fastify'
import { afterEach, describe, expect, it } from 'vitest'

import { registerRateLimits } from './rateLimit.js'

describe('rate limit', () => {
  let app: ReturnType<typeof Fastify>

  afterEach(async () => {
    await app?.close()
  })

  it('returns 429 on the 6th request to a strict auth route', async () => {
    app = Fastify({ logger: false })
    await registerRateLimits(app)

    app.post('/api/auth/login', async () => ({ ok: true }))

    await app.ready()

    for (let i = 0; i < 5; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        remoteAddress: '203.0.113.10',
      })
      expect(res.statusCode).toBe(200)
    }

    const sixth = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      remoteAddress: '203.0.113.10',
    })
    expect(sixth.statusCode).toBe(429)
  })

  it('also rate-limits /api/auth/signup at 5/min', async () => {
    app = Fastify({ logger: false })
    await registerRateLimits(app)

    app.post('/api/auth/signup', async () => ({ ok: true }))

    await app.ready()

    let last = 0
    for (let i = 0; i < 6; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        remoteAddress: '203.0.113.20',
      })
      last = res.statusCode
    }
    expect(last).toBe(429)
  })

  it('applies global 100/min default to non-strict routes', async () => {
    app = Fastify({ logger: false })
    await registerRateLimits(app)

    app.get('/api/data', async () => ({ ok: true }))

    await app.ready()

    const res = await app.inject({
      method: 'GET',
      url: '/api/data',
      remoteAddress: '203.0.113.30',
    })
    expect(res.statusCode).toBe(200)
  })

  it('rate limits are per-IP, not global', async () => {
    app = Fastify({ logger: false })
    await registerRateLimits(app)
    app.post('/api/auth/login', async () => ({ ok: true }))
    await app.ready()

    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        remoteAddress: '203.0.113.40',
      })
    }
    const blockedForFirstIp = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      remoteAddress: '203.0.113.40',
    })
    expect(blockedForFirstIp.statusCode).toBe(429)

    const allowedForSecondIp = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      remoteAddress: '203.0.113.41',
    })
    expect(allowedForSecondIp.statusCode).toBe(200)
  })
})
