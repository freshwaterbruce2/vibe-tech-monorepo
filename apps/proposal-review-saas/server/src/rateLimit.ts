import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

export interface RateLimitOptions {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
  message: string;
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Creates a small in-memory Fastify pre-handler for per-client route limiting.
 */
export function createRateLimitPreHandler(
  options: RateLimitOptions,
): preHandlerAsyncHookHandler {
  const records = new Map<string, RateLimitRecord>();
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of records) {
      if (record.resetAt <= now) {
        records.delete(key);
      }
    }
  }, options.windowMs);

  cleanupInterval.unref?.();

  return async function rateLimitPreHandler(req: FastifyRequest, reply: FastifyReply) {
    const now = Date.now();
    const key = `${options.keyPrefix}:${getClientId(req)}`;
    let record = records.get(key);

    if (!record || record.resetAt <= now) {
      record = {
        count: 0,
        resetAt: now + options.windowMs,
      };
      records.set(key, record);
    }

    record.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    const remaining = Math.max(0, options.maxRequests - record.count);

    reply.header('Retry-After', String(retryAfterSeconds));
    reply.header('X-RateLimit-Limit', String(options.maxRequests));
    reply.header('X-RateLimit-Remaining', String(remaining));
    reply.header('X-RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));

    if (record.count > options.maxRequests) {
      return reply.code(429).send({
        error: options.message,
        retryAfter: retryAfterSeconds,
      });
    }
  };
}

function getClientId(req: FastifyRequest): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstForwardedIp = forwardedIp?.split(',')[0]?.trim();

  return firstForwardedIp && firstForwardedIp.length > 0 ? firstForwardedIp : (req.ip ?? 'unknown');
}
