import type Database from 'better-sqlite3'

import getResend from '../clients/resend.js'
import { renderInvoicePdfBuffer, type InvoicePdfInput } from '../pdf/render.js'
import type { InvoicePdfLineItem, InvoicePdfClient } from '../pdf/InvoicePdfDocument.js'
import {
  InvoiceCreated,
  OverdueReminder,
  PaymentReceipt,
  renderToHtml,
  renderToText,
  type InvoiceCreatedProps,
  type OverdueReminderProps,
  type PaymentReceiptProps,
  type ReminderStep,
} from './render.js'

interface InvoiceRow {
  id: string
  invoice_number: string
  total: number
  currency: string
  due_date: string
  issue_date: string
  subtotal: number
  tax: number
  notes: string | null
  terms: string | null
  status: string
  public_token: string | null
  user_id: string
  tax_strategy: string | null
  exchange_rate_to_user_currency: number | null
  user_currency_at_issue: string | null
}

interface ClientRow {
  name: string
  email: string
  company: string | null
  phone: string | null
  address: string | null
}

interface UserRow {
  full_name: string | null
  company_name: string | null
  email: string
}

interface ItemRow {
  id: string
  description: string
  quantity: number
  price: number
  total: number
}

const getAppBaseUrl = (): string =>
  process.env.APP_BASE_URL ?? 'http://localhost:5173'

const getEmailFrom = (): string =>
  process.env.EMAIL_FROM ?? 'invoices@example.com'

interface InvoiceContext {
  invoice: InvoiceRow
  client: ClientRow
  user: UserRow
  items: ItemRow[]
}

const loadInvoiceContext = (
  db: Database.Database,
  invoiceId: string,
): InvoiceContext | null => {
  const invoice = db
    .prepare(
      `SELECT id, invoice_number, total, currency, due_date, issue_date,
              subtotal, tax, notes, terms, status, public_token, user_id,
              tax_strategy, exchange_rate_to_user_currency, user_currency_at_issue
         FROM invoices WHERE id = ?`,
    )
    .get(invoiceId) as InvoiceRow | undefined
  if (!invoice) return null

  const client = db
    .prepare(
      `SELECT c.name, c.email, c.company, c.phone, c.address
         FROM clients c
         JOIN invoices i ON i.client_id = c.id
        WHERE i.id = ?`,
    )
    .get(invoiceId) as ClientRow | undefined
  if (!client) return null

  const user = db
    .prepare('SELECT full_name, company_name, email FROM users WHERE id = ?')
    .get(invoice.user_id) as UserRow | undefined
  if (!user) return null

  const items = db
    .prepare(
      `SELECT id, description, quantity, price, total
         FROM invoice_items
        WHERE invoice_id = ?
        ORDER BY created_at ASC`,
    )
    .all(invoiceId) as ItemRow[]

  return { invoice, client, user, items }
}

const buildPdf = async (ctx: InvoiceContext): Promise<Buffer> => {
  const pdfClient: InvoicePdfClient = {
    name: ctx.client.name,
    email: ctx.client.email,
    company: ctx.client.company ?? undefined,
    address: ctx.client.address ?? undefined,
  }
  const lineItems: InvoicePdfLineItem[] = ctx.items.map((it) => {
    const subtotal = it.quantity * it.price
    const taxAmount = +(it.total - subtotal).toFixed(2)
    return {
      description: it.description,
      quantity: it.quantity,
      unitPrice: it.price,
      total: it.total,
      taxAmount: taxAmount > 0 ? taxAmount : 0,
    }
  })
  const input: InvoicePdfInput = {
    invoiceNumber: ctx.invoice.invoice_number,
    issueDate: ctx.invoice.issue_date,
    dueDate: ctx.invoice.due_date,
    client: pdfClient,
    subtotal: ctx.invoice.subtotal,
    tax: ctx.invoice.tax,
    total: ctx.invoice.total,
    currency: ctx.invoice.currency,
    taxStrategy: ctx.invoice.tax_strategy === 'item' ? 'item' : 'invoice',
    userCurrencyAtIssue: ctx.invoice.user_currency_at_issue,
    exchangeRateToUserCurrency: ctx.invoice.exchange_rate_to_user_currency,
    notes: ctx.invoice.notes,
    terms: ctx.invoice.terms,
    companyName: ctx.user.company_name ?? ctx.user.full_name ?? undefined,
  }
  return renderInvoicePdfBuffer(input, lineItems)
}

const buildPayUrl = (invoiceId: string, publicToken: string | null): string =>
  publicToken
    ? `${getAppBaseUrl()}/pay/${invoiceId}?token=${publicToken}`
    : `${getAppBaseUrl()}/invoices/${invoiceId}`

interface SendResult {
  emailLogId: string
  resendMessageId: string | null
  status: 'sent' | 'failed'
  error?: string
}

interface SendArgs {
  toEmail: string
  subject: string
  html: string
  text: string
  pdfBuffer?: Buffer
  pdfFilename?: string
}

const writeEmailLog = (
  db: Database.Database,
  args: {
    invoiceId: string | null
    toEmail: string
    template: string
    status: string
    resendMessageId?: string | null
    error?: string | null
  },
): string => {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO email_log
       (id, invoice_id, to_email, template, resend_message_id, status, error, sent_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    args.invoiceId,
    args.toEmail,
    args.template,
    args.resendMessageId ?? null,
    args.status,
    args.error ?? null,
    args.status === 'sent' ? now : null,
    now,
  )
  return id
}

