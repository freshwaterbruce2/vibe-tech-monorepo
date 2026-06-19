import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  createSessionToken,
  type AuthUser,
} from '@vibetech/auth';
import { BookingRepository } from '@vibetech/db-app';
import {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import {
  buildLogoutCookie,
  buildSessionCookie,
  hashPassword,
  verifyPassword,
} from './authHelpers.js';
import {
  buildGeneratedSessionCookie,
  isGeneratedAuthConfigured,
  verifyGeneratedLogin,
} from './authSession.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

async function handleRegister(
  req: FastifyRequest,
  reply: FastifyReply,
  bookingRepo: BookingRepository,
) {
  const payload = registerSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  const existing = bookingRepo.getUserByEmail(payload.data.email);
  if (existing) {
    return reply.code(409).send({ error: 'Email already registered' });
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(payload.data.password);

  bookingRepo.createUser({
    id: userId,
    email: payload.data.email,
    passwordHash,
    firstName: payload.data.firstName,
    lastName: payload.data.lastName,
  });

  const authUser: AuthUser = {
    id: userId,
    email: payload.data.email,
    fullName: `${payload.data.firstName} ${payload.data.lastName}`,
  };

  const token = createSessionToken(authUser);
  reply.header('set-cookie', buildSessionCookie(authUser));
  return {
    ok: true,
    user: authUser,
    token,
  };
}

async function handleLogin(
  req: FastifyRequest,
  reply: FastifyReply,
  bookingRepo: BookingRepository,
) {
  const payload = loginSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  // 1. Try generated operator auth first
  const operatorUser = await verifyGeneratedLogin(
    payload.data.email,
    payload.data.password,
  );
  if (operatorUser) {
    const token = createSessionToken(operatorUser);
    reply.header('set-cookie', buildGeneratedSessionCookie(operatorUser));
    return {
      ok: true,
      user: operatorUser,
      token,
    };
  }

  // 2. Fall back to standard SQLite customer auth
  const user = bookingRepo.getUserByEmail(payload.data.email);
  if (
    !user ||
    !(await verifyPassword(payload.data.password, user.passwordHash))
  ) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    fullName: `${user.firstName} ${user.lastName}`,
  };

  const token = createSessionToken(authUser);
  reply.header('set-cookie', buildSessionCookie(authUser));
  return {
    ok: true,
    user: authUser,
    token,
  };
}

export function registerAuthRoutes(
  app: FastifyInstance,
  bookingRepo: BookingRepository,
): void {
  app.post('/api/auth/register', async (req, reply) =>
    handleRegister(req, reply, bookingRepo),
  );

  app.post('/api/auth/login', async (req, reply) =>
    handleLogin(req, reply, bookingRepo),
  );

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.header('set-cookie', buildLogoutCookie());
    return {
      ok: true,
    };
  });

  app.get('/api/auth/me', async (req) => {
    return {
      ok: true,
      user: req.user,
      configured: isGeneratedAuthConfigured(),
    };
  });
}
