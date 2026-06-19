import { getStripeClient } from '@vibetech/billing';
import { BookingRepository } from '@vibetech/db-app';
import type { FastifyBaseLogger } from 'fastify';
import { insertSucceededPayment } from './bookingHelpers.js';

type Booking = NonNullable<ReturnType<BookingRepository['getBookingById']>>;

export interface CheckoutPricing {
  isSplit: boolean;
  nights: number;
  leisurePrice: number;
  corporatePrice: number;
}

interface StripeCheckoutClient {
  checkout: {
    sessions: {
      create: (
        params: Record<string, unknown>,
      ) => Promise<{ url: string | null; id: string }>;
    };
  };
}

/** Corporate-invoice billing skips Stripe and auto-confirms the stay. */
export function recordCorporateInvoicePayment(
  bookingRepo: BookingRepository,
  booking: Booking,
  baseUrl: string,
  log: FastifyBaseLogger,
): { ok: true; url: string } {
  insertSucceededPayment(
    bookingRepo,
    booking.id,
    booking.totalPrice,
    booking.currency,
    'corporate_invoice',
  );
  bookingRepo.confirmBookingPayment(booking.id);
  log.info({ bookingId: booking.id }, 'Corporate invoice booking confirmed');
  return {
    ok: true,
    url: `${baseUrl}/confirmation/${booking.id}?method=invoice`,
  };
}

/**
 * Local/E2E fallback when Stripe is not configured: simulate the webhook by
 * recording the payment(s) shortly after returning the redirect URL.
 */
export function scheduleMockCheckoutCompletion(
  bookingRepo: BookingRepository,
  booking: Booking,
  pricing: CheckoutPricing,
  baseUrl: string,
  log: FastifyBaseLogger,
): { ok: true; url: string } {
  setTimeout(() => {
    try {
      const createdAt = new Date().toISOString();
      if (pricing.isSplit) {
        insertSucceededPayment(
          bookingRepo, booking.id, pricing.leisurePrice, booking.currency, 'stripe', createdAt,
        );
        insertSucceededPayment(
          bookingRepo, booking.id, pricing.corporatePrice, booking.currency, 'corporate_invoice', createdAt,
        );
      } else {
        insertSucceededPayment(
          bookingRepo, booking.id, booking.totalPrice, booking.currency, 'stripe', createdAt,
        );
      }
      bookingRepo.confirmBookingPayment(booking.id);
      log.info({ bookingId: booking.id }, 'Mock Stripe checkout completed');
    } catch (err) {
      log.error({ err }, 'Mock Stripe checkout completion failed');
    }
  }, 100);

  const redirectParams = pricing.isSplit ? '?method=bleisure_split' : '';
  return {
    ok: true,
    url: `${baseUrl}/confirmation/${booking.id}${redirectParams}`,
  };
}

/** Create a real Stripe Checkout session for the booking. */
export async function createStripeCheckoutSession(
  booking: Booking,
  hotelName: string,
  pricing: CheckoutPricing,
  baseUrl: string,
): Promise<{ url: string | null }> {
  const stripe = getStripeClient() as unknown as StripeCheckoutClient;
  const { isSplit, nights, leisurePrice } = pricing;
  const productName = isSplit
    ? `Stay at ${hotelName} - Leisure Portion (${booking.leisureNights} nights)`
    : `Stay at ${hotelName}`;
  const description = `${isSplit ? booking.leisureNights : nights} nights, ${booking.guests} guests`;
  const unitAmount = Math.round(
    (isSplit ? leisurePrice : booking.totalPrice) * 100,
  );
  const successSuffix = isSplit ? '&method=bleisure_split' : '';
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: booking.currency.toLowerCase(),
          product_data: { name: productName, description },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${baseUrl}/confirmation/${booking.id}?session_id={CHECKOUT_SESSION_ID}${successSuffix}`,
    cancel_url: `${baseUrl}/payment/${booking.id}`,
    metadata: { bookingId: booking.id, app: 'vibe-booking-backend' },
  });
  return { url: session.url };
}
