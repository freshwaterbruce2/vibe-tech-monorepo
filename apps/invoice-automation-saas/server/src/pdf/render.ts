import { renderToBuffer } from '@react-pdf/renderer'

import InvoicePdfDocument from './InvoicePdfDocument.js'
import type {
  InvoicePdfClient,
  InvoicePdfData,
  InvoicePdfLineItem,
} from './InvoicePdfDocument.js'

export type { InvoicePdfClient, InvoicePdfData, InvoicePdfLineItem }

/**
 * Minimal invoice shape used as input to the PDF renderer.
 *
 * Defined locally (rather than reusing the frontend Invoice type from
 * src/types/invoice.ts) so the server pipeline does not depend on
 * browser-only types and can accept rows directly from SQLite (ISO date
 * strings, no Date objects).
 */
export interface InvoicePdfInput {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  client: InvoicePdfClient
  subtotal: number
  tax: number
  total: number
  currency: string
  notes?: string | null
  terms?: string | null
  companyName?: string
}

export const renderInvoicePdfBuffer = (
  invoice: InvoicePdfInput,
  items: InvoicePdfLineItem[],
): Promise<Buffer> => {
  const data: InvoicePdfData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    client: invoice.client,
    lineItems: items,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    currency: invoice.currency,
    notes: invoice.notes ?? null,
    terms: invoice.terms ?? null,
    companyName: invoice.companyName,
  }

  // Call the component directly to get the inner <Document> ReactElement.
  // renderToBuffer expects ReactElement<DocumentProps>, which the component
  // produces; using <Component data={...}/> would yield a wrapper element
  // whose props do not match DocumentProps.
  return renderToBuffer(InvoicePdfDocument({ data }))
}