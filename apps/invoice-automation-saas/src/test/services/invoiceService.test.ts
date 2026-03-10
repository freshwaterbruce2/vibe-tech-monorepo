import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import once — module is cached, which is fine since we're testing the singleton
const { invoiceService } = await import('../../services/invoiceService')

beforeEach(() => {
  vi.clearAllMocks()
})

const mockApiInvoice = {
  id: 'inv-1',
  invoice_number: 'INV-001',
  issue_date: '2026-01-15T00:00:00.000Z',
  due_date: '2026-02-15T00:00:00.000Z',
  client_name: 'Test Client',
  client_email: 'test@example.com',
  client_company: 'Test Co',
  client_address: '456 Test Ave',
  client_phone: null,
  subtotal: 2000,
  tax: 160,
  total: 2160,
  status: 'paid',
  notes: 'Thank you',
  terms: 'Net 30',
  currency: 'USD',
  public_token: 'tok-123',
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-01-15T00:00:00.000Z',
  items: [{ id: 'item-1', description: 'Web Dev', quantity: 10, price: 150, total: 1500 }],
}

describe('invoiceService.updateInvoiceStatus', () => {
  it('sends PATCH request with correct status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invoice: mockApiInvoice }),
    })

    const result = await invoiceService.updateInvoiceStatus('inv-1', 'paid')

    expect(result).toBeDefined()
    expect(result.id).toBe('inv-1')
    expect(result.status).toBe('paid')

    const callArgs = mockFetch.mock.calls[0]!
    expect(callArgs[0]).toBe('/api/invoices/inv-1/status')
    expect(callArgs[1].method).toBe('PATCH')
    expect(JSON.parse(callArgs[1].body as string)).toEqual({ status: 'paid' })
  })
})

describe('invoiceService.createInvoice', () => {
  it('sends POST with full invoice data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invoice: mockApiInvoice }),
    })

    const invoice = {
      id: '',
      invoiceNumber: '',
      issueDate: new Date('2026-01-15'),
      dueDate: new Date('2026-02-15'),
      client: { id: '', name: 'Test Client', email: 'test@example.com' },
      items: [{ id: '', description: 'Web Dev', quantity: 10, price: 150, total: 1500 }],
      subtotal: 1500,
      tax: 120,
      total: 1620,
      status: 'draft' as const,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await invoiceService.createInvoice(invoice)
    expect(result).toBeDefined()
    expect(result.id).toBe('inv-1')

    const callArgs = mockFetch.mock.calls[0]!
    expect(callArgs[0]).toBe('/api/invoices')
    expect(callArgs[1].method).toBe('POST')
  })
})

describe('invoiceService error handling', () => {
  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ error: 'Invalid status' }),
    })

    await expect(invoiceService.updateInvoiceStatus('inv-1', 'paid')).rejects.toThrow(
      'Invalid status'
    )
  })
})
