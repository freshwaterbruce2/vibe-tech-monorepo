import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { createTenantCheckoutSession } from '@vibetech/payments';
import { buildPaymentReceiptEmail } from '@vibetech/email';
import { recordAiUsage, getAiUsage } from '@vibetech/ai';
import { getAuthUser, requireAuth } from './authHelpers.js';

async function handleDemoReceipt(host: string, port: number) {
  const viewUrl = `${process.env.APP_BASE_URL ?? `http://${host}:${port}`}/billing/receipt-preview`;
  const email = await buildPaymentReceiptEmail({
    invoiceNumber: 'DEMO-100',
    amount: 9,
    currency: 'USD',
    paidAt: '2026-05-15',
    viewUrl,
    companyName: 'Vibe Booking',
    clientName: 'Demo customer',
  });

  return {
    ok: true,
    subject: email.subject,
    html: email.html,
    text: email.text,
  };
}

async function handleDemoUsage(req: FastifyRequest) {
  const usage = recordAiUsage({
    appId: 'vibe-booking-backend',
    tenantId: 'vibe-booking-tenant',
    provider: 'openrouter',
    usage: {
      inputTokens: 120,
      outputTokens: 80,
      totalTokens: 200,
      costUsd: 0,
    },
  });

  return {
    ok: true,
    user: getAuthUser(req),
    usage,
    summary: getAiUsage('vibe-booking-backend', 'openrouter', 'vibe-booking-tenant'),
  };
}

async function handleDemoCheckout(
  req: FastifyRequest,
  reply: FastifyReply,
  host: string,
  port: number,
) {
  const baseUrl = process.env.APP_BASE_URL ?? `http://${host}:${port}`;
  try {
    const session = await createTenantCheckoutSession({
      tenantId: 'vibe-booking-tenant',
      plan: 'pro',
      currency: 'USD',
      successUrl: `${baseUrl}/billing/success`,
      cancelUrl: `${baseUrl}/billing/canceled`,
      metadata: {
        app: 'vibe-booking-backend',
        plan: 'pro',
      },
      lineItems: [
        {
          name: 'Vibe Booking Pro Plan',
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
}

export function registerDemoRoutes(
  app: FastifyInstance,
  host: string,
  port: number,
): void {
  app.get('/api/emails/demo-receipt', async () => handleDemoReceipt(host, port));

  app.post('/api/ai/demo-usage', { preHandler: [requireAuth] }, async (req) =>
    handleDemoUsage(req));

  app.get('/api/billing/demo-checkout', async (req, reply) =>
    handleDemoCheckout(req, reply, host, port));
}
