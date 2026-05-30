import {
  authenticateUser,
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  getUserById,
  openAuthDb,
  parseSessionToken,
  type AuthUser,
} from '@vibetech/auth';

// Lazily-opened handle to the central workspace auth store (D:\databases\auth.db).
let authDb: ReturnType<typeof openAuthDb> | null = null;
function getAuthDb(): ReturnType<typeof openAuthDb> {
  return (authDb ??= openAuthDb());
}

export interface AuthStatus {
  configured: boolean;
  user: AuthUser | null;
}

export async function isAuthConfigured(): Promise<boolean> {
  return hasAuthSecret();
}

export function getAuthConfigError(): string {
  if (!hasAuthSecret()) {
    return 'AUTH_SECRET must be set to at least 32 characters to enable authentication.';
  }
  return 'Authentication database configuration error.';
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

    const user = getUserById(getAuthDb(), payload.sub);
    if (user?.email.toLowerCase() !== payload.email.toLowerCase()) {
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

  return authenticateUser(getAuthDb(), email, password);
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
