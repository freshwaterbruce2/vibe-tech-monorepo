import cors from 'cors';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';

interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}

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
const scryptAsync = promisify(scrypt);
const PASSWORD_KEY_LENGTH = 64;

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

function toCurrencyCents(amount: number): number {
  return Math.round(amount * 100);
}

function issueToken(userId: string): string {
  const token = `${userId}_${randomUUID()}`;
  sessions.set(token, userId);
  return token;
}

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

  app.post('/api/auth/register', async (req, res) => {
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
      email: payload.data.email,
      firstName: payload.data.firstName,
      lastName: payload.data.lastName,
      passwordHash: await hashPassword(payload.data.password),
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

  app.post('/api/auth/login', async (req, res) => {
    const payload = authSchema.safeParse(req.body);
    if (!payload.success) {
      res.status(400).json({ error: payload.error.flatten() });
      return;
    }

    const user = users.find((candidate) => candidate.email === payload.data.email);
    if (!user || !(await verifyPassword(payload.data.password, user.passwordHash))) {
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

    const dateError = validateBookingDates(payload.data.checkIn, payload.data.checkOut);
    if (dateError) {
      res.status(400).json({ error: dateError });
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
    if (booking.status === 'cancelled') {
      res.status(409).json({ error: 'Cancelled bookings cannot be paid' });
      return;
    }
    if (booking.paymentStatus === 'paid') {
      res.status(409).json({ error: 'Booking is already paid' });
      return;
    }

    const requestedCurrency = payload.data.currency.toUpperCase();
    const amountMatches =
      toCurrencyCents(payload.data.amount) === toCurrencyCents(booking.totalPrice);
    if (!amountMatches || requestedCurrency !== booking.currency) {
      res.status(400).json({ error: 'Payment amount or currency does not match booking' });
      return;
    }

    const payment: Payment = {
      id: randomUUID(),
      bookingId: booking.id,
      amount: payload.data.amount,
      currency: requestedCurrency,
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
