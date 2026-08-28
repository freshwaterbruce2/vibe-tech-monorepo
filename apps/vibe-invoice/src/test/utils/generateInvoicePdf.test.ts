import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Invoice } from '../../types/invoice'

// Build a mock jsPDF instance with all methods called by generateInvoicePdf
const mockDoc = {
  internal: { pageSize: { getWidth: () => 210 } },
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  setDrawColor: vi.fn(),
  text: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(30),
  roundedRect: vi.fn(),
  rect: vi.fn(),
  line: vi.fn(),
  addPage: vi.fn(),
  splitTextToSize: vi.fn().mockReturnValue(['line1']),
  save: vi.fn(),
}

// Use a class-style mock so `new jsPDF()` works
vi.mock('jspdf', () => {
  return {
    default: function JsPDFMock() {
      return mockDoc
    },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockDoc.internal.pageSize.getWidth = () => 210
  mockDoc.getTextWidth.mockReturnValue(30)
  mockDoc.splitTextToSize.mockReturnValue(['line1'])
})

const makeInvoice = (overrides?: Partial<Invoice>): Invoice => ({
  id: 'inv-1',
  invoiceNumber: 'INV-2026-001',
  issueDate: new Date('2026-01-15'),
  dueDate: new Date('2026-02-15'),
  client: {
    id: 'c-1',
    name: 'Acme Corp',
    email: 'billing@acme.com',
    company: 'Acme Inc',
    address: '123 Main St',
    phone: '555-0100',
  },
  items: [
    { id: 'i-1', description: 'Consulting', quantity: 10, price: 150, total: 1500 },
    { id: 'i-2', description: 'Design', quantity: 5, price: 200, total: 1000 },
  ],
  subtotal: 2500,
  tax: 200,
  total: 2700,
  status: 'sent',
  currency: 'USD',
  notes: 'Thank you for your business',
  terms: 'Net 30',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
})

describe('generateInvoicePdf', () => {
  it('generates and saves a PDF', async () => {
    const { generateInvoicePdf } = await import('../../utils/generateInvoicePdf')
    generateInvoicePdf(makeInvoice())

    expect(mockDoc.save).toHaveBeenCalledWith('INV-2026-001.pdf')
    expect(mockDoc.text).toHaveBeenCalled()
  }, 15_000)

  it('renders invoice number text', async () => {
    const { generateInvoicePdf } = await import('../../utils/generateInvoicePdf')
    generateInvoicePdf(makeInvoice())

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0])
    expect(textCalls).toContain('INVOICE')
    expect(textCalls).toContain('INV-2026-001')
  })

  it('renders client name', async () => {
    const { generateInvoicePdf } = await import('../../utils/generateInvoicePdf')
    generateInvoicePdf(makeInvoice())

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0])
    expect(textCalls).toContain('Acme Corp')
    expect(textCalls).toContain('billing@acme.com')
  })

  it('uses green fill for paid status', async () => {
    const { generateInvoicePdf } = await import('../../utils/generateInvoicePdf')
    generateInvoicePdf(makeInvoice({ status: 'paid' }))

    expect(mockDoc.setFillColor).toHaveBeenCalledWith('#10b981')
  })

  it('uses amber fill for overdue status', async () => {
    const { generateInvoicePdf } = await import('../../utils/generateInvoicePdf')
    generateInvoicePdf(makeInvoice({ status: 'overdue' }))

    expect(mockDoc.setFillColor).toHaveBeenCalledWith('#f59e0b')
  })

  it('renders notes section when present', async () => {
    const { generateInvoicePdf } = await import('../../utils/generateInvoicePdf')
    generateInvoicePdf(makeInvoice({ notes: 'Custom note' }))

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0])
    expect(textCalls).toContain('Notes')
    expect(mockDoc.splitTextToSize).toHaveBeenCalled()
  })

  it('renders terms section when present', async () => {
    const { generateInvoicePdf } = await import('../../utils/generateInvoicePdf')
    generateInvoicePdf(makeInvoice({ terms: 'Net 60' }))

    const textCalls = mockDoc.text.mock.calls.map((c: unknown[]) => c[0])
    expect(textCalls).toContain('Terms')
  })
})
