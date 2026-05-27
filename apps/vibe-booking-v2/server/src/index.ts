import cors from '@fastify/cors';
import Fastify from 'fastify';
import {
  createStripeWebhookBus,
  getStripeClient,
  resolveStripeWebhookEvent,
  type StripeCheckoutSessionLike,
  type StripeSubscriptionLike,
  type StripeWebhookVerifierLike,
} from '@vibetech/billing';
import fastifyRawBody from 'fastify-raw-body';
import { loadLocalEnv } from './loadLocalEnv.js';
import { users } from './bookings.js';
import { registerRoutes } from './routes.js';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 6090);
const host = process.env.HOST ?? '127.0.0.1';

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
});

const processedStripeWebhookEvents = new Set<string>();
const stripeWebhookBus = createStripeWebhookBus({
  hasProcessedEvent: (eventId) => processedStripeWebhookEvents.has(eventId),
  markEventProcessed: (event) => {
    processedStripeWebhookEvents.add(event.id);
  },
  handlers: {
    'checkout.session.completed': (event, context) => {
      const session = event.data.object as StripeCheckoutSessionLike;
      context.logger?.info?.(
        {
          app: 'business-booking-v2',
          eventId: event.id,
          sessionId: session.id,
          customerEmail: session.customer_email ?? session.customer_details?.email ?? null,
        },
        'Stripe checkout session completed',
      );
      // Upgrade user plan if email matches a registered traveler
      const email = session.customer_email ?? session.customer_details?.email;
      if (email) {
        const traveler = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (traveler) {
          traveler.plan = 'pro';
          context.logger?.info?.({}, `Upgraded traveler ${email} to pro plan via Stripe Checkout`);
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
            app: 'business-booking-v2',
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
    context.logger?.debug?.({ type: event.type }, 'Unhandled Stripe webhook event');
  },
});

app.get('/api/health', async () => ({
  ok: true,
  app: 'business-booking-v2',
}));

app.post(
  '/api/webhooks/stripe',
  {
    config: { rawBody: true },
  },
  async (req, reply) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      req.log.warn('STRIPE_WEBHOOK_SECRET is not set - accepting unsigned local webhook payloads');
    }

    try {
      const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
      const event = resolveStripeWebhookEvent({
        rawBody,
        signature: req.headers['stripe-signature'],
        secret: webhookSecret,
        parsedBody: req.body,
        stripeClient: webhookSecret
          ? (getStripeClient() as unknown as StripeWebhookVerifierLike)
          : undefined,
        allowUnsigned: !webhookSecret,
      });
      const result = await stripeWebhookBus.dispatch(event, { logger: req.log });

      return {
        ok: true,
        handled: result.handled,
        skipped: result.skipped,
      };
    } catch (error) {
      req.log.error({ err: error }, 'Stripe webhook processing failed');
      return reply.code(400).send({
        error: 'Stripe webhook invalid',
      });
    }
  },
);

// Register business booking routes
await registerRoutes(app, host, port);

await app.listen({ port, host });
