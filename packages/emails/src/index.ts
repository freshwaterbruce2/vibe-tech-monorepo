import { render } from '@react-email/render';
import type { ReactElement } from 'react';

import AbandonedScorecardDay1 from './templates/AbandonedScorecardDay1.js';
import AbandonedScorecardDay3 from './templates/AbandonedScorecardDay3.js';
import AbandonedScorecardDay7 from './templates/AbandonedScorecardDay7.js';
import InvoiceCreated from './templates/InvoiceCreated.js';
import OverdueReminder from './templates/OverdueReminder.js';
import PaymentReceipt from './templates/PaymentReceipt.js';

export type { AbandonedScorecardDay1Props } from './templates/AbandonedScorecardDay1.js';
export type { AbandonedScorecardDay3Props } from './templates/AbandonedScorecardDay3.js';
export type { AbandonedScorecardDay7Props } from './templates/AbandonedScorecardDay7.js';
export type { AbandonedScorecardEmailProps } from './templates/AbandonedScorecardShared.js';
export type { InvoiceCreatedProps } from './templates/InvoiceCreated.js';
export type {
  OverdueReminderProps,
  ReminderStep,
} from './templates/OverdueReminder.js';
export type { PaymentReceiptProps } from './templates/PaymentReceipt.js';

export {
  AbandonedScorecardDay1,
  AbandonedScorecardDay3,
  AbandonedScorecardDay7,
  InvoiceCreated,
  OverdueReminder,
  PaymentReceipt,
};

export const renderToHtml = async (template: ReactElement): Promise<string> => {
  return render(template);
};

export const renderToText = async (template: ReactElement): Promise<string> => {
  return render(template, { plainText: true });
};
