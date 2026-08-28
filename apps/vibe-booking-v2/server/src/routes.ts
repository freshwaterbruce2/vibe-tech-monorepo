import type { FastifyInstance } from 'fastify';
import { getAiUsage, recordAiUsage } from '@vibetech/ai';
import { buildPaymentReceiptEmail } from '@vibetech/email';
import { createTenantCheckoutSession } from '@vibetech/payments';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  buildGeneratedLogoutCookie,
  buildGeneratedSessionCookie,
  readGeneratedAuthStatus,
  verifyGeneratedLogin,
} from './authSession.js';
import {
  GENERATED_FEATURES,
  GENERATED_TENANT_ID,
  hasFeature,
  resolveGeneratedPlan,
} from './entitlements.js';
import {
  hotels,
  users,
  sessions,
  bookings,
  payments,
  validateBookingDates,
  calculateNights,
  toCurrencyCents,
  issueToken,
} from './bookings.js';
import type { PlanLevel } from '@vibetech/monetization';

const scryptAsync = promisify(scrypt);
const PASSWORD_KEY_LENGTH = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;

  const storedKey = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer;
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

interface UnifiedAuthUser {
  id: string;
  email: string;
  fullName: string;
  plan: PlanLevel;
}

function getAuthUser(req: any): UnifiedAuthUser | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const userId = sessions.get(token);
    if (userId) {
      const traveler = users.find((u) => u.id === userId);
      if (traveler) {
        const planHeader = req.headers['x-plan'];
        const plan = resolveGeneratedPlan(planHeader ?? traveler.plan ?? 'free');
        return {
          id: traveler.id,
          email: traveler.email,
          fullName: `${traveler.firstName} ${traveler.lastName}`,
          plan,
        };
      }
    }
  }

  const cookieHeader = req.headers.cookie;
  const status = readGeneratedAuthStatus(cookieHeader);
  if (status.configured && status.user) {
    const planHeader = req.headers['x-plan'];
    const plan = resolveGeneratedPlan(planHeader ?? 'pro');
    return {
      id: status.user.id,
      email: status.user.email,
      fullName: status.user.fullName ?? status.user.email,
      plan,
    };
  }

  return null;
}

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = authSchema.extend({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const searchSchema = z.object({
  destination: z.string().optional().default(''),
  checkIn: z.string().optional().default(''),
  checkOut: z.string().optional().default(''),
  guests: z.number().int().min(1).max(8).default(1),
});

const createBookingSchema = z.object({
  hotelId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.number().int().min(1).max(8),
});

const paymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  provider: z.enum(['square', 'stripe']).default('square'),
});

