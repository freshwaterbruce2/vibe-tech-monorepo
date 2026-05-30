import {
  authenticateUser,
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  openAuthDb,
  parseSessionToken,
  type AuthUser,
} from '@vibetech/auth';

export interface GeneratedAuthStatus {
  configured: boolean;
  user: AuthUser | null;
}

// Lazily-opened handle to the central workspace auth store (D:\databases\auth.db).
let authDb: ReturnType<typeof openAuthDb> | null = null;
function getAuthDb(): ReturnType<typeof openAuthDb> {
  return (authDb ??= openAuthDb());
}

export function isGeneratedAuthConfigured(): boolean {
  const secret = process.env.AUTH_SECRET ?? '';
  return secret.trim().length >= 32;
}

export function getGeneratedAuthConfigError(): string {
  return 'AUTH_SECRET must be set to at least 32 characters to enable auth.';
}

export function readGeneratedAuthStatus(cookieHeader: string | undefined): GeneratedAuthStatus {
  if (!isGeneratedAuthConfigured()) {
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

    return {
      configured: true,
      user: {
        id: payload.sub,
        email: payload.email,
        isAdmin: payload.isAdmin ?? false,
      },
    };
  } catch {
    return {
      configured: true,
      user: null,
    };
  }
}

export async function verifyGeneratedLogin(
  email: string,
  password: string,
): Promise<AuthUser | null> {
  return authenticateUser(getAuthDb(), email, password);
}

export function buildGeneratedSessionCookie(user: AuthUser): string {
  const token = createSessionToken(user);
  const secure = process.env.NODE_ENV === 'production' || isHttpsUrl(process.env.APP_BASE_URL);
  const sameSite = secure ? 'SameSite=None' : 'SameSite=Lax';
  const parts = [
    `${getSessionCookieName()}=${token}`,
    'Path=/',
    'HttpOnly',
    sameSite,
    `Max-Age=${getSessionTtlSeconds()}`,
    secure ? 'Secure' : '',
  ].filter(Boolean);

  return parts.join('; ');
}

export function buildGeneratedLogoutCookie(): string {
  const secure = process.env.NODE_ENV === 'production' || isHttpsUrl(process.env.APP_BASE_URL);
  const sameSite = secure ? 'SameSite=None' : 'SameSite=Lax';
  const parts = [
    `${getSessionCookieName()}=`,
    'Path=/',
    'HttpOnly',
    sameSite,
    'Max-Age=0',
    secure ? 'Secure' : '',
  ].filter(Boolean);

  return parts.join('; ');
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
