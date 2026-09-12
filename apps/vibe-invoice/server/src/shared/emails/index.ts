import { render } from '@react-email/render';
import type { ReactElement } from 'react';

import InvoiceCreated from './templates/InvoiceCreated.js';
import OverdueReminder from './templates/OverdueReminder.js';
import PaymentReceipt from './templates/PaymentReceipt.js';

export type { InvoiceCreatedProps } from './templates/InvoiceCreated.js';
export type {
  OverdueReminderProps,
  ReminderStep,
} from './templates/OverdueReminder.js';
export type { PaymentReceiptProps } from './templates/PaymentReceipt.js';

export { InvoiceCreated, OverdueReminder, PaymentReceipt };

export const renderToHtml = async (template: ReactElement): Promise<string> => {
  return render(template);
};

export const renderToText = async (template: ReactElement): Promise<string> => {
  return render(template, { plainText: true });
};
