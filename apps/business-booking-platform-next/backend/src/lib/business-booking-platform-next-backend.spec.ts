import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBookingApiServer } from './business-booking-platform-next-backend';

type AuthResponse = {
  token: string;
};

type Hotel = {
  id: string;
  city: string;
};

type Booking = {
  id: string;
  hotelId: string;
  totalPrice: number;
  paymentStatus: string;
  status: string;
};

let server: Server | undefined;
let baseUrl = '';

async function readJson<T>(response: Response): Promise<T> {
  expect(response.headers.get('content-type')).toContain('application/json');
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  expect(response.ok).toBe(true);
  return readJson<T>(response);
}

describe('createBookingApiServer', () => {
  beforeEach(async () => {
    const app = createBookingApiServer();
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server?.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}/api`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (!server) return;
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        server = undefined;
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it('returns health and hotel search results', async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.ok).toBe(true);
    await expect(readJson<{ status: string }>(health)).resolves.toMatchObject({
      status: 'ok',
    });

    const search = await postJson<{ hotels: Hotel[] }>('/hotels/search', {
      destination: 'Miami',
      guests: 2,
    });

    expect(search.hotels).toEqual(
      expect.arrayContaining([expect.objectContaining({ city: 'Miami' })])
    );
  });

  it('supports register, booking creation, and payment confirmation', async () => {
    const email = `traveler-${randomUUID()}@example.com`;
    const auth = await postJson<AuthResponse>('/auth/register', {
      email,
      password: 'booking-pass',
      firstName: 'Demo',
      lastName: 'Traveler',
    });

    const bookingResult = await postJson<{ booking: Booking }>(
      '/bookings',
      {
        hotelId: 'h_1',
        checkIn: '2026-05-04',
        checkOut: '2026-05-06',
        guests: 2,
      },
      auth.token
    );

    expect(bookingResult.booking.totalPrice).toBe(458);
    expect(bookingResult.booking.paymentStatus).toBe('unpaid');

    const paymentResult = await postJson<{ booking: Booking }>(
      '/payments/create',
      {
        bookingId: bookingResult.booking.id,
        amount: bookingResult.booking.totalPrice,
        currency: 'USD',
      },
      auth.token
    );

    expect(paymentResult.booking).toMatchObject({
      id: bookingResult.booking.id,
      status: 'confirmed',
      paymentStatus: 'paid',
    });
  });
});
