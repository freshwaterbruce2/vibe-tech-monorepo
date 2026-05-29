import cors from '@fastify/cors';
import Fastify from 'fastify';
import {
  createSessionToken,
  getSessionCookieName,
  getSessionTtlSeconds,
  parseSessionToken,
  type AuthUser,
} from '@vibetech/auth';
import {
  createStripeWebhookBus,
  getStripeClient,
  resolveStripeWebhookEvent,
  type StripeSubscriptionLike,
  type StripeWebhookVerifierLike,
} from '@vibetech/billing';
import { createTenantCheckoutSession } from '@vibetech/payments';
import fastifyRawBody from 'fastify-raw-body';
import { loadLocalEnv } from './loadLocalEnv.js';
import { AppDatabase } from '@vibetech/db-app';
import { buildPaymentReceiptEmail } from '@vibetech/email';
import { recordAiUsage, getAiUsage } from '@vibetech/ai';
import { setupStripeTenant } from './stripeSetup.js';
import {
  isGeneratedAuthConfigured,
  verifyGeneratedLogin,
  buildGeneratedSessionCookie,
} from './authSession.js';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 4020);
const host = process.env.HOST ?? '127.0.0.1';

const scryptAsync = promisify(scrypt);
const PASSWORD_KEY_LENGTH = 64;

interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  neighborhood: string;
  description: string;
  nightlyRate: number;
  currency: string;
  rating: number;
  reviewScore: number;
  reviewCount: number;
  imageUrl: string;
  gallery: string[];
  amenities: string[];
  businessPerks: string[];
  cancellationPolicy: string;
  distanceFromCenter: string;
  badge: string;
}

const hotels: Hotel[] = [
  {
    id: 'h_1',
    name: 'Harbor Point Suites',
    city: 'Miami',
    country: 'USA',
    neighborhood: 'Brickell waterfront',
    description: 'Oceanfront suites with coworking space and fast check-in.',
    nightlyRate: 229,
    currency: 'USD',
    rating: 4.6,
    reviewScore: 9.1,
    reviewCount: 1284,
    imageUrl: '/images/hotel-rooftop.png',
    gallery: ['/images/hotel-room-workspace.png', '/images/hotel-lobby-coworking.png'],
    amenities: ['Fast Wi-Fi', 'Pool', 'Breakfast', 'Fitness center'],
    businessPerks: ['Coworking lounge', 'Late checkout', 'Airport transfer'],
    cancellationPolicy: 'Free cancellation until 24 hours before check-in',
    distanceFromCenter: '0.4 mi from financial district',
    badge: 'Best for client meetings',
  },
  {
    id: 'h_2',
    name: 'SoMa Executive Stay',
    city: 'San Francisco',
    country: 'USA',
    neighborhood: 'SoMa',
    description: 'Central location for conferences with meeting-ready rooms.',
    nightlyRate: 285,
    currency: 'USD',
    rating: 4.4,
    reviewScore: 8.8,
    reviewCount: 946,
    imageUrl: '/images/hotel-room-workspace.png',
    gallery: ['/images/hotel-rooftop.png', '/images/hotel-lobby-coworking.png'],
    amenities: ['Meeting rooms', 'Restaurant', 'EV charging', 'Gym'],
    businessPerks: ['Boardroom access', 'Express laundry', 'Tech desk'],
    cancellationPolicy: 'Fully refundable on flexible rates',
    distanceFromCenter: '0.6 mi from Moscone Center',
    badge: 'Conference favorite',
  },
  {
    id: 'h_3',
    name: 'Lakeview Business Hotel',
    city: 'Chicago',
    country: 'USA',
    neighborhood: 'River North',
    description: 'Business travel focused amenities with flexible checkout.',
    nightlyRate: 199,
    currency: 'USD',
    rating: 4.3,
    reviewScore: 8.6,
    reviewCount: 731,
    imageUrl: '/images/hotel-lobby-coworking.png',
    gallery: ['/images/hotel-rooftop.png', '/images/hotel-room-workspace.png'],
    amenities: ['Lake views', 'Free Wi-Fi', 'Restaurant', 'Parking'],
    businessPerks: ['Quiet floors', 'Day-use office', 'Flexible checkout'],
    cancellationPolicy: 'Free cancellation on most rooms',
    distanceFromCenter: '0.8 mi from Merchandise Mart',
    badge: 'Strong value',
  },
];

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