export async function registerRoutes(app: FastifyInstance, host: string, port: number) {
  app.post('/api/auth/register', async (req, reply) => {
    const payload = registerSchema.safeParse(req.body);
    if (!payload.success) {
      return reply.code(400).send({ error: payload.error.flatten() });
    }

    const existing = users.find((user) => user.email === payload.data.email);
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(payload.data.password);
    const user = {
      id: randomUUID(),
      email: payload.data.email,
      firstName: payload.data.firstName,
      lastName: payload.data.lastName,
      passwordHash,
      plan: 'free' as PlanLevel,
    };
    users.push(user);
    const token = issueToken(user.id);
    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  });

  app.get('/api/auth/me', async (req) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      const status = readGeneratedAuthStatus(req.headers.cookie);
      return {
        ok: true,
        configured: status.configured,
        user: status.user,
      };
    }

    return {
      ok: true,
      configured: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.fullName,
        plan: authUser.plan,
      },
    };
  });

  app.post('/api/auth/login', async (req, reply) => {
    const payload = authSchema.safeParse(req.body);
    if (!payload.success) {
      return reply.code(400).send({ error: payload.error.flatten() });
    }

    const traveler = users.find((candidate) => candidate.email === payload.data.email);
    if (traveler && (await verifyPassword(payload.data.password, traveler.passwordHash))) {
      const token = issueToken(traveler.id);
      return {
        token,
        user: {
          id: traveler.id,
          email: traveler.email,
          firstName: traveler.firstName,
          lastName: traveler.lastName,
          plan: traveler.plan,
        },
      };
    }

    const status = readGeneratedAuthStatus(req.headers.cookie);
    if (status.configured) {
      const user = verifyGeneratedLogin(payload.data.email, payload.data.password);
      if (user) {
        reply.header('set-cookie', buildGeneratedSessionCookie(user));
        const token = issueToken(user.id);
        return {
          token,
          user,
        };
      }
    }

    return reply.code(401).send({
      error: 'Invalid email or password',
    });
  });

  app.post('/api/auth/logout', async (_req, reply) => {
    reply.header('set-cookie', buildGeneratedLogoutCookie());
    return {
      ok: true,
    };
  });

  app.post('/api/hotels/search', async (req, reply) => {
    const payload = searchSchema.safeParse(req.body);
    if (!payload.success) {
      return reply.code(400).send({ error: payload.error.flatten() });
    }

    const destination = payload.data.destination.toLowerCase().trim();
    const result = hotels.filter((hotel) => {
      if (!destination) return true;
      return (
        hotel.city.toLowerCase().includes(destination) ||
        hotel.country.toLowerCase().includes(destination) ||
        hotel.name.toLowerCase().includes(destination)
      );
    });

    return {
      search: payload.data,
      hotels: result,
    };
  });

  app.get('/api/hotels/:hotelId', async (req, reply) => {
    const { hotelId } = req.params as { hotelId: string };
    const hotel = hotels.find((candidate) => candidate.id === hotelId);
    if (!hotel) {
      return reply.code(404).send({ error: 'Hotel not found' });
    }
    return { hotel };
  });

  app.get('/api/hotels/:hotelId/availability', async (req) => {
    const { hotelId } = req.params as { hotelId: string };
    const hotel = hotels.find((candidate) => candidate.id === hotelId);
    if (!hotel) {
      throw new Error('Hotel not found');
    }
    const query = req.query as Record<string, string>;
    return {
      hotelId: hotel.id,
      available: true,
      requested: {
        checkIn: query['checkIn'] ?? null,
        checkOut: query['checkOut'] ?? null,
      },
    };
  });

  app.post('/api/bookings', async (req, reply) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const plan = authUser.plan;
    if (!hasFeature(plan, GENERATED_FEATURES.bookingsCreate)) {
      return reply.code(403).send({ error: 'Upgrade required', plan });
    }

    const payload = createBookingSchema.safeParse(req.body);
    if (!payload.success) {
      return reply.code(400).send({ error: payload.error.flatten() });
    }

    const dateError = validateBookingDates(payload.data.checkIn, payload.data.checkOut);
    if (dateError) {
      return reply.code(400).send({ error: dateError });
    }

    const hotel = hotels.find((candidate) => candidate.id === payload.data.hotelId);
    if (!hotel) {
      return reply.code(404).send({ error: 'Hotel not found' });
    }

    const nights = calculateNights(payload.data.checkIn, payload.data.checkOut);
    const booking = {
      id: randomUUID(),
      userId: authUser.id,
      hotelId: hotel.id,
      checkIn: payload.data.checkIn,
      checkOut: payload.data.checkOut,
      guests: payload.data.guests,
      totalPrice: nights * hotel.nightlyRate,
      currency: hotel.currency,
      status: 'pending' as const,
      paymentStatus: 'unpaid' as const,
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    return reply.code(201).send({ booking });
  });

  app.get('/api/bookings', async (req, reply) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const userBookings = bookings.filter((booking) => booking.userId === authUser.id);
    return { bookings: userBookings };
  });

  app.get('/api/bookings/:bookingId', async (req, reply) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { bookingId } = req.params as { bookingId: string };
    const booking = bookings.find((candidate) => candidate.id === bookingId);
    if (!booking || booking.userId !== authUser.id) {
      return reply.code(404).send({ error: 'Booking not found' });
    }
    return { booking };
  });

  app.post('/api/bookings/:bookingId/cancel', async (req, reply) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const { bookingId } = req.params as { bookingId: string };
    const booking = bookings.find((candidate) => candidate.id === bookingId);
    if (!booking || booking.userId !== authUser.id) {
      return reply.code(404).send({ error: 'Booking not found' });
    }
    booking.status = 'cancelled';
    return { booking };
  });

  app.post('/api/payments/create', async (req, reply) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const payload = paymentSchema.safeParse(req.body);
    if (!payload.success) {
      return reply.code(400).send({ error: payload.error.flatten() });
    }

    const booking = bookings.find((candidate) => candidate.id === payload.data.bookingId);
    if (!booking || booking.userId !== authUser.id) {
      return reply.code(404).send({ error: 'Booking not found' });
    }
    if (booking.status === 'cancelled') {
      return reply.code(409).send({ error: 'Cancelled bookings cannot be paid' });
    }
    if (booking.paymentStatus === 'paid') {
      return reply.code(409).send({ error: 'Booking is already paid' });
    }

    const requestedCurrency = payload.data.currency.toUpperCase();
    const amountMatches =
      toCurrencyCents(payload.data.amount) === toCurrencyCents(booking.totalPrice);
    if (!amountMatches || requestedCurrency !== booking.currency) {
      return reply.code(400).send({ error: 'Payment amount or currency does not match booking' });
    }

    const payment = {
      id: randomUUID(),
      bookingId: booking.id,
      amount: payload.data.amount,
      currency: requestedCurrency,
      provider: payload.data.provider,
      status: 'succeeded' as const,
      createdAt: new Date().toISOString(),
    };
    payments.push(payment);

    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';

    return reply.code(201).send({ payment, booking });
  });

  app.get('/api/pro', async (req, reply) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return reply.code(401).send({
        error: 'Sign in to access the pro route',
      });
    }

    const plan = authUser.plan;
    if (!hasFeature(plan, GENERATED_FEATURES.premiumRoute)) {
      return reply.code(403).send({
        error: 'Upgrade required',
        plan,
      });
    }

    return {
      ok: true,
      user: authUser,
      plan,
      feature: GENERATED_FEATURES.premiumRoute,
    };
  });

  app.get('/api/emails/demo-receipt', async () => {
    const viewUrl = `${process.env.APP_BASE_URL ?? `http://${host}:${port}`}/billing/receipt-preview`;
    const email = await buildPaymentReceiptEmail({
      invoiceNumber: 'DEMO-100',
      amount: 19,
      currency: 'USD',
      paidAt: '2026-05-15',
      viewUrl,
      companyName: 'BusinessBookingV2',
      clientName: 'Demo traveler',
    });

    return {
      ok: true,
      subject: email.subject,
      html: email.html,
      text: email.text,
    };
  });

  app.post('/api/pro/rewrite', async (req, reply) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return reply.code(401).send({
        error: 'Sign in to access pro rewrite guidance',
      });
    }

    const plan = authUser.plan;
    if (!hasFeature(plan, GENERATED_FEATURES.premiumRoute)) {
      return reply.code(403).send({
        error: 'Upgrade required',
        plan,
      });
    }

    return {
      ok: true,
      user: authUser,
      plan,
      rewrite: {
        recommendedCta:
          'Open the paid BusinessBookingV2 workflow this week to unlock the premium action.',
      },
    };
  });

  app.get('/api/billing/demo-checkout', async (req, reply) => {
    const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;
    const plan = 'pro';

    try {
      const session = await createTenantCheckoutSession({
        tenantId: GENERATED_TENANT_ID,
        plan,
        currency: 'USD',
        successUrl: `${baseUrl}/billing/success`,
        cancelUrl: `${baseUrl}/billing/canceled`,
        metadata: {
          app: 'business-booking-v2',
          plan: 'pro',
        },
        lineItems: [
          {
            name: 'BusinessBookingV2 Pro',
            unitAmount: 19,
          },
        ],
      });

      return {
        ok: true,
        url: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      req.log.error({ err: error }, 'Demo checkout session failed');
      return reply.code(503).send({
        error: 'Stripe checkout is not configured',
        detail,
      });
    }
  });

  app.post('/api/ai/demo-usage', async (req, reply) => {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return reply.code(401).send({
        error: 'Sign in to access AI usage metering',
      });
    }

    const plan = authUser.plan;
    if (!hasFeature(plan, GENERATED_FEATURES.aiAssistant)) {
      return reply.code(403).send({
        error: 'Upgrade required',
        plan,
      });
    }

    const usage = recordAiUsage({
      appId: 'business-booking-v2',
      tenantId: GENERATED_TENANT_ID,
      provider: 'openrouter',
      usage: {
        inputTokens: 120,
        outputTokens: 80,
        totalTokens: 200,
        costUsd: 0,
      },
    });

    return {
      ok: true,
      user: authUser,
      usage,
      summary: getAiUsage('business-booking-v2', 'openrouter', GENERATED_TENANT_ID),
    };
  });
}
