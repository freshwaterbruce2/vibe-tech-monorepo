import Stripe from 'stripe'

let cached: Stripe | undefined

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
  if (cached) return cached

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  cached = new Stripe(key, {
    apiVersion: '2026-04-22.dahlia',
  })

  return cached
}
