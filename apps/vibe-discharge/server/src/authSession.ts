import {
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  getUserById,
  hashPassword,
  parseSessionToken,
  verifyPassword,
  type AuthUser,
} from '@vibetech/auth';

import {
  createUser,
  getDatabase,
  getUserCredentialsByEmail,
  hasUsers,
} from './db.js';

const BOOTSTRAP_USER_ID = 'discharge-ez-owner';

export interface AuthStatus {
  configured: boolean;
  user: AuthUser | null;
}

export async function ensureBootstrapUser(): Promise<void> {
  if (hasUsers()) {
    return;
  }

  const email = process.env.DISCHARGE_EZ_BOOTSTRAP_EMAIL?.trim();
  const password = process.env.DISCHARGE_EZ_BOOTSTRAP_PASSWORD?.trim();
  const fullName = process.env.DISCHARGE_EZ_BOOTSTRAP_NAME?.trim();
  const companyName = process.env.DISCHARGE_EZ_BOOTSTRAP_COMPANY?.trim();

  if (!email || !password) {
    return;
  }

  const passwordHash = await hashPassword(password);
  createUser({
    id: BOOTSTRAP_USER_ID,
    email,
    fullName: fullName || 'DischargeEz Owner',
    companyName,
    passwordSalt: passwordHash.salt,
    passwordHash: passwordHash.hash,
  });
}

export async function isAuthConfigured(): Promise<boolean> {
  await ensureBootstrapUser();
  return hasAuthSecret() && hasUsers();
}

export function getAuthConfigError(): string {
  if (!hasAuthSecret()) {
    return 'AUTH_SECRET must be set to at least 32 characters to enable authentication.';
  }

  return [
    'No operator user exists in the SQLite database.',
    'Create one during setup or set DISCHARGE_EZ_BOOTSTRAP_EMAIL and DISCHARGE_EZ_BOOTSTRAP_PASSWORD once to seed the first user.',
  ].join(' ');
}

export async function readAuthStatus(cookieHeader: string | undefined): Promise<AuthStatus> {
  if (!(await isAuthConfigured())) {
    return {
      configured: false,
      user: null,
    };
  }

  const token = readCookie(cookieHeader, getSessionCookieName());
  if (!token) {
    return {
      configured: true,
      user: null,
    };
  }

  try {
    const payload = parseSessionToken(token);
    if (!payload) {
      return {
        configured: true,
        user: null,
      };
    }

    const user = getUserById(getDatabase(), payload.sub);
    if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
      return {
        configured: true,
        user: null,
      };
    }

    return {
      configured: true,
      user,
    };
  } catch {
    return {
      configured: true,
      user: null,
    };
  }
}

export async function verifyLogin(email: string, password: string): Promise<AuthUser | null> {
  if (!(await isAuthConfigured())) {
    return null;
  }

  const row = getUserCredentialsByEmail(email);
  if (!row) {
    return null;
  }

  const passwordMatches = await verifyPassword(password, row.password_salt, row.password_hash);
  if (!passwordMatches) {
    return null;
  }

  return getUserById(getDatabase(), row.id);
}

export function buildSessionCookie(user: AuthUser): string {
  const token = createSessionToken(user);
  const secure = process.env.NODE_ENV === 'production' || isHttpsUrl(process.env.APP_BASE_URL);
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
  const secure = process.env.NODE_ENV === 'production' || isHttpsUrl(process.env.APP_BASE_URL);
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

function hasAuthSecret(): boolean {
  const secret = process.env.AUTH_SECRET ?? '';
  return secret.trim().length >= 32;
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const prefix = `${name}=`;
  for (const rawPart of cookieHeader.split(';')) {
    const part = rawPart.trim();
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length);
    }
  }

  return null;
}

function isHttpsUrl(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('https://');
}
