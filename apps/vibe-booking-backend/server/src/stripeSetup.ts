import { getStripeClient } from '@vibetech/billing';
import type { FastifyBaseLogger } from 'fastify';

interface StripeEntity {
  id: string;
  metadata: Record<string, string>;
  status?: string;
  email?: string;
  name?: string;
}

interface StripeList<T> {
  data: T[];
}

interface StripeClient {
  products: {
    list: (params: Record<string, unknown>) => Promise<StripeList<StripeEntity>>;
    create: (params: Record<string, unknown>) => Promise<StripeEntity>;
  };
  prices: {
    list: (params: Record<string, unknown>) => Promise<StripeList<StripeEntity>>;
    create: (params: Record<string, unknown>) => Promise<StripeEntity>;
  };
  customers: {
    list: (params: Record<string, unknown>) => Promise<StripeList<StripeEntity>>;
    create: (params: Record<string, unknown>) => Promise<StripeEntity>;
  };
  subscriptions: {
    list: (params: Record<string, unknown>) => Promise<StripeList<StripeEntity>>;
    create: (params: Record<string, unknown>) => Promise<StripeEntity>;
  };
}

interface PricingTier {
  key: string;
  name: string;
  price: number;
  features: string[];
}

const PRICING_TIERS: PricingTier[] = [
  { key: 'free', name: 'Free', price: 0, features: [] },
  { key: 'pro', name: 'Pro', price: 19, features: ['analytics.revenue', 'ai.assistant'] },
];

function getStripeClientSafe(logger: FastifyBaseLogger): StripeClient | undefined {
  try {
    return getStripeClient() as unknown as StripeClient;
  } catch (err: unknown) {
    logger.error({ err }, 'Unable to initialize Stripe client');
    return undefined;
  }
}

async function fetchExistingProduct(
  stripe: StripeClient,
  tier: PricingTier,
  logger: FastifyBaseLogger,
): Promise<StripeEntity | undefined> {
  const existingProducts = await stripe.products.list({
    limit: 10,
    active: true,
  });
  const found = existingProducts.data.find(
    (p) => p.metadata.appName === 'vibe-booking-backend' && p.metadata.plan === tier.key,
  );

  if (found) {
    return found;
  }

  logger.info(`Creating Stripe product for ${tier.name}...`);
  return stripe.products.create({
    name: `Vibe Booking - ${tier.name}`,
    description: `Pricing plan for ${tier.name} tier`,
    metadata: {
      appName: 'vibe-booking-backend',
      plan: tier.key,
    },
  });
}

async function fetchOrCreatePrice(
  stripe: StripeClient,
  product: StripeEntity,
  tier: PricingTier,
  logger: FastifyBaseLogger,
): Promise<StripeEntity | undefined> {
  const existingPrices = await stripe.prices.list({
    product: product.id,
    limit: 10,
  });
  const found = existingPrices.data[0];
  if (found) {
    return found;
  }

  logger.info(`Creating Stripe price for ${tier.name} ($${tier.price}/mo)...`);
  return stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(tier.price * 100),
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: {
      appName: 'vibe-booking-backend',
      plan: tier.key,
    },
  });
}

async function ensureProductsAndPrices(
  stripe: StripeClient,
  logger: FastifyBaseLogger,
): Promise<Record<string, string>> {
  const mappedPrices: Record<string, string> = {};

  for (const tier of PRICING_TIERS) {
    if (tier.price === 0) {
      logger.info(`Skipping Stripe product creation for free tier: ${tier.name}`);
      continue;
    }

    const product = await fetchExistingProduct(stripe, tier, logger);
    if (!product) {
      logger.warn(`Could not resolve product for tier ${tier.name}`);
      continue;
    }

    const price = await fetchOrCreatePrice(stripe, product, tier, logger);
    if (price) {
      mappedPrices[tier.key] = price.id;
    }
  }

  return mappedPrices;
}

async function ensureCustomer(
  stripe: StripeClient,
  logger: FastifyBaseLogger,
): Promise<StripeEntity | undefined> {
  const email = process.env.DEMO_USER_EMAIL ?? 'owner@example.com';
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 10,
  });
  const found = existingCustomers.data.find(
    (c) => c.metadata.appName === 'vibe-booking-backend',
  );

  if (found) {
    return found;
  }

  logger.info(`Creating Stripe Customer for ${email}...`);
  return stripe.customers.create({
    email,
    name: 'Vibe Booking Owner',
    metadata: {
      appName: 'vibe-booking-backend',
      role: 'owner',
    },
  });
}

async function ensureInitialSubscription(
  stripe: StripeClient,
  customer: StripeEntity,
  mappedPrices: Record<string, string>,
  logger: FastifyBaseLogger,
): Promise<void> {
  const paidTiers = PRICING_TIERS.filter((t) => t.price > 0);
  const firstPaid = paidTiers[0];
  if (!firstPaid) {
    return;
  }

  const priceId = mappedPrices[firstPaid.key];
  if (!priceId) {
    logger.warn('No price available for initial subscription');
    return;
  }

  const existingSubscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    limit: 10,
  });
  const activeSub = existingSubscriptions.data.find(
    (s) => s.status === 'active' || s.status === 'trialing' || s.status === 'incomplete',
  );

  if (activeSub) {
    logger.info('Stripe Subscription already exists.');
    return;
  }

  logger.info(
    `Creating initial Stripe Subscription for customer to plan ${firstPaid.key}...`,
  );
  await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    metadata: {
      appName: 'vibe-booking-backend',
      plan: firstPaid.key,
    },
  });
}

export async function setupStripeTenant(logger: FastifyBaseLogger): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    logger.warn('STRIPE_SECRET_KEY is not set - skipping Stripe provisioning');
    return;
  }

  const stripe = getStripeClientSafe(logger);
  if (!stripe) {
    return;
  }

  try {
    logger.info('Starting Stripe tenant provisioning...');
    const mappedPrices = await ensureProductsAndPrices(stripe, logger);
    const customer = await ensureCustomer(stripe, logger);

    if (customer) {
      await ensureInitialSubscription(stripe, customer, mappedPrices, logger);
    } else {
      logger.warn('Stripe customer provisioning failed');
    }

    logger.info('Stripe tenant provisioning completed successfully!');
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe tenant provisioning failed');
  }
}
