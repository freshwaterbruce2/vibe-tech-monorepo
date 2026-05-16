// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const billingFns = vi.hoisted(() => ({
  buildCheckoutSession: vi.fn(),
  getStripeClient: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}))

vi.mock('@vibetech/billing', () => billingFns)

describe('stripe adapter bridge', () => {
  it('re-exports the shared billing package payment helpers', async () => {
    const stripeAdapter = await import('./stripeAdapter.js')

    expect(stripeAdapter.buildCheckoutSession).toBe(billingFns.buildCheckoutSession)
    expect(stripeAdapter.getStripeClient).toBe(billingFns.getStripeClient)
    expect(stripeAdapter.verifyWebhookSignature).toBe(billingFns.verifyWebhookSignature)
  })
})
