// @vitest-environment node
import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getStripe', () => {
  it('throws when STRIPE_SECRET_KEY is not set', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    const { default: getStripe } = await import('./stripe.js')
    expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not set')
  })

  it('returns a Stripe instance when the env var is set', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy_for_unit_tests')
    const { default: getStripe } = await import('./stripe.js')
    const client = getStripe()
    expect(client).toBeInstanceOf(Stripe)
  })

  it('returns the same singleton on subsequent calls', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy_for_unit_tests')
    const { default: getStripe } = await import('./stripe.js')
    const a = getStripe()
    const b = getStripe()
    expect(a).toBe(b)
  })
})
