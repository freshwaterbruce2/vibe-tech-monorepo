import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

const STRICT_AUTH_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/signup',
])

export const registerRateLimits = async (app: FastifyInstance): Promise<void> => {
  app.addHook('onRoute', (routeOptions) => {
    const url =
      typeof routeOptions.url === 'string' ? routeOptions.url : ''
    if (STRICT_AUTH_PATHS.has(url)) {
      const cfg = (routeOptions.config ?? {}) as {
        rateLimit?: { max: number; timeWindow: string }
      }
      cfg.rateLimit = { max: 5, timeWindow: '1 minute' }
      routeOptions.config = cfg
    }
  })

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip ?? 'unknown',
  })
}
