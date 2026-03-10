import type { Context, MiddlewareHandler, Next } from 'hono';

/**
 * Configuration for the rate limiter.
 */
export interface RateLimiterConfig {
  /** Maximum number of requests allowed within the window. */
  maxRequests: number;
  /** Duration of the rate limit window in milliseconds. */
  windowMs: number;
  /** Optional message to return when the rate limit is exceeded. */
  message?: string;
}

/**
 * Internal record tracking request counts per IP within a window.
 */
interface RateRecord {
  count: number;
  windowStart: number;
}

/**
 * In-memory rate limiter middleware for Hono.
 *
 * Uses a Map keyed by IP address. Each entry tracks the number of requests
 * made within the current sliding window. When the count exceeds maxRequests,
 * the middleware returns HTTP 429 Too Many Requests.
 *
 * The store is automatically cleaned of expired entries to prevent unbounded
 * memory growth in long-running servers.
 *
 * @param config - Rate limiter configuration
 * @returns Hono middleware handler
 *
 * @example
 * // 5 requests per minute per IP
 * app.use('/api/auth/login', createRateLimiter({ maxRequests: 5, windowMs: 60_000 }));
 */
export function createRateLimiter(config: RateLimiterConfig): MiddlewareHandler {
  const { maxRequests, windowMs, message = 'Too many requests. Please try again later.' } = config;

  // In-memory store: IP address -> rate record
  const store = new Map<string, RateRecord>();

  // Cleanup interval: remove expired entries every windowMs to prevent memory leaks.
  // Using setInterval with unref() so it does not prevent the process from exiting.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      if (now - record.windowStart >= windowMs) {
        store.delete(ip);
      }
    }
  }, windowMs);

  // Allow the interval to be dereferenced in test environments
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  return async function rateLimiterMiddleware(c: Context, next: Next) {
    // Extract client IP — Hono provides c.req.raw for the underlying Request.
    // For Node.js adapter, the real IP may be in X-Forwarded-For when behind a proxy.
    const forwarded = c.req.header('x-forwarded-for');
    const firstForwarded = forwarded ? (forwarded.split(',')[0] ?? forwarded).trim() : undefined;
    const ip = firstForwarded ?? (c.env?.['remoteAddr'] as string | undefined) ?? 'unknown';

    const now = Date.now();
    const existing = store.get(ip);

    if (existing && now - existing.windowStart < windowMs) {
      // Within the current window
      existing.count += 1;

      if (existing.count > maxRequests) {
        const retryAfter = Math.ceil((windowMs - (now - existing.windowStart)) / 1000);
        c.header('Retry-After', String(retryAfter));
        c.header('X-RateLimit-Limit', String(maxRequests));
        c.header('X-RateLimit-Remaining', '0');
        c.header('X-RateLimit-Reset', String(Math.ceil((existing.windowStart + windowMs) / 1000)));
        return c.json({ error: message }, 429);
      }
    } else {
      // Start a new window for this IP
      store.set(ip, { count: 1, windowStart: now });
    }

    // Set informational rate limit headers on successful requests
    const record = store.get(ip)!;
    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil((record.windowStart + windowMs) / 1000)));

    return await next();
  };
}

/**
 * Pre-configured auth rate limiter: 5 requests per IP per minute.
 * Apply to POST /api/auth/login and POST /api/auth/register.
 */
export const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60_000, // 1 minute
  message: 'Too many authentication attempts. Please wait 1 minute before trying again.',
});
