import { randomUUID } from 'node:crypto';
import {
  createStripeWebhookBus,
  type StripeSubscriptionLike,
} from '@vibetech/billing';
import { BookingRepository } from '@vibetech/db-app';
import { calculateNights } from './bookingHelpers.js';

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
      'checkout.session.completed': (event, context) => {
        const session = event.data.object as any;
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
        if (bookingId) {
          try {
            const booking = bookingRepo.getBookingById(bookingId);
            if (booking && booking.paymentStatus !== 'paid') {
              const paymentId = randomUUID();
              const createdAt = new Date().toISOString();

              if (booking.billingMethod === 'bleisure_split') {
                const totalNights = calculateNights(
                  booking.checkIn,
                  booking.checkOut,
                );
                const leisureNights = booking.leisureNights ?? 0;
                const leisurePrice =
                  totalNights > 0
                    ? (leisureNights / totalNights) * booking.totalPrice
                    : 0;
                const corporatePrice = booking.totalPrice - leisurePrice;

                // Record Stripe payment for personal/leisure portion
                bookingRepo.createPayment({
                  id: paymentId,
                  bookingId: booking.id,
                  amount: leisurePrice,
                  currency: booking.currency,
                  provider: 'stripe',
                  status: 'succeeded',
                  createdAt,
                });

                // Record Corporate invoice payment for corporate portion
                bookingRepo.createPayment({
                  id: randomUUID(),
                  bookingId: booking.id,
                  amount: corporatePrice,
                  currency: booking.currency,
                  provider: 'corporate_invoice',
                  status: 'succeeded',
                  createdAt,
                });
              } else {
                bookingRepo.createPayment({
                  id: paymentId,
                  bookingId: booking.id,
                  amount: booking.totalPrice,
                  currency: booking.currency,
                  provider: 'stripe',
                  status: 'succeeded',
                  createdAt,
                });
              }

              bookingRepo.confirmBookingPayment(booking.id);
              context.logger?.info?.(
                { bookingId },
                'Booking payment processed via Stripe webhook',
              );
            }
          } catch (err) {
            context.logger?.error?.(
              { err, bookingId },
              'Failed to process Stripe webhook payment',
            );
          }
        }
      },
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
