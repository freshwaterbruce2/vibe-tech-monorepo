import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { BookingRepository } from '@vibetech/db-app';
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { getAuthUser, requireAuth } from './authHelpers.js';
import { calculateNights } from './bookingHelpers.js';
import { getHotelDetails } from './expediaClient.js';
import {
  createStripeCheckoutSession,
  recordCorporateInvoicePayment,
  scheduleMockCheckoutCompletion,
  type CheckoutPricing,
} from './checkoutHelpers.js';

const paymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(3).max(3),
  provider: z.enum(['square', 'stripe']).default('stripe'),
});

const checkoutSessionSchema = z.object({
  bookingId: z.string().min(1),
});

async function handleCreatePayment(
  req: FastifyRequest,
  reply: FastifyReply,
  bookingRepo: BookingRepository,
) {
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
}

async function handleCreateCheckoutSession(
  req: FastifyRequest,
  reply: FastifyReply,
  bookingRepo: BookingRepository,
  host: string,
  port: number,
) {
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
    isSplit && nights > 0 ? ((booking.leisureNights ?? 0) / nights) * booking.totalPrice : 0;
  const corporatePrice = isSplit ? booking.totalPrice - leisurePrice : booking.totalPrice;

  const pricing: CheckoutPricing = {
    isSplit,
    nights,
    leisurePrice,
    corporatePrice,
  };

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
}

export function registerPaymentRoutes(
  app: FastifyInstance,
  bookingRepo: BookingRepository,
  host: string,
  port: number,
): void {
  app.post('/api/payments/create', { preHandler: [requireAuth] }, async (req, reply) =>
    handleCreatePayment(req, reply, bookingRepo));

  app.post('/api/payments/create-checkout-session', { preHandler: [requireAuth] }, async (req, reply) =>
    handleCreateCheckoutSession(req, reply, bookingRepo, host, port));
}
