import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { BookingRepository } from '@vibetech/db-app';
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { getAuthUser, requireAuth } from './authHelpers.js';
import {
  applyPromoDiscount,
  calculateNights,
  validateBookingDates,
} from './bookingHelpers.js';
import { getHotelDetails } from './expediaClient.js';
import { type Hotel } from './types.js';

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

const validatePromoSchema = z.object({
  code: z.string().min(1),
});

function validateBleisureNights(
  nights: number,
  businessNights: number | undefined,
  leisureNights: number | undefined,
): string | null {
  const bNights = businessNights ?? 0;
  const lNights = leisureNights ?? 0;
  if (bNights + lNights !== nights) {
    return `Bleisure split nights (${bNights} business + ${lNights} leisure) must sum to total stay length of ${nights} nights.`;
  }
  return null;
}

function persistBooking(
  bookingRepo: BookingRepository,
  data: z.infer<typeof createBookingSchema>,
  hotel: Hotel,
  totalPrice: number,
  userId: string,
): string {
  const bookingId = randomUUID();
  bookingRepo.createBooking({
    id: bookingId,
    hotelId: hotel.id,
    userId,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    guests: data.guests,
    totalPrice,
    currency: hotel.currency,
    status: 'pending',
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString(),
    bookingType: data.bookingType,
    teamName: data.teamName,
    billingMethod: data.billingMethod,
    businessNights: data.businessNights,
    leisureNights: data.leisureNights,
  });
  return bookingId;
}

async function handleCreateBooking(
  req: FastifyRequest,
  reply: FastifyReply,
  bookingRepo: BookingRepository,
) {
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
  const nightsError = validateBleisureNights(
    nights,
    payload.data.businessNights,
    payload.data.leisureNights,
  );
  if (nightsError) {
    return reply.code(400).send({ error: nightsError });
  }

  const totalPrice = applyPromoDiscount(
    bookingRepo,
    nights * hotel.nightlyRate,
    payload.data.promoCode,
  );

  const bookingId = persistBooking(
    bookingRepo,
    payload.data,
    hotel,
    totalPrice,
    getAuthUser(req).id,
  );
  const booking = bookingRepo.getBookingById(bookingId);
  return { booking };
}

async function handleGetBookings(
  req: FastifyRequest,
  bookingRepo: BookingRepository,
) {
  const user = getAuthUser(req);
  const userBookings = bookingRepo.getUserBookings(user.id);
  return { bookings: userBookings };
}

async function handleGetBookingById(
  req: FastifyRequest,
  reply: FastifyReply,
  bookingRepo: BookingRepository,
) {
  const params = req.params as { bookingId: string };
  const user = getAuthUser(req);
  const booking = bookingRepo.getBookingByIdAndUser(params.bookingId, user.id);
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }
  return { booking };
}

async function handleCancelBooking(
  req: FastifyRequest,
  reply: FastifyReply,
  bookingRepo: BookingRepository,
) {
  const params = req.params as { bookingId: string };
  const user = getAuthUser(req);
  const booking = bookingRepo.getBookingByIdAndUser(params.bookingId, user.id);
  if (!booking) {
    return reply.code(404).send({ error: 'Booking not found' });
  }

  bookingRepo.cancelBooking(params.bookingId);
  const updatedBooking = bookingRepo.getBookingById(params.bookingId);
  return { booking: updatedBooking };
}

async function handleValidatePromo(
  req: FastifyRequest,
  reply: FastifyReply,
  bookingRepo: BookingRepository,
) {
  const payload = validatePromoSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }
  const promo = bookingRepo.getPromoCode(payload.data.code.toUpperCase());
  if (!promo) {
    return reply.code(404).send({ error: 'Promo code not found or inactive' });
  }
  return { ok: true, promo };
}

export function registerBookingRoutes(
  app: FastifyInstance,
  bookingRepo: BookingRepository,
): void {
  app.post('/api/bookings', { preHandler: [requireAuth] }, async (req, reply) =>
    handleCreateBooking(req, reply, bookingRepo));

  app.get('/api/bookings', { preHandler: [requireAuth] }, async (req) =>
    handleGetBookings(req, bookingRepo));

  app.get('/api/bookings/:bookingId', { preHandler: [requireAuth] }, async (req, reply) =>
    handleGetBookingById(req, reply, bookingRepo));

  app.post('/api/bookings/:bookingId/cancel', { preHandler: [requireAuth] }, async (req, reply) =>
    handleCancelBooking(req, reply, bookingRepo));

  app.post('/api/bookings/validate-promo', async (req, reply) =>
    handleValidatePromo(req, reply, bookingRepo));
}
