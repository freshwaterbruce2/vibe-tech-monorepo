import Classic from './templates/Classic.js'

export interface InvoicePdfLineItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  taxAmount?: number
}

export interface InvoicePdfClient {
  name: string
  email?: string
  address?: string
  phone?: string
  company?: string
}

export interface InvoicePdfData {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  client: InvoicePdfClient
  lineItems: InvoicePdfLineItem[]
  subtotal: number
  tax: number
  total: number
  currency: string
  taxStrategy?: 'invoice' | 'item'
  userCurrencyAtIssue?: string | null
  exchangeRateToUserCurrency?: number | null
  notes?: string | null
  terms?: string | null
  companyName?: string
}

const InvoicePdfDocument = (props: { data: InvoicePdfData }) =>
  Classic({ data: props.data })

export default InvoicePdfDocument
