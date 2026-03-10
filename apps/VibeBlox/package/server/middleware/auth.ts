import type { Context, Next } from 'hono';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET environment variable must be set. Server cannot start without it.',
  );
}

export interface JWTPayload extends JwtPayload {
  userId: number;
  username: string;
  role: 'child' | 'parent';
}

export type AuthEnv = {
  Variables: {
    user: JWTPayload;
  };
};

export async function authMiddleware(c: Context<AuthEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as unknown as JWTPayload;
    c.set('user', decoded);
    return await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
}

export async function parentOnlyMiddleware(c: Context<AuthEnv>, next: Next) {
  const user = c.get('user');

  if (!user || user.role !== 'parent') {
    return c.json({ error: 'Forbidden: Parent access required' }, 403);
  }

  return await next();
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '7d' });
}
