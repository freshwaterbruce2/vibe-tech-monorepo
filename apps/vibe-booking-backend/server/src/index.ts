import cors from '@fastify/cors';
import Fastify from 'fastify';
import {
  getStripeClient,
  resolveStripeWebhookEvent,
  type StripeWebhookVerifierLike,
} from '@vibetech/billing';
import { BookingRepository } from '@vibetech/db-app';
import fastifyRawBody from 'fastify-raw-body';
import { loadLocalEnv } from './loadLocalEnv.js';
import { setupStripeTenant } from './stripeSetup.js';
import { DEFAULT_HOST, DEFAULT_PORT } from './types.js';
import { setupAuthHook } from './authHelpers.js';
import { registerAuthRoutes } from './authRoutes.js';
import { registerBookingRoutes } from './bookingRoutes.js';
import { registerDemoRoutes } from './demoRoutes.js';
import { registerHotelRoutes } from './hotelsRoutes.js';
import { registerPaymentRoutes } from './paymentRoutes.js';
import { registerProRoutes } from './proRoutes.js';
import { registerReviewRoutes } from './reviewRoutes.js';
import { createBookingStripeWebhookBus } from './stripeWebhookBus.js';

loadLocalEnv();

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const host = process.env.HOST ?? DEFAULT_HOST;

setupAuthHook(app);

app.log.info('Initializing SQLite database schema using BookingRepository...');
const bookingRepo = new BookingRepository();

await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
});

const stripeWebhookBus = createBookingStripeWebhookBus(bookingRepo);

app.get('/api/health', async () => ({
  status: 'ok',
  service: 'vibe-booking-backend',
  timestamp: new Date().toISOString(),
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

registerAuthRoutes(app, bookingRepo);
registerProRoutes(app);
registerDemoRoutes(app, host, port);
registerHotelRoutes(app);
registerBookingRoutes(app, bookingRepo);
registerPaymentRoutes(app, bookingRepo, host, port);
registerReviewRoutes(app, bookingRepo);

await setupStripeTenant(app.log);
await app.listen({ port, host });
