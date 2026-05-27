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
  currency: string;
  paymentStatus: string;
  status: string;
};

let server: Server | undefined;
let baseUrl = '';

async function readJson<T>(response: Response): Promise<T> {
  expect(response.headers.get('content-type')).toContain('application/json');
  return (await response.json()) as T;
}

async function post(path: string, body: unknown, token?: string): Promise<Response> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await post(path, body, token);
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
      expect.arrayContaining([expect.objectContaining({ city: 'Miami' })]),
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
    const login = await postJson<AuthResponse>('/auth/login', {
      email,
      password: 'booking-pass',
    });
    expect(login.token).toBeTruthy();

    const rejectedLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrong-pass' }),
    });
    expect(rejectedLogin.status).toBe(401);

    const bookingResult = await postJson<{ booking: Booking }>(
      '/bookings',
      {
        hotelId: 'h_1',
        checkIn: '2026-05-04',
        checkOut: '2026-05-06',
        guests: 2,
      },
      auth.token,
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
      auth.token,
    );

    expect(paymentResult.booking).toMatchObject({
      id: bookingResult.booking.id,
      status: 'confirmed',
      paymentStatus: 'paid',
    });
  });

  it('rejects invalid booking dates and mismatched payment details', async () => {
    const auth = await postJson<AuthResponse>('/auth/register', {
      email: `auditor-${randomUUID()}@example.com`,
      password: 'booking-pass',
      firstName: 'Demo',
      lastName: 'Auditor',
    });

    const invalidDates = await post(
      '/bookings',
      {
        hotelId: 'h_1',
        checkIn: '2026-05-06',
        checkOut: '2026-05-04',
        guests: 2,
      },
      auth.token,
    );
    expect(invalidDates.status).toBe(400);

    const bookingResult = await postJson<{ booking: Booking }>(
      '/bookings',
      {
        hotelId: 'h_1',
        checkIn: '2026-05-04',
        checkOut: '2026-05-06',
        guests: 2,
      },
      auth.token,
    );

    const underpaid = await post(
      '/payments/create',
      {
        bookingId: bookingResult.booking.id,
        amount: bookingResult.booking.totalPrice - 1,
        currency: bookingResult.booking.currency,
      },
      auth.token,
    );
    expect(underpaid.status).toBe(400);

    const wrongCurrency = await post(
      '/payments/create',
      {
        bookingId: bookingResult.booking.id,
        amount: bookingResult.booking.totalPrice,
        currency: 'EUR',
      },
      auth.token,
    );
    expect(wrongCurrency.status).toBe(400);
  });
});
