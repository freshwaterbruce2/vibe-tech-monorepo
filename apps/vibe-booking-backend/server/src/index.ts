import cors from '@fastify/cors';
import Fastify from 'fastify';
import {
  getStripeClient,
  resolveStripeWebhookEvent,
  type StripeWebhookVerifierLike,
} from '@vibetech/billing';
import { createTenantCheckoutSession } from '@vibetech/payments';
import fastifyRawBody from 'fastify-raw-body';
import { loadLocalEnv } from './loadLocalEnv.js';
import { BookingRepository } from '@vibetech/db-app';
import { searchHotels, getHotelDetails } from './expediaClient.js';
import { buildPaymentReceiptEmail } from '@vibetech/email';
import { recordAiUsage, getAiUsage } from '@vibetech/ai';
import { setupStripeTenant } from './stripeSetup.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  applyPromoDiscount,
  calculateNights,
  validateBookingDates,
} from './bookingHelpers.js';
import { getAuthUser, requireAuth, setupAuthHook } from './authHelpers.js';
import { registerAuthRoutes } from './authRoutes.js';
import { createBookingStripeWebhookBus } from './stripeWebhookBus.js';
import {
  createStripeCheckoutSession,
  recordCorporateInvoicePayment,
  scheduleMockCheckoutCompletion,
} from './checkoutHelpers.js';
import {
  DEFAULT_HOST,
  DEFAULT_PORT,
  evaluatePolicyCompliance,
} from './types.js';
loadLocalEnv();
const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const host = process.env.HOST ?? DEFAULT_HOST;

setupAuthHook(app);

app.log.info('Initializing SQLite database schema using BookingRepository...');
const bookingRepo = new BookingRepository();

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
});

const stripeWebhookBus = createBookingStripeWebhookBus(bookingRepo);

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

registerAuthRoutes(app, bookingRepo);

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

  const expediaHotels = await searchHotels(
    payload.data.destination,
    payload.data.checkIn,
    payload.data.checkOut,
    payload.data.guests
  );

  const result = expediaHotels.map((hotel) => ({
    ...hotel,
    policyCompliance: evaluatePolicyCompliance(hotel),
  }));

  return {
    search: payload.data,
    hotels: result,
  };
});

app.get('/api/hotels/:hotelId', async (req, reply) => {
  const params = req.params as { hotelId: string };
  const hotel = await getHotelDetails(params.hotelId);
  if (!hotel) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }
  return {
    hotel: {
      ...hotel,
      policyCompliance: evaluatePolicyCompliance(hotel),
    },
  };
});

app.get('/api/hotels/:hotelId/availability', async (req, reply) => {
  const params = req.params as { hotelId: string };
  const query = req.query as { checkIn?: string; checkOut?: string };
  const hotel = await getHotelDetails(params.hotelId);
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
  promoCode: z.string().optional(),
  bookingType: z.enum(['individual', 'team']).optional().default('individual'),
  teamName: z.string().optional(),
  billingMethod: z.enum(['personal', 'corporate_invoice', 'bleisure_split']).optional().default('personal'),
  businessNights: z.number().int().min(0).optional(),
  leisureNights: z.number().int().min(0).optional(),
});

app.post('/api/bookings', { preHandler: [requireAuth] }, async (req, reply) => {
  const payload = createBookingSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  const dateError = validateBookingDates(payload.data.checkIn, payload.data.checkOut);
  if (dateError) {
    return reply.code(400).send({ error: dateError });
  }

  const hotel = await getHotelDetails(payload.data.hotelId);
  if (!hotel) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const nights = calculateNights(payload.data.checkIn, payload.data.checkOut);

  // Validate Bleisure Split-Payment nights sum
  if (payload.data.billingMethod === 'bleisure_split') {
    const bNights = payload.data.businessNights ?? 0;
    const lNights = payload.data.leisureNights ?? 0;
    if (bNights + lNights !== nights) {
      return reply.code(400).send({ error: `Bleisure split nights (${bNights} business + ${lNights} leisure) must sum to total stay length of ${nights} nights.` });
    }
  }

  const totalPrice = applyPromoDiscount(
    bookingRepo,
    nights * hotel.nightlyRate,
    payload.data.promoCode,
  );
  const bookingId = randomUUID();
  const createdAt = new Date().toISOString();
  const user = getAuthUser(req);

  bookingRepo.createBooking({
    id: bookingId,
    hotelId: hotel.id,
    userId: user.id,
    checkIn: payload.data.checkIn,
    checkOut: payload.data.checkOut,
    guests: payload.data.guests,
    totalPrice,
    currency: hotel.currency,
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt,
    bookingType: payload.data.bookingType,
    teamName: payload.data.teamName,
    billingMethod: payload.data.billingMethod,
    businessNights: payload.data.businessNights,
    leisureNights: payload.data.leisureNights,
  });

  const booking = bookingRepo.getBookingById(bookingId);
  return { booking };
});

