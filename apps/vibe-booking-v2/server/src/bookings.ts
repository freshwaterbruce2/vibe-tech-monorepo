import { randomUUID } from 'node:crypto';
import type { Hotel, Booking, Payment, User } from './types.js';

// In-memory tables
export const hotels: Hotel[] = [
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

export const users: User[] = [];
export const sessions = new Map<string, string>(); // token -> userId
export const bookings: Booking[] = [];
export const payments: Payment[] = [];

// Helper functions
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseBookingDate(value: string): number | null {
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

export function validateBookingDates(checkIn: string, checkOut: string): string | null {
  const checkInTime = parseBookingDate(checkIn);
  if (checkInTime === null) return 'Check-in date must use YYYY-MM-DD';

  const checkOutTime = parseBookingDate(checkOut);
  if (checkOutTime === null) return 'Check-out date must use YYYY-MM-DD';

  if (checkOutTime <= checkInTime) return 'Check-out date must be after check-in';

  return null;
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const checkInTime = parseBookingDate(checkIn);
  const checkOutTime = parseBookingDate(checkOut);
  if (checkInTime === null || checkOutTime === null) return 0;

  const delta = checkOutTime - checkInTime;
  return Math.ceil(delta / (1000 * 60 * 60 * 24));
}

export function toCurrencyCents(amount: number): number {
  return Math.round(amount * 100);
}

export function issueToken(userId: string): string {
  const token = `${userId}_${randomUUID()}`;
  sessions.set(token, userId);
  return token;
}