const dispatchEmail = async (
  db: Database.Database,
  template: string,
  invoiceId: string | null,
  args: SendArgs,
): Promise<SendResult> => {
  const resend = getResend()
  const attachments = args.pdfBuffer && args.pdfFilename
    ? [{ filename: args.pdfFilename, content: args.pdfBuffer }]
    : undefined
  try {
    const result = await resend.emails.send({
      from: getEmailFrom(),
      to: args.toEmail,
      subject: args.subject,
      html: args.html,
      text: args.text,
      attachments,
    })
    if (result.error) {
      const emailLogId = writeEmailLog(db, {
        invoiceId,
        toEmail: args.toEmail,
        template,
        status: 'failed',
        error: result.error.message,
      })
      throw new Error(`Resend send failed: ${result.error.message} (log=${emailLogId})`)
    }
    const emailLogId = writeEmailLog(db, {
      invoiceId,
      toEmail: args.toEmail,
      template,
      status: 'sent',
      resendMessageId: result.data?.id ?? null,
    })
    return {
      emailLogId,
      resendMessageId: result.data?.id ?? null,
      status: 'sent',
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Resend send failed')) {
      throw e
    }
    const msg = e instanceof Error ? e.message : String(e)
    const emailLogId = writeEmailLog(db, {
      invoiceId,
      toEmail: args.toEmail,
      template,
      status: 'failed',
      error: msg,
    })
    throw new Error(`Resend send threw: ${msg} (log=${emailLogId})`)
  }
}

export const sendInvoiceCreated = async (
  db: Database.Database,
  invoiceId: string,
): Promise<SendResult> => {
  const ctx = loadInvoiceContext(db, invoiceId)
  if (!ctx) {
    throw new Error(`sendInvoiceCreated: invoice ${invoiceId} not found`)
  }
  const props: InvoiceCreatedProps = {
    invoiceNumber: ctx.invoice.invoice_number,
    clientName: ctx.client.name,
    total: ctx.invoice.total,
    currency: ctx.invoice.currency,
    dueDate: ctx.invoice.due_date,
    payUrl: buildPayUrl(ctx.invoice.id, ctx.invoice.public_token),
    companyName: ctx.user.company_name ?? ctx.user.full_name ?? undefined,
  }
  const template = InvoiceCreated(props)
  const html = await renderToHtml(template)
  const text = await renderToText(template)
  const pdfBuffer = await buildPdf(ctx)

  return dispatchEmail(db, 'invoice_created', invoiceId, {
    toEmail: ctx.client.email,
    subject: `Invoice ${ctx.invoice.invoice_number} from ${
      ctx.user.company_name ?? ctx.user.full_name ?? ctx.user.email
    }`,
    html,
    text,
    pdfBuffer,
    pdfFilename: `invoice-${ctx.invoice.invoice_number}.pdf`,
  })
}

export const sendPaymentReceipt = async (
  db: Database.Database,
  invoiceId: string,
  paidAt: string,
): Promise<SendResult> => {
  const ctx = loadInvoiceContext(db, invoiceId)
  if (!ctx) {
    throw new Error(`sendPaymentReceipt: invoice ${invoiceId} not found`)
  }
  const props: PaymentReceiptProps = {
    invoiceNumber: ctx.invoice.invoice_number,
    amount: ctx.invoice.total,
    currency: ctx.invoice.currency,
    paidAt,
    viewUrl: buildPayUrl(ctx.invoice.id, ctx.invoice.public_token),
    companyName: ctx.user.company_name ?? ctx.user.full_name ?? undefined,
  }
  const template = PaymentReceipt(props)
  const html = await renderToHtml(template)
  const text = await renderToText(template)

  return dispatchEmail(db, 'payment_receipt', invoiceId, {
    toEmail: ctx.client.email,
    subject: `Receipt for invoice ${ctx.invoice.invoice_number}`,
    html,
    text,
  })
}

export const sendOverdueReminder = async (
  db: Database.Database,
  invoiceId: string,
  reminderStep: ReminderStep,
  daysOverdue: number,
): Promise<SendResult> => {
  const ctx = loadInvoiceContext(db, invoiceId)
  if (!ctx) {
    throw new Error(`sendOverdueReminder: invoice ${invoiceId} not found`)
  }
  const props: OverdueReminderProps = {
    invoiceNumber: ctx.invoice.invoice_number,
    total: ctx.invoice.total,
    currency: ctx.invoice.currency,
    dueDate: ctx.invoice.due_date,
    daysOverdue,
    payUrl: buildPayUrl(ctx.invoice.id, ctx.invoice.public_token),
    reminderStep,
    companyName: ctx.user.company_name ?? ctx.user.full_name ?? undefined,
  }
  const template = OverdueReminder(props)
  const html = await renderToHtml(template)
  const text = await renderToText(template)

  const stepLabel: Record<ReminderStep, string> = {
    1: 'Friendly reminder',
    2: 'Second notice',
    3: 'Final notice',
  }

  return dispatchEmail(db, `overdue_${reminderStep}`, invoiceId, {
    toEmail: ctx.client.email,
    subject: `${stepLabel[reminderStep]}: invoice ${ctx.invoice.invoice_number}`,
    html,
    text,
  })
}
