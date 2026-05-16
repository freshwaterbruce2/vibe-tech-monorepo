// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

const emailFns = vi.hoisted(() => ({
  InvoiceCreated: vi.fn(),
  OverdueReminder: vi.fn(),
  PaymentReceipt: vi.fn(),
  renderToHtml: vi.fn(),
  renderToText: vi.fn(),
}))

vi.mock('@vibetech/emails', () => emailFns)

describe('email render bridge', () => {
  it('re-exports the shared emails package surface', async () => {
    const render = await import('./render.js')

    expect(render.InvoiceCreated).toBe(emailFns.InvoiceCreated)
    expect(render.OverdueReminder).toBe(emailFns.OverdueReminder)
    expect(render.PaymentReceipt).toBe(emailFns.PaymentReceipt)
    expect(render.renderToHtml).toBe(emailFns.renderToHtml)
    expect(render.renderToText).toBe(emailFns.renderToText)
  })
})
