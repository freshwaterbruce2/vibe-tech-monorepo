import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { BookingRepository } from '@vibetech/db-app';
import { type FastifyInstance } from 'fastify';
import { getAuthUser, requireAuth } from './authHelpers.js';

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
});

export function registerReviewRoutes(
  app: FastifyInstance,
  bookingRepo: BookingRepository,
): void {
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
}
