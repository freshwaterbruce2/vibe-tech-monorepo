import {
  createStripeWebhookBus,
  type StripeSubscriptionLike,
  type StripeWebhookBusContext,
  type StripeWebhookBusEvent,
} from '@vibetech/billing';
import { BookingRepository } from '@vibetech/db-app';
import type { FastifyBaseLogger } from 'fastify';
import { calculateNights, insertSucceededPayment } from './bookingHelpers.js';

type Booking = NonNullable<ReturnType<BookingRepository['getBookingById']>>;

interface StripeCheckoutSessionObject {
  id?: string;
  metadata?: { bookingId?: string } | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
}

/** Record Stripe payment(s) for a confirmed checkout (split or single). */
function recordWebhookPayments(
  bookingRepo: BookingRepository,
  booking: Booking,
): void {
  const createdAt = new Date().toISOString();
  if (booking.billingMethod === 'bleisure_split') {
    const totalNights = calculateNights(booking.checkIn, booking.checkOut);
    const leisureNights = booking.leisureNights ?? 0;
    const leisurePrice =
      totalNights > 0 ? (leisureNights / totalNights) * booking.totalPrice : 0;
    const corporatePrice = booking.totalPrice - leisurePrice;
    // Record Stripe payment for personal/leisure portion
    insertSucceededPayment(
      bookingRepo, booking.id, leisurePrice, booking.currency, 'stripe', createdAt,
    );
    // Record corporate invoice payment for corporate portion
    insertSucceededPayment(
      bookingRepo, booking.id, corporatePrice, booking.currency, 'corporate_invoice', createdAt,
    );
  } else {
    insertSucceededPayment(
      bookingRepo, booking.id, booking.totalPrice, booking.currency, 'stripe', createdAt,
    );
  }
  bookingRepo.confirmBookingPayment(booking.id);
}

function handleCheckoutSessionCompleted(
  bookingRepo: BookingRepository,
  event: StripeWebhookBusEvent,
  context: StripeWebhookBusContext,
): void {
  const session = event.data.object as StripeCheckoutSessionObject;
  context.logger?.info?.(
    {
      app: 'vibe-booking-backend',
      eventId: event.id,
      sessionId: session.id,
      customerEmail:
        session.customer_email ?? session.customer_details?.email ?? null,
    },
    'Stripe checkout session completed webhook received',
  );

  const bookingId = session.metadata?.bookingId;
  if (!bookingId) return;

  try {
    const booking = bookingRepo.getBookingById(bookingId);
    if (booking && booking.paymentStatus !== 'paid') {
      recordWebhookPayments(bookingRepo, booking);
      context.logger?.info?.(
        { bookingId },
        'Booking payment processed via Stripe webhook',
      );
    }
  } catch (err) {
    (context.logger as unknown as FastifyBaseLogger | undefined)?.error?.(
      { err, bookingId },
      'Failed to process Stripe webhook payment',
    );
  }
}

export function createBookingStripeWebhookBus(
  bookingRepo: BookingRepository,
): ReturnType<typeof createStripeWebhookBus> {
  const processedStripeWebhookEvents = new Set<string>();

  return createStripeWebhookBus({
    hasProcessedEvent: (eventId) => processedStripeWebhookEvents.has(eventId),
    markEventProcessed: (event) => {
      processedStripeWebhookEvents.add(event.id);
    },
    handlers: {
      'checkout.session.completed': (event, context) =>
        handleCheckoutSessionCompleted(bookingRepo, event, context),
    },
    prefixHandlers: [
      {
        prefix: 'customer.subscription.',
        handle: (event, context) => {
          const subscription = event.data.object as StripeSubscriptionLike;
          context.logger?.info?.(
            {
              app: 'vibe-booking-backend',
              eventId: event.id,
              subscriptionId: subscription.id,
              status: subscription.status,
            },
            'Stripe subscription event received',
          );
        },
      },
    ],
    defaultHandler: (event, context) => {
      context.logger?.debug?.(
        { type: event.type },
        'Unhandled Stripe webhook event',
      );
    },
  });
}
