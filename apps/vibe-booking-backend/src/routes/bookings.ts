import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';

const createReservationSchema = z.object({
  room_id: z.number(),
  user_name: z.string().min(1),
  user_email: z.string().email(),
  check_in: z.string(), // YYYY-MM-DD
  check_out: z.string(), // YYYY-MM-DD
});

export async function bookingsRoutes(fastify: FastifyInstance) {
  fastify.get('/bookings', async (_request, _reply) => {
    const stmt = db.prepare('SELECT * FROM reservations ORDER BY created_at DESC');
    return stmt.all();
  });

  fastify.post('/bookings', async (request, reply) => {
    try {
      const data = createReservationSchema.parse(request.body);

      const checkRoom = db.prepare('SELECT id FROM rooms WHERE id = ?').get(data.room_id);
      if (!checkRoom) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const stmt = db.prepare(`
        INSERT INTO reservations (room_id, user_name, user_email, check_in, check_out)
        VALUES (@room_id, @user_name, @user_email, @check_in, @check_out)
      `);

      const info = stmt.run(data);

      return reply.status(201).send({
        id: info.lastInsertRowid,
        ...data,
        status: 'CONFIRMED',
      });
    } catch (e: unknown) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: (e as any).errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
