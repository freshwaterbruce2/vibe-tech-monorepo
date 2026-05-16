import { render } from '@react-email/render'
import type { ReactElement } from 'react'

import InvoiceCreated from './templates/InvoiceCreated.js'
import OverdueReminder from './templates/OverdueReminder.js'
import PaymentReceipt from './templates/PaymentReceipt.js'

export type { InvoiceCreatedProps } from './templates/InvoiceCreated.js'
export type {
  OverdueReminderProps,
  ReminderStep,
} from './templates/OverdueReminder.js'
export type { PaymentReceiptProps } from './templates/PaymentReceipt.js'

export { InvoiceCreated, OverdueReminder, PaymentReceipt }

/**
 * Render a React Email template to HTML.
 *
 * Note: @react-email/render returns a Promise<string> in current versions,
 * so callers must await this function.
 */
export const renderToHtml = (template: ReactElement): Promise<string> => {
  return render(template)
}

/**
 * Render a React Email template to plain text.
 *
 * Uses @react-email/render's plainText option, which strips HTML and
 * returns a text-only representation suitable for the text/plain MIME part.
 */
export const renderToText = (template: ReactElement): Promise<string> => {
  return render(template, { plainText: true })
}