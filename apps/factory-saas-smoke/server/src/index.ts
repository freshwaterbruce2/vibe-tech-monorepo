import cors from '@fastify/cors';
import Fastify from 'fastify';

import { buildCheckoutSession } from '@vibetech/billing';
import { GENERATED_FEATURES, hasFeature } from './entitlements.js';

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 5320);
const host = process.env.HOST ?? '127.0.0.1';

await app.register(cors, {
  origin: true,
});

app.get('/api/health', async () => ({
  ok: true,
  app: 'factory-saas-smoke',
}));

app.get('/api/pro', async (req, reply) => {
  const plan = req.headers['x-plan'] === 'pro' ? 'pro' : 'free';

  if (!hasFeature(plan, GENERATED_FEATURES.premiumRoute)) {
    return reply.code(403).send({
      error: 'Upgrade required',
      plan,
    });
  }

  return {
    ok: true,
    plan,
    feature: GENERATED_FEATURES.premiumRoute,
  };
});

app.get('/api/billing/demo-checkout', async (req, reply) => {
  const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;

  try {
    const session = await buildCheckoutSession({
      currency: 'USD',
      successUrl: `${baseUrl}/billing/success`,
      cancelUrl: `${baseUrl}/billing/canceled`,
      metadata: {
        app: 'factory-saas-smoke',
        plan: 'pro',
      },
      lineItems: [
        {
          name: 'FactorySaasSmoke Pro',
          unitAmount: 19,
        },
      ],
    });

    return {
      ok: true,
      url: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    req.log.error({ err: error }, 'Demo checkout session failed');
    return reply.code(503).send({
      error: 'Stripe checkout is not configured',
      detail,
    });
  }
});

await app.listen({ port, host });
