import type Database from 'better-sqlite3';
import crypto from 'crypto';

const TOKEN_COOKIE = 'invoiceflow_session';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  companyName?: string;
}

export interface SessionPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export const getSessionTtlSeconds = (): number => {
  const raw = process.env.SESSION_TTL_SECONDS;
  const asNumber = raw ? Number(raw) : Number.NaN;
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.floor(asNumber);
  }

  return 60 * 60 * 24 * 7;
};

const getAuthSecret = (): string => {
  const secret = process.env.AUTH_SECRET ?? '';
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set (>= 32 chars) for local auth.');
  }
  return secret;
};

const base64UrlEncode = (buf: Buffer): string =>
  buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const base64UrlDecode = (value: string): Buffer => {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(normalized, 'base64');
};

const signJwt = (payload: object, secret: string): string => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const toSign = `${encodedHeader}.${encodedPayload}`;
  const sig = crypto.createHmac('sha256', secret).update(toSign).digest();
  return `${toSign}.${base64UrlEncode(sig)}`;
};

const verifyJwt = <T>(token: string, secret: string): T | null => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [header, payload, signature] = parts as [string, string, string];
  const toSign = `${header}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(toSign).digest();
  const actual = base64UrlDecode(signature);
  if (actual.length !== expected.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(payload).toString('utf-8')) as T;
  } catch {
    return null;
  }
};

const scryptAsync = async (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(key as Buffer);
    });
  });

export const hashPassword = async (
  password: string,
): Promise<{ salt: Buffer; hash: Buffer }> => {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(password, salt);
  return { salt, hash };
};

export const verifyPassword = async (
  password: string,
  salt: Buffer,
  hash: Buffer,
): Promise<boolean> => {
  const derived = await scryptAsync(password, salt);
  if (derived.length !== hash.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, hash);
};

export const createSessionToken = (user: AuthUser): string => {
  const secret = getAuthSecret();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + getSessionTtlSeconds();
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    iat: now,
    exp,
  };
  return signJwt(payload, secret);
};

export const parseSessionToken = (token: string): SessionPayload | null => {
  const secret = getAuthSecret();
  const parsed = verifyJwt<SessionPayload>(token, secret);
  if (!parsed) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(parsed.exp) || parsed.exp <= now) {
    return null;
  }
  return parsed;
};

export const getSessionCookieName = (): string => TOKEN_COOKIE;

export const getUserById = (
  db: Database.Database,
  id: string,
): AuthUser | null => {
  const row = db
    .prepare(
      'select id, email, full_name, company_name from users where id = ?',
    )
    .get(id) as
    | {
        id: string;
        email: string;
        full_name: string | null;
        company_name: string | null;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name ?? undefined,
    companyName: row.company_name ?? undefined,
  };
};
