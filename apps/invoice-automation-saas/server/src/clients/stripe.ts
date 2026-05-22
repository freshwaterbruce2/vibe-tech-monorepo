import Stripe from 'stripe'
import { getStripeClient } from '@vibetech/payments'

/**
 * Returns a singleton Stripe SDK instance.
 *
 * Reads STRIPE_SECRET_KEY from process.env on first call. Throws immediately
 * if the env var is not set, so production startup fails fast on misconfig.
 *
 * Subsequent calls return the cached instance. Tests can reset the cache by
 * re-importing this module after `vi.resetModules()`.
 */
export default function getStripe(): Stripe {
  return getStripeClient() as unknown as Stripe
}
