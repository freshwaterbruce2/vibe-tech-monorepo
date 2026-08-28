import { z } from 'zod';
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { searchHotels, getHotelDetails } from './expediaClient.js';
import { evaluatePolicyCompliance } from './types.js';

const searchSchema = z.object({
  destination: z.string().optional().default(''),
  checkIn: z.string().optional().default(''),
  checkOut: z.string().optional().default(''),
  guests: z.number().int().min(1).max(8).default(1),
});

async function handleSearchHotels(req: FastifyRequest, reply: FastifyReply) {
  const payload = searchSchema.safeParse(req.body);
  if (!payload.success) {
    return reply.code(400).send({ error: payload.error.flatten() });
  }

  const expediaHotels = await searchHotels(
    payload.data.destination,
    payload.data.checkIn,
    payload.data.checkOut,
    payload.data.guests,
  );

  const result = expediaHotels.map((hotel) => ({
    ...hotel,
    policyCompliance: evaluatePolicyCompliance(hotel),
  }));

  return {
    search: payload.data,
    hotels: result,
  };
}

async function handleGetHotel(req: FastifyRequest, reply: FastifyReply) {
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
}

async function handleGetAvailability(req: FastifyRequest, reply: FastifyReply) {
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
}

export function registerHotelRoutes(app: FastifyInstance): void {
  app.post('/api/hotels/search', async (req, reply) => handleSearchHotels(req, reply));
  app.get('/api/hotels/:hotelId', async (req, reply) => handleGetHotel(req, reply));
  app.get('/api/hotels/:hotelId/availability', async (req, reply) =>
    handleGetAvailability(req, reply));
}