function buildSessionCookie(user: AuthUser): string {
  const token = createSessionToken(user);
  const secure = process.env.NODE_ENV === 'production' || (process.env.APP_BASE_URL && process.env.APP_BASE_URL.startsWith('https://'));
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

function buildLogoutCookie(): string {
  const secure = process.env.NODE_ENV === 'production' || (process.env.APP_BASE_URL && process.env.APP_BASE_URL.startsWith('https://'));
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

function getCookie(cookieHeader: string | undefined, name: string): string | null {
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

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

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
          fullName: (payload as any).fullName || payload.email,
        };
      }
    } catch {
      req.user = null;
    }
  }
});

function requireAuth(req: any, reply: any, done: () => void) {
  if (!req.user) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  done();
}

// Auto-initialize SQLite database schemas from monetization PRD
function initializeDatabaseSchema() {
  try {
    app.log.info('Initializing SQLite database schema...');
    const db = AppDatabase.getInstance().getDatabase();

    db.exec(`
      CREATE TABLE IF NOT EXISTS booking_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vibe_bookings (
        id TEXT PRIMARY KEY,
        hotelId TEXT NOT NULL,
        userId TEXT NOT NULL,
        checkIn TEXT NOT NULL,
        checkOut TEXT NOT NULL,
        guests INTEGER NOT NULL,
        totalPrice REAL NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL,
        paymentStatus TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS vibe_payments (
        id TEXT PRIMARY KEY,
        bookingId TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    app.log.info('SQLite database schema initialized successfully!');
  } catch (err) {
    app.log.error({ err }, 'Failed to initialize database schema');
  }
}

initializeDatabaseSchema();

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
});

const processedStripeWebhookEvents = new Set<string>();
const stripeWebhookBus = createStripeWebhookBus({
  hasProcessedEvent: (eventId) => processedStripeWebhookEvents.has(eventId),
  markEventProcessed: (event) => {
    processedStripeWebhookEvents.add(event.id);
  },
  handlers: {
    'checkout.session.completed': (event, context) => {
      const session = event.data.object as any;
      context.logger?.info?.(
        {
          app: 'vibe-booking-backend',
          eventId: event.id,
          sessionId: session.id,
          customerEmail: session.customer_email ?? session.customer_details?.email ?? null,
        },
        'Stripe checkout session completed webhook received',
      );

      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        try {
          const db = AppDatabase.getInstance().getDatabase();
          const booking = db.prepare('SELECT * FROM vibe_bookings WHERE id = ?').get(bookingId) as any;
          if (booking && booking.paymentStatus !== 'paid') {
            const paymentId = randomUUID();
            const createdAt = new Date().toISOString();
            
            db.prepare('INSERT INTO vibe_payments (id, bookingId, amount, currency, provider, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
              .run(paymentId, booking.id, booking.totalPrice, booking.currency, 'stripe', 'succeeded', createdAt);
              
            db.prepare("UPDATE vibe_bookings SET paymentStatus = 'paid', status = 'confirmed' WHERE id = ?").run(booking.id);
            context.logger?.info?.({ bookingId }, 'Booking payment processed via Stripe webhook');
          }
        } catch (err) {
          app.log.error({ err, bookingId }, 'Failed to process Stripe webhook payment');
        }
      }
    },
  },
  prefixHandlers: [
    {
      prefix: 'customer.subscription.',
      handle: (event, context) => {
        const subscription = event.data.object as StripeSubscriptionLike;
        context.logger?.info?.(
          {
            app: 'vibe-booking-backend',
            eventId: event.id,
            subscriptionId: subscription.id,
            status: subscription.status,
          },
          'Stripe subscription event received',
        );
      },
    },
  ],
  defaultHandler: (event, context) => {
    context.logger?.debug?.({ type: event.type }, 'Unhandled Stripe webhook event');
  },
});

app.get('/api/health', async () => ({
  status: 'ok',
  service: 'vibe-booking-backend',
  timestamp: new Date().toISOString(),
}));

app.get('/api/emails/demo-receipt', async () => {
  const viewUrl = `${process.env.APP_BASE_URL ?? `http://${host}:${port}`}/billing/receipt-preview`;
  const email = await buildPaymentReceiptEmail({
    invoiceNumber: 'DEMO-100',
    amount: 9,
    currency: 'USD',
    paidAt: '2026-05-15',
    viewUrl,
    companyName: 'Vibe Booking',
    clientName: 'Demo customer',
  });

  return {
    ok: true,
    subject: email.subject,
    html: email.html,
    text: email.text,
  };
});

app.post(
  '/api/webhooks/stripe',
  {
    config: { rawBody: true },
  },
  async (req, reply) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      req.log.warn('STRIPE_WEBHOOK_SECRET is not set - accepting unsigned local webhook payloads');
    }

    try {
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      const event = resolveStripeWebhookEvent({
        rawBody,
        signature: req.headers['stripe-signature'],
        secret: webhookSecret,
        parsedBody: req.body,
        stripeClient: webhookSecret
          ? (getStripeClient() as unknown as StripeWebhookVerifierLike)
          : undefined,
        allowUnsigned: !webhookSecret,
      });
      const result = await stripeWebhookBus.dispatch(event, { logger: req.log });

      return {
        ok: true,
        handled: result.handled,
        skipped: result.skipped,
      };
    } catch (error) {
      req.log.error({ err: error }, 'Stripe webhook processing failed');
      return reply.code(400).send({
        error: 'Stripe webhook invalid',
      });
    }
  },
);

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

app.post('/api/auth/register', async (req, reply) => {
  const payload = registerSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  const db = AppDatabase.getInstance().getDatabase();
  const existing = db.prepare('SELECT * FROM booking_users WHERE email = ?').get(payload.data.email);
  if (existing) {
    return reply.code(409).send({ error: 'Email already registered' });
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(payload.data.password);

  db.prepare('INSERT INTO booking_users (id, email, passwordHash, firstName, lastName) VALUES (?, ?, ?, ?, ?)').run(
    userId,
    payload.data.email,
    passwordHash,
    payload.data.firstName,
    payload.data.lastName
  );

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
});

app.post('/api/auth/login', async (req, reply) => {
  const payload = loginSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  // 1. Try generated operator auth first
  const operatorUser = verifyGeneratedLogin(payload.data.email, payload.data.password);
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
  const db = AppDatabase.getInstance().getDatabase();
  const user = db.prepare('SELECT * FROM booking_users WHERE email = ?').get(payload.data.email) as any;
  if (!user || !(await verifyPassword(payload.data.password, user.passwordHash))) {
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
});

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

app.get('/api/pro', { preHandler: [requireAuth] }, async () => {
  return {
    feature: 'analytics.revenue',
    plan: 'pro',
  };
});

app.post('/api/pro/rewrite', { preHandler: [requireAuth] }, async () => {
  return {
    rewrite: {
      recommendedCta: 'Upgrade to automate this proposal workflow',
    },
  };
});

app.post('/api/ai/demo-usage', { preHandler: [requireAuth] }, async (req) => {
  const usage = recordAiUsage({
    appId: 'vibe-booking-backend',
    tenantId: 'vibe-booking-tenant',
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
    user: req.user,
    usage,
    summary: getAiUsage('vibe-booking-backend', 'openrouter', 'vibe-booking-tenant'),
  };
});

const searchSchema = z.object({
  destination: z.string().optional().default(''),
  checkIn: z.string().optional().default(''),
  checkOut: z.string().optional().default(''),
  guests: z.number().int().min(1).max(8).default(1),
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
  const params = req.params as { hotelId: string };
  const hotel = hotels.find((candidate) => candidate.id === params.hotelId);
  if (!hotel) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }
  return { hotel };
});

app.get('/api/hotels/:hotelId/availability', async (req, reply) => {
  const params = req.params as { hotelId: string };
  const query = req.query as { checkIn?: string; checkOut?: string };
  const hotel = hotels.find((candidate) => candidate.id === params.hotelId);
  if (!hotel) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }
  return {
    hotelId: hotel.id,
    available: true,
    requested: {
      checkIn: query.checkIn ?? null,
      checkOut: query.checkOut ?? null,
    },
  };
});

const createBookingSchema = z.object({
  hotelId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.number().int().min(1).max(8),
});

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseBookingDate(value: string): number | null {
  if (!DATE_ONLY_PATTERN.test(value)) return null;

  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
}

function validateBookingDates(checkIn: string, checkOut: string): string | null {
  const checkInTime = parseBookingDate(checkIn);
  if (checkInTime === null) return 'Check-in date must use YYYY-MM-DD';

  const checkOutTime = parseBookingDate(checkOut);
  if (checkOutTime === null) return 'Check-out date must use YYYY-MM-DD';

  if (checkOutTime <= checkInTime) return 'Check-out date must be after check-in';

  return null;
}

function calculateNights(checkIn: string, checkOut: string): number {
  const checkInTime = parseBookingDate(checkIn);
  const checkOutTime = parseBookingDate(checkOut);
  if (checkInTime === null || checkOutTime === null) return 0;

  const delta = checkOutTime - checkInTime;
  return Math.ceil(delta / (1000 * 60 * 60 * 24));
}

app.post('/api/bookings', { preHandler: [requireAuth] }, async (req, reply) => {
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
  const totalPrice = nights * hotel.nightlyRate;
  const bookingId = randomUUID();
  const createdAt = new Date().toISOString();

  const db = AppDatabase.getInstance().getDatabase();
  db.prepare(
    'INSERT INTO vibe_bookings (id, hotelId, userId, checkIn, checkOut, guests, totalPrice, currency, status, paymentStatus, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    bookingId,
    hotel.id,
    req.user!.id,
    payload.data.checkIn,
    payload.data.checkOut,
    payload.data.guests,
    totalPrice,
    hotel.currency,
    'pending',
    'unpaid',
    createdAt
  );

  const booking = db.prepare('SELECT * FROM vibe_bookings WHERE id = ?').get(bookingId);
  return { booking };
});

app.get('/api/bookings', { preHandler: [requireAuth] }, async (req) => {
  const db = AppDatabase.getInstance().getDatabase();
  const userBookings = db.prepare('SELECT * FROM vibe_bookings WHERE userId = ?').all(req.user!.id);
  return { bookings: userBookings };
});

app.get('/api/bookings/:bookingId', { preHandler: [requireAuth] }, async (req, reply) => {
  const params = req.params as { bookingId: string };
  const db = AppDatabase.getInstance().getDatabase();
  const booking = db.prepare('SELECT * FROM vibe_bookings WHERE id = ? AND userId = ?').get(params.bookingId, req.user!.id) as any;
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }
  return { booking };
});

app.post('/api/bookings/:bookingId/cancel', { preHandler: [requireAuth] }, async (req, reply) => {
  const params = req.params as { bookingId: string };
  const db = AppDatabase.getInstance().getDatabase();
  const booking = db.prepare('SELECT * FROM vibe_bookings WHERE id = ? AND userId = ?').get(params.bookingId, req.user!.id) as any;
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }

  db.prepare("UPDATE vibe_bookings SET status = 'cancelled' WHERE id = ?").run(params.bookingId);
  const updatedBooking = db.prepare('SELECT * FROM vibe_bookings WHERE id = ?').get(params.bookingId);
  return { booking: updatedBooking };
});

const paymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  provider: z.enum(['square', 'stripe']).default('stripe'),
});

const checkoutSessionSchema = z.object({
  bookingId: z.string().min(1),
});

app.post('/api/payments/create', { preHandler: [requireAuth] }, async (req, reply) => {
  const payload = paymentSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  const db = AppDatabase.getInstance().getDatabase();
  const booking = db.prepare('SELECT * FROM vibe_bookings WHERE id = ? AND userId = ?').get(payload.data.bookingId, req.user!.id) as any;
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }
  if (booking.status === 'cancelled') {
    return reply.code(409).send({ error: 'Cancelled bookings cannot be paid' });
  }
  if (booking.paymentStatus === 'paid') {
    return reply.code(409).send({ error: 'Booking is already paid' });
  }

  const requestedCurrency = payload.data.currency.toUpperCase();
  if (payload.data.amount !== booking.totalPrice || requestedCurrency !== booking.currency) {
    return reply.code(400).send({ error: 'Payment amount or currency does not match booking' });
  }

  const paymentId = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare('INSERT INTO vibe_payments (id, bookingId, amount, currency, provider, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(paymentId, booking.id, payload.data.amount, requestedCurrency, payload.data.provider, 'succeeded', createdAt);

  db.prepare("UPDATE vibe_bookings SET paymentStatus = 'paid', status = 'confirmed' WHERE id = ?").run(booking.id);

  const updatedBooking = db.prepare('SELECT * FROM vibe_bookings WHERE id = ?').get(booking.id);
  const payment = db.prepare('SELECT * FROM vibe_payments WHERE id = ?').get(paymentId);

  return { payment, booking: updatedBooking };
});

app.post('/api/payments/create-checkout-session', { preHandler: [requireAuth] }, async (req, reply) => {
  const payload = checkoutSessionSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  const db = AppDatabase.getInstance().getDatabase();
  const booking = db.prepare('SELECT * FROM vibe_bookings WHERE id = ? AND userId = ?').get(payload.data.bookingId, req.user!.id) as any;
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }

  const hotel = hotels.find((h) => h.id === booking.hotelId);
  if (!hotel) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const baseUrl = req.headers.origin ?? process.env.APP_BASE_URL ?? `http://${host}:${port}`;

  if (!process.env.STRIPE_SECRET_KEY || process.env.PLAYWRIGHT_TEST === '1') {
    req.log.warn('Stripe checkout bypassed (falsy key or E2E test mode) - returning mock checkout redirect url');
    
    // Simulate webhook completion locally
    setTimeout(() => {
      try {
        const paymentId = randomUUID();
        const createdAt = new Date().toISOString();
        db.prepare('INSERT INTO vibe_payments (id, bookingId, amount, currency, provider, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(paymentId, booking.id, booking.totalPrice, booking.currency, 'stripe', 'succeeded', createdAt);
        db.prepare("UPDATE vibe_bookings SET paymentStatus = 'paid', status = 'confirmed' WHERE id = ?").run(booking.id);
        req.log.info({ bookingId: booking.id }, 'Mock Stripe checkout completed');
      } catch (err) {
        req.log.error({ err }, 'Mock Stripe checkout completion failed');
      }
    }, 100);

    return {
      ok: true,
      url: `${baseUrl}/confirmation/${booking.id}`,
    };
  }

  try {
    const stripe = getStripeClient() as any;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: booking.currency.toLowerCase(),
            product_data: {
              name: `Stay at ${hotel.name}`,
              description: `${nights} nights, ${booking.guests} guests`,
            },
            unit_amount: Math.round(booking.totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/confirmation/${booking.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/${booking.id}`,
      metadata: {
        bookingId: booking.id,
        app: 'vibe-booking-backend',
      },
    });

    return {
      ok: true,
      url: session.url,
    };
  } catch (error) {
    req.log.error({ err: error }, 'Stripe checkout session creation failed');
    return reply.code(500).send({ error: 'Stripe integration error' });
  }
});

// Stripe checkout session generator demo integration
app.get('/api/billing/demo-checkout', async (req, reply) => {
  const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;
  try {
    const session = await createTenantCheckoutSession({
      tenantId: 'vibe-booking-tenant',
      plan: 'pro',
      currency: 'USD',
      successUrl: `${baseUrl}/billing/success`,
      cancelUrl: `${baseUrl}/billing/canceled`,
      metadata: {
        app: 'vibe-booking-backend',
        plan: 'pro',
      },
      lineItems: [
        {
          name: 'Vibe Booking Pro Plan',
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

// Run touchless Stripe tenant provisioning on startup
await setupStripeTenant(app.log);

await app.listen({ port, host });
