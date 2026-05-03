// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  renderInvoicePdfBuffer,
  type InvoicePdfInput,
  type InvoicePdfLineItem,
} from './render.js'

describe('pdf render', () => {
  it('renders an invoice to a non-empty PDF buffer with %PDF magic bytes', async () => {
    const invoice: InvoicePdfInput = {
      invoiceNumber: 'INV-12345',
      issueDate: '2026-05-01',
      dueDate: '2026-06-01',
      client: {
        name: 'Acme Corp',
        email: 'billing@acme.example.com',
        address: '123 Example Street, Springfield, USA',
        phone: '+1-555-0100',
        company: 'Acme Corporation',
      },
      subtotal: 1000,
      tax: 100,
      total: 1100,
      currency: 'USD',
      notes: 'Thank you for your business.',
      terms: 'Net 30. Late payments incur a 1.5% monthly interest charge.',
      companyName: 'Vibetech Studio',
    }

    const items: InvoicePdfLineItem[] = [
      {
        description: 'Consulting services for May 2026',
        quantity: 10,
        unitPrice: 75,
        total: 750,
      },
      {
        description: 'Design revisions',
        quantity: 5,
        unitPrice: 50,
        total: 250,
      },
    ]

    const pdf = await renderInvoicePdfBuffer(invoice, items)

    expect(Buffer.isBuffer(pdf)).toBe(true)
    expect(pdf.length).toBeGreaterThan(1000)
    expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF')
  })

  it('renders item-strategy invoice with per-item tax + currency stamp', async () => {
    const invoice: InvoicePdfInput = {
      invoiceNumber: 'INV-FX-1',
      issueDate: '2026-05-01',
      dueDate: '2026-06-01',
      client: { name: 'EU Client', email: 'eu@example.com' },
      subtotal: 200,
      tax: 30,
      total: 230,
      currency: 'EUR',
      taxStrategy: 'item',
      userCurrencyAtIssue: 'USD',
      exchangeRateToUserCurrency: 1.085,
      companyName: 'Vibetech Studio',
    }
    const items: InvoicePdfLineItem[] = [
      { description: 'A', quantity: 1, unitPrice: 100, total: 110, taxAmount: 10 },
      { description: 'B', quantity: 2, unitPrice: 50, total: 120, taxAmount: 20 },
    ]

    for (const template of ['classic', 'modern', 'minimal'] as const) {
      const pdf = await renderInvoicePdfBuffer(invoice, items, { template })
      expect(Buffer.isBuffer(pdf)).toBe(true)
      expect(pdf.length).toBeGreaterThan(1000)
      expect(pdf.subarray(0, 4).toString('utf8')).toBe('%PDF')
    }
  })
})