app.get('/api/bookings', { preHandler: [requireAuth] }, async (req) => {
  const user = getAuthUser(req);
  const userBookings = bookingRepo.getUserBookings(user.id);
  return { bookings: userBookings };
});

app.get('/api/bookings/:bookingId', { preHandler: [requireAuth] }, async (req, reply) => {
  const params = req.params as { bookingId: string };
  const user = getAuthUser(req);
  const booking = bookingRepo.getBookingByIdAndUser(params.bookingId, user.id);
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }
  return { booking };
});

app.post('/api/bookings/:bookingId/cancel', { preHandler: [requireAuth] }, async (req, reply) => {
  const params = req.params as { bookingId: string };
  const user = getAuthUser(req);
  const booking = bookingRepo.getBookingByIdAndUser(params.bookingId, user.id);
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }

  bookingRepo.cancelBooking(params.bookingId);
  const updatedBooking = bookingRepo.getBookingById(params.bookingId);
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

  const user = getAuthUser(req);
  const booking = bookingRepo.getBookingByIdAndUser(payload.data.bookingId, user.id);
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

  bookingRepo.createPayment({
    id: paymentId,
    bookingId: booking.id,
    amount: payload.data.amount,
    currency: requestedCurrency,
    provider: payload.data.provider,
    status: 'succeeded',
    createdAt,
  });

  bookingRepo.confirmBookingPayment(booking.id);

  const updatedBooking = bookingRepo.getBookingById(booking.id);
  const payment = bookingRepo.getPaymentById(paymentId);

  return { payment, booking: updatedBooking };
});

app.post('/api/payments/create-checkout-session', { preHandler: [requireAuth] }, async (req, reply) => {
  const payload = checkoutSessionSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  const user = getAuthUser(req);
  const booking = bookingRepo.getBookingByIdAndUser(payload.data.bookingId, user.id);
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }

  const hotel = await getHotelDetails(booking.hotelId);
  if (!hotel) {
    return reply.code(404).send({ error: 'Hotel not found' });
  }

  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const baseUrl = req.headers.origin ?? process.env.APP_BASE_URL ?? `http://${host}:${port}`;
  const isSplit = booking.billingMethod === 'bleisure_split';
  const leisurePrice =
    isSplit && nights > 0
      ? ((booking.leisureNights ?? 0) / nights) * booking.totalPrice
      : 0;
  const corporatePrice = isSplit ? booking.totalPrice - leisurePrice : booking.totalPrice;
  const pricing = { isSplit, nights, leisurePrice, corporatePrice };

  if (booking.billingMethod === 'corporate_invoice') {
    return recordCorporateInvoicePayment(bookingRepo, booking, baseUrl, req.log);
  }

  if (!process.env.STRIPE_SECRET_KEY || process.env.PLAYWRIGHT_TEST === '1') {
    req.log.warn('Stripe checkout bypassed (falsy key or E2E test mode) - returning mock checkout redirect url');
    return scheduleMockCheckoutCompletion(bookingRepo, booking, pricing, baseUrl, req.log);
  }

  try {
    const { url } = await createStripeCheckoutSession(booking, hotel.name, pricing, baseUrl);
    return { ok: true, url };
  } catch (error) {
    req.log.error({ err: error }, 'Stripe checkout session creation failed');
    return reply.code(500).send({ error: 'Stripe integration error' });
  }
});

// Validate Promo Code
const validatePromoSchema = z.object({
  code: z.string().min(1),
});

app.post('/api/bookings/validate-promo', async (req, reply) => {
  const payload = validatePromoSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }
  const promo = bookingRepo.getPromoCode(payload.data.code.toUpperCase());
  if (!promo) {
    return reply.code(404).send({ error: 'Promo code not found or inactive' });
  }
  return { ok: true, promo };
});

// Reviews Endpoints
const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
});

app.get('/api/hotels/:hotelId/reviews', async (req) => {
  const params = req.params as { hotelId: string };
  const reviews = bookingRepo.getReviewsByHotel(params.hotelId);
  return { reviews };
});

app.post('/api/hotels/:hotelId/reviews', { preHandler: [requireAuth] }, async (req, reply) => {
  const params = req.params as { hotelId: string };
  const payload = createReviewSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }
  
  const reviewId = randomUUID();
  const createdAt = new Date().toISOString();
  const user = getAuthUser(req);

  bookingRepo.createReview({
    id: reviewId,
    hotelId: params.hotelId,
    userId: user.id,
    userName: user.fullName ?? user.email,
    rating: payload.data.rating,
    comment: payload.data.comment,
    createdAt,
  });

  const reviews = bookingRepo.getReviewsByHotel(params.hotelId);
  return { ok: true, reviews };
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
