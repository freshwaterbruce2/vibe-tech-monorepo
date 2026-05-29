import { getStripeClient } from '@vibetech/billing';

export async function setupStripeTenant(logger: any) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    logger.warn('STRIPE_SECRET_KEY is not set - skipping Stripe provisioning');
    return;
  }

  try {
    const stripe = getStripeClient() as any;
    logger.info('Starting Stripe tenant provisioning...');

    const pricingTiers = [
      { key: 'free', name: 'Free', price: 0, features: [] },
      { key: 'pro', name: 'Pro', price: 19, features: ['analytics.revenue', 'ai.assistant'] },
    ];
    const mappedPrices: Record<string, string> = {};

    for (const tier of pricingTiers) {
      if (tier.price === 0) {
        logger.info(`Skipping Stripe product creation for free tier: ${tier.name}`);
        continue;
      }

      // Check if product already exists
      const existingProducts = await stripe.products.list({
        limit: 10,
        active: true,
      });
      let product = existingProducts.data.find(
        (p: any) => p.metadata.appName === 'vibe-booking-backend' && p.metadata.plan === tier.key,
      );

      if (!product) {
        logger.info(`Creating Stripe product for ${tier.name}...`);
        product = await stripe.products.create({
          name: `Vibe Booking - ${tier.name}`,
          description: `Pricing plan for ${tier.name} tier`,
          metadata: {
            appName: 'vibe-booking-backend',
            plan: tier.key,
          },
        });
      }

      // Check if price already exists
      const existingPrices = await stripe.prices.list({
        product: product.id,
        limit: 10,
      });
      let price = existingPrices.data[0];

      if (!price) {
        logger.info(`Creating Stripe price for ${tier.name} ($${tier.price}/mo)...`);
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(tier.price * 100),
          currency: 'usd',
          recurring: {
            interval: 'month',
          },
          metadata: {
            appName: 'vibe-booking-backend',
            plan: tier.key,
          },
        });
      }

      mappedPrices[tier.key] = price.id;
    }

    // Automate creation of new Stripe Customer
    const email = process.env.DEMO_USER_EMAIL || 'owner@example.com';
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 10,
    });
    let customer = existingCustomers.data.find(
      (c: any) => c.metadata.appName === 'vibe-booking-backend',
    );

    if (!customer) {
      logger.info(`Creating Stripe Customer for ${email}...`);
      customer = await stripe.customers.create({
        email,
        name: `Vibe Booking Owner`,
        metadata: {
          appName: 'vibe-booking-backend',
          role: 'owner',
        },
      });
    }

    // Automate creation of initial Subscription to the first paid plan
    const paidTiers = pricingTiers.filter((t: any) => t.price > 0);
    const firstPaid = paidTiers[0];
    if (firstPaid) {
      const initialTier = firstPaid.key;
      const priceId = mappedPrices[initialTier];

      if (priceId) {
        // Check if customer already has a subscription
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          limit: 10,
        });

        const activeSub = existingSubscriptions.data.find(
          (s: any) => s.status === 'active' || s.status === 'trialing' || s.status === 'incomplete',
        );

        if (!activeSub) {
          logger.info(
            `Creating initial Stripe Subscription for customer to plan ${initialTier}...`,
          );
          await stripe.subscriptions.create({
            customer: customer.id,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            metadata: {
              appName: 'vibe-booking-backend',
              plan: initialTier,
            },
          });
        } else {
          logger.info('Stripe Subscription already exists.');
        }
      }
    }

    logger.info('Stripe tenant provisioning completed successfully!');
  } catch (err: any) {
    logger.error({ err }, 'Stripe tenant provisioning failed');
  }
}
