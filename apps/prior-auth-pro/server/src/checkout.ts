import type { AuthUser } from '@vibetech/auth';

export interface PriorAuthCheckoutSession {
  id: string;
  url: string;
}

interface StripeCheckoutResponse {
  id?: string;
  url?: string;
  error?: {
    message?: string;
  };
}

export async function createPriorAuthCheckoutSession(input: {
  user: AuthUser;
  baseUrl: string;
}): Promise<PriorAuthCheckoutSession> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('payment_method_types[0]', 'card');
  params.set('success_url', `${input.baseUrl}/billing/success`);
  params.set('cancel_url', `${input.baseUrl}/billing/canceled`);
  params.set('customer_email', input.user.email);
  params.set('client_reference_id', input.user.id);
  params.set('metadata[app]', 'prior-auth-pro');
  params.set('metadata[userId]', input.user.id);
  params.set('metadata[userEmail]', input.user.email);
  params.set('metadata[plan]', 'pro');
  params.set('metadata[targetPlan]', 'PriorAuthPro Pro $29/mo');
  params.set('subscription_data[metadata][app]', 'prior-auth-pro');
  params.set('subscription_data[metadata][userId]', input.user.id);
  params.set('subscription_data[metadata][userEmail]', input.user.email);
  params.set('subscription_data[metadata][plan]', 'pro');
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', 'usd');
  params.set('line_items[0][price_data][unit_amount]', '2900');
  params.set('line_items[0][price_data][recurring][interval]', 'month');
  params.set('line_items[0][price_data][product_data][name]', 'PriorAuthPro Pro');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const body = (await response.json()) as StripeCheckoutResponse;
  if (!response.ok) {
    throw new Error(body.error?.message ?? `Stripe Checkout failed with HTTP ${response.status}`);
  }

  if (!body.id || !body.url) {
    throw new Error('Stripe Checkout Session returned no URL');
  }

  return {
    id: body.id,
    url: body.url,
  };
}
