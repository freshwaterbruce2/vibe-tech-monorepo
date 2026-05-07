// @vitest-environment node
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import {
  InvoiceCreated,
  OverdueReminder,
  PaymentReceipt,
  renderToHtml,
  renderToText,
} from './render.js'

describe('email render', () => {
  const payUrl = 'https://example.com/pay/inv-12345'
  const invoiceNumber = 'INV-12345'

  it('renders InvoiceCreated to non-empty HTML containing invoice number and pay URL', async () => {
    const html = await renderToHtml(
      createElement(InvoiceCreated, {
        invoiceNumber,
        clientName: 'Acme Corp',
        total: 1234.56,
        currency: 'USD',
        dueDate: '2026-06-01',
        payUrl,
        companyName: 'Vibetech Studio',
      }),
    )

    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain(invoiceNumber)
    expect(html).toContain(payUrl)
    expect(html).toContain('Acme Corp')
  })

  it('renders InvoiceCreated to plain text containing invoice number and pay URL', async () => {
    const text = await renderToText(
      createElement(InvoiceCreated, {
        invoiceNumber,
        clientName: 'Acme Corp',
        total: 1234.56,
        currency: 'USD',
        dueDate: '2026-06-01',
        payUrl,
      }),
    )

    expect(text.length).toBeGreaterThan(0)
    expect(text).toContain(invoiceNumber)
    expect(text).toContain(payUrl)
  })

  it('renders PaymentReceipt to non-empty HTML containing invoice number and view URL', async () => {
    const viewUrl = 'https://example.com/i/inv-12345'
    const html = await renderToHtml(
      createElement(PaymentReceipt, {
        invoiceNumber,
        amount: 1234.56,
        currency: 'USD',
        paidAt: '2026-05-30',
        viewUrl,
        companyName: 'Vibetech Studio',
        clientName: 'Acme Corp',
      }),
    )

    expect(html.length).toBeGreaterThan(0)
    expect(html).toContain(invoiceNumber)
    expect(html).toContain(viewUrl)
  })

  it.each([1, 2, 3] as const)(
    'renders OverdueReminder step %s to non-empty HTML containing invoice number and pay URL',
    async (step) => {
      const html = await renderToHtml(
        createElement(OverdueReminder, {
          invoiceNumber,
          total: 1234.56,
          currency: 'USD',
          dueDate: '2026-04-01',
          daysOverdue: 14,
          payUrl,
          reminderStep: step,
          clientName: 'Acme Corp',
        }),
      )

      expect(html.length).toBeGreaterThan(0)
      expect(html).toContain(invoiceNumber)
      expect(html).toContain(payUrl)
    },
  )
})