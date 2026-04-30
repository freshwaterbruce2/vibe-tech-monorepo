import cors from 'cors';
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  description: string;
  nightlyRate: number;
  currency: string;
  rating: number;
}

interface Booking {
  id: string;
  hotelId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  createdAt: string;
}

interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  provider: 'square' | 'stripe';
  status: 'succeeded';
  createdAt: string;
}

const users: User[] = [];
const sessions = new Map<string, string>();
const bookings: Booking[] = [];
const payments: Payment[] = [];

const hotels: Hotel[] = [
  {
    id: 'h_1',
    name: 'Harbor Point Suites',
    city: 'Miami',
    country: 'USA',
    description: 'Oceanfront suites with coworking space and fast check-in.',
    nightlyRate: 229,
    currency: 'USD',
    rating: 4.6,
  },
  {
    id: 'h_2',
    name: 'SoMa Executive Stay',
    city: 'San Francisco',
    country: 'USA',
    description: 'Central location for conferences with meeting-ready rooms.',
    nightlyRate: 285,
    currency: 'USD',
    rating: 4.4,
  },
  {
    id: 'h_3',
    name: 'Lakeview Business Hotel',
    city: 'Chicago',
    country: 'USA',
    description: 'Business travel focused amenities with flexible checkout.',
    nightlyRate: 199,
    currency: 'USD',
    rating: 4.3,
  },
];

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

const squareWebhookSchema = z.object({
  eventType: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
});

function calculateNights(checkIn: string, checkOut: string): number {
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const delta = checkOutDate.getTime() - checkInDate.getTime();
  const nights = Math.ceil(delta / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 1;
}

function issueToken(userId: string): string {
  const token = `${userId}_${randomUUID()}`;
  sessions.set(token, userId);
  return token;
}

function parseAuthToken(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (!authorization) return null;
  const [type, token] = authorization.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

type AuthenticatedRequest = Request & { userId?: string };

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = parseAuthToken(req);
  if (!token || !sessions.has(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.userId = sessions.get(token);
  next();
}

export function createBookingApiServer(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'business-booking-platform-next-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const payload = registerSchema.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: payload.error.flatten() });
      return;
    }

    const existing = users.find((user) => user.email === payload.data.email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const user: User = {
      id: randomUUID(),
      ...payload.data,
    };
    users.push(user);
    const token = issueToken(user.id);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const payload = authSchema.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: payload.error.flatten() });
      return;
    }

    const user = users.find(
      (candidate) =>
        candidate.email === payload.data.email && candidate.password === payload.data.password
    );
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = issueToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = users.find((candidate) => candidate.id === req.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  });

  app.post('/api/hotels/search', (req, res) => {
    const payload = searchSchema.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: payload.error.flatten() });
      return;
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

    res.json({
      search: payload.data,
      hotels: result,
    });
  });

  app.get('/api/hotels/:hotelId', (req, res) => {
    const hotel = hotels.find((candidate) => candidate.id === req.params.hotelId);
    if (!hotel) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }
    res.json({ hotel });
  });

  app.get('/api/hotels/:hotelId/availability', (req, res) => {
    const hotel = hotels.find((candidate) => candidate.id === req.params.hotelId);
    if (!hotel) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }
    res.json({
      hotelId: hotel.id,
      available: true,
      requested: {
        checkIn: req.query['checkIn'] ?? null,
        checkOut: req.query['checkOut'] ?? null,
      },
    });
  });

  app.post('/api/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
    const payload = createBookingSchema.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: payload.error.flatten() });
      return;
    }

    const hotel = hotels.find((candidate) => candidate.id === payload.data.hotelId);
    if (!hotel) {
      res.status(404).json({ error: 'Hotel not found' });
      return;
    }

    const nights = calculateNights(payload.data.checkIn, payload.data.checkOut);
    const booking: Booking = {
      id: randomUUID(),
      userId: req.userId as string,
      hotelId: hotel.id,
      checkIn: payload.data.checkIn,
      checkOut: payload.data.checkOut,
      guests: payload.data.guests,
      totalPrice: nights * hotel.nightlyRate,
      currency: hotel.currency,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    res.status(201).json({ booking });
  });

  app.get('/api/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
    const userBookings = bookings.filter((booking) => booking.userId === req.userId);
    res.json({ bookings: userBookings });
  });

  app.get('/api/bookings/:bookingId', requireAuth, (req: AuthenticatedRequest, res) => {
    const booking = bookings.find((candidate) => candidate.id === req.params['bookingId']);
    if (!booking || booking.userId !== req.userId) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json({ booking });
  });

  app.post('/api/bookings/:bookingId/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
    const booking = bookings.find((candidate) => candidate.id === req.params['bookingId']);
    if (!booking || booking.userId !== req.userId) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    booking.status = 'cancelled';
    res.json({ booking });
  });

  app.post('/api/payments/create', requireAuth, (req: AuthenticatedRequest, res) => {
    const payload = paymentSchema.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: payload.error.flatten() });
      return;
    }

    const booking = bookings.find((candidate) => candidate.id === payload.data.bookingId);
    if (!booking || booking.userId !== req.userId) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const payment: Payment = {
      id: randomUUID(),
      bookingId: booking.id,
      amount: payload.data.amount,
      currency: payload.data.currency.toUpperCase(),
      provider: payload.data.provider,
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    };
    payments.push(payment);

    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';

    res.status(201).json({ payment, booking });
  });

  app.post('/api/payments/webhook/square', (req, res) => {
    const payload = squareWebhookSchema.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: payload.error.flatten() });
      return;
    }

    res.status(202).json({
      received: true,
      provider: 'square',
      eventType: payload.data.eventType,
    });
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: error.message });
  });

  return app;
}

export function getSeedHotels() {
  return hotels;
}
