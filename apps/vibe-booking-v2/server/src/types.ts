import type { PlanLevel } from '@vibetech/monetization';

export interface Hotel {
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

export interface Booking {
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

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  plan: PlanLevel;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  provider: 'square' | 'stripe';
  status: 'succeeded';
  createdAt: string;
}
