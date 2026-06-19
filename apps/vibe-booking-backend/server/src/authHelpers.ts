import {
  type AuthUser,
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  parseSessionToken,
} from '@vibetech/auth';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import { PASSWORD_KEY_LENGTH } from './types.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
  )) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;

  const storedKey = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(
    password,
    salt,
    storedKey.length,
  )) as Buffer;

  return (
    storedKey.length === derivedKey.length &&
    timingSafeEqual(storedKey, derivedKey)
  );
}

function isSecureEnvironment(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  return process.env.APP_BASE_URL?.startsWith('https://') ?? false;
}

export function buildSessionCookie(user: AuthUser): string {
  const token = createSessionToken(user);
  const secure = isSecureEnvironment();
  const parts = [
    `${getSessionCookieName()}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${getSessionTtlSeconds()}`,
    secure ? 'Secure' : '',
  ].filter(Boolean);

  return parts.join('; ');
}

export function buildLogoutCookie(): string {
  const secure = isSecureEnvironment();
  const parts = [
    `${getSessionCookieName()}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure ? 'Secure' : '',
  ].filter(Boolean);

  return parts.join('; ');
}

export function getCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const prefix = `${name}=`;
  for (const rawPart of cookieHeader.split(';')) {
    const part = rawPart.trim();
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length);
    }
  }
  return null;
}

export function requireAuth(
  req: FastifyRequest,
  reply: FastifyReply,
  done: () => void,
): void {
  if (!req.user) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  done();
}

/**
 * Narrow `req.user` (typed `AuthUser | null`) to a non-null `AuthUser`.
 * Routes guarded by `requireAuth` always have a user; this replaces
 * non-null assertions at call sites.
 */
export function getAuthUser(req: FastifyRequest): AuthUser {
  if (!req.user) {
    throw new Error('Authenticated user missing from request');
  }
  return req.user;
}

export function setupAuthHook(app: FastifyInstance): void {
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (req) => {
    let token = getCookie(req.headers.cookie, getSessionCookieName());
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7);
    }
    if (token && token !== 'undefined') {
      try {
        const payload = parseSessionToken(token);
        if (payload) {
          req.user = {
            id: payload.sub,
            email: payload.email,
            fullName: (payload as { fullName?: string }).fullName ?? payload.email,
          };
        }
      } catch {
        req.user = null;
      }
    }
  });
}
