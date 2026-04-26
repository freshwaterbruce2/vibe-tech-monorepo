/**
 * Authentication module for the example app. Issues JWT bearer tokens against
 * the user store and validates incoming Authorization headers on protected
 * routes. Token TTL is 24h; refresh tokens are stored in Redis.
 */

import { createHmac } from 'node:crypto';

const SECRET = process.env.AUTH_SECRET ?? 'dev-secret';
const TOKEN_TTL_SEC = 60 * 60 * 24;

export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export class AuthService {
  constructor(private readonly users: Map<string, User>) {}

  async login(email: string, password: string): Promise<string> {
    const user = this.users.get(email);
    if (!user) throw new Error('unknown user');
    if (!this.verify(password, user.passwordHash)) throw new Error('bad password');
    return this.issue(user.id);
  }

  validate(token: string): { userId: string } {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) throw new Error('malformed token');
    const expected = this.sign(payload);
    if (sig !== expected) throw new Error('invalid signature');
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Math.floor(Date.now() / 1000)) throw new Error('expired');
    return { userId: data.sub };
  }

  private issue(userId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({ sub: userId, iat: now, exp: now + TOKEN_TTL_SEC }),
    ).toString('base64url');
    return `${payload}.${this.sign(payload)}`;
  }

  private sign(payload: string): string {
    return createHmac('sha256', SECRET).update(payload).digest('base64url');
  }

  private verify(password: string, hash: string): boolean {
    return createHmac('sha256', SECRET).update(password).digest('hex') === hash;
  }
}
