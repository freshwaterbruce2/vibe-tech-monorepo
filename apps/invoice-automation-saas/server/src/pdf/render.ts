import { renderToBuffer } from '@react-pdf/renderer'

import type {
  InvoicePdfClient,
  InvoicePdfData,
  InvoicePdfLineItem,
} from './InvoicePdfDocument.js'
import { getTemplate } from './registry.js'
import type { TemplateBase, TemplateConfig } from './templates/types.js'

export type { InvoicePdfClient, InvoicePdfData, InvoicePdfLineItem }
export type { TemplateBase, TemplateConfig }

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

export interface RenderOptions {
  template?: TemplateBase
  config?: TemplateConfig
}

export const renderInvoicePdfBuffer = (
  invoice: InvoicePdfInput,
  items: InvoicePdfLineItem[],
  options: RenderOptions = {},
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

  const Component = getTemplate(options.template ?? 'classic')
  return renderToBuffer(Component({ data, config: options.config }))
}
