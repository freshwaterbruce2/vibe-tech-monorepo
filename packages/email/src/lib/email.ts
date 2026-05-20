import { renderToHtml, renderToText } from '@vibetech/emails';
import {
  InvoiceCreated,
  OverdueReminder,
  PaymentReceipt,
  type InvoiceCreatedProps,
  type OverdueReminderProps,
  type PaymentReceiptProps,
} from '@vibetech/emails';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { Resend } from 'resend';

export type {
  InvoiceCreatedProps,
  OverdueReminderProps,
  PaymentReceiptProps,
  ReminderStep,
} from '@vibetech/emails';

export {
  InvoiceCreated,
  OverdueReminder,
  PaymentReceipt,
  renderToHtml,
  renderToText,
};

export type TransactionalTemplateKey =
  | 'invoice.reminder'
  | 'dunning.late_payment'
  | 'upgrade.prompt'
  | 'trial.ending'
  | 'welcome';

export interface TransactionalTemplateDefinition {
  key: TransactionalTemplateKey;
  subject: string;
  intent: 'invoice' | 'dunning' | 'upgrade' | 'onboarding';
}

export interface RenderedTransactionalEmail {
  subject: string;
  html: string;
  text: string;
}

export interface SendTransactionalEmailInput {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: ReactNode;
  replyTo?: string | string[];
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

export interface ResendSendResult {
  data?: {
    id: string;
  } | null;
  error?: {
    message: string;
  } | null;
}

export interface ResendClientLike {
  emails: {
    send(input: SendTransactionalEmailInput): Promise<ResendSendResult>;
  };
}

export const TRANSACTIONAL_TEMPLATES: Record<
  TransactionalTemplateKey,
  TransactionalTemplateDefinition
> = {
  'invoice.reminder': {
    key: 'invoice.reminder',
    subject: 'Invoice reminder',
    intent: 'invoice',
  },
  'dunning.late_payment': {
    key: 'dunning.late_payment',
    subject: 'Payment reminder',
    intent: 'dunning',
  },
  'upgrade.prompt': {
    key: 'upgrade.prompt',
    subject: 'Upgrade your workspace',
    intent: 'upgrade',
  },
  'trial.ending': {
    key: 'trial.ending',
    subject: 'Your trial is ending soon',
    intent: 'upgrade',
  },
  welcome: {
    key: 'welcome',
    subject: 'Welcome to VibeTech',
    intent: 'onboarding',
  },
};

let cachedResendClient: Resend | undefined;

export function getResendClient(apiKey = process.env['RESEND_API_KEY']): ResendClientLike {
  if (cachedResendClient) {
    return cachedResendClient as unknown as ResendClientLike;
  }
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set');
  }

  cachedResendClient = new Resend(apiKey);
  return cachedResendClient as unknown as ResendClientLike;
}

export function resetResendClientForTests(): void {
  cachedResendClient = undefined;
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
  resendClient: ResendClientLike = getResendClient(),
): Promise<{ id: string }> {
  const result = await resendClient.emails.send(input);
  if (result.error) {
    throw new Error(`Resend send failed: ${result.error.message}`);
  }
  if (!result.data?.id) {
    throw new Error('Resend send returned no email id');
  }
  return { id: result.data.id };
}

export async function buildInvoiceReminderEmail(
  props: InvoiceCreatedProps,
): Promise<RenderedTransactionalEmail> {
  const template = createElement(InvoiceCreated, props);
  return renderEmailTemplate(TRANSACTIONAL_TEMPLATES['invoice.reminder'].subject, template);
}

export async function buildDunningEmail(
  props: OverdueReminderProps,
): Promise<RenderedTransactionalEmail> {
  const template = createElement(OverdueReminder, props);
  return renderEmailTemplate(TRANSACTIONAL_TEMPLATES['dunning.late_payment'].subject, template);
}

export async function buildPaymentReceiptEmail(
  props: PaymentReceiptProps,
): Promise<RenderedTransactionalEmail> {
  const template = createElement(PaymentReceipt, props);
  return renderEmailTemplate('Payment received', template);
}

export async function buildUpgradePromptEmail(input: {
  productName: string;
  currentPlan: string;
  recommendedPlan: string;
  upgradeUrl: string;
}): Promise<RenderedTransactionalEmail> {
  const template = simpleEmail({
    heading: `${input.productName} works better on ${input.recommendedPlan}`,
    body: `Your ${input.currentPlan} plan is reaching its limits. Upgrade when it makes sense for your workflow.`,
    ctaLabel: `View ${input.recommendedPlan}`,
    ctaUrl: input.upgradeUrl,
  });
  return renderEmailTemplate(TRANSACTIONAL_TEMPLATES['upgrade.prompt'].subject, template);
}

export async function buildTrialEndingEmail(input: {
  productName: string;
  trialEndsAt: string;
  upgradeUrl: string;
}): Promise<RenderedTransactionalEmail> {
  const template = simpleEmail({
    heading: `${input.productName} trial ending soon`,
    body: `Your trial ends on ${input.trialEndsAt}. Upgrade before then to keep paid features active.`,
    ctaLabel: 'Choose a plan',
    ctaUrl: input.upgradeUrl,
  });
  return renderEmailTemplate(TRANSACTIONAL_TEMPLATES['trial.ending'].subject, template);
}

export async function buildWelcomeEmail(input: {
  productName: string;
  dashboardUrl: string;
}): Promise<RenderedTransactionalEmail> {
  const template = simpleEmail({
    heading: `Welcome to ${input.productName}`,
    body: 'Your workspace is ready. Open your dashboard when you are ready to start.',
    ctaLabel: 'Open dashboard',
    ctaUrl: input.dashboardUrl,
  });
  return renderEmailTemplate(TRANSACTIONAL_TEMPLATES.welcome.subject, template);
}

const renderEmailTemplate = async (
  subject: string,
  template: ReactElement,
): Promise<RenderedTransactionalEmail> => ({
  subject,
  html: await renderToHtml(template),
  text: await renderToText(template),
});

const simpleEmail = (input: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): ReactElement =>
  createElement(
    'html',
    null,
    createElement(
      'body',
      {
        style: {
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5',
          padding: '24px',
        },
      },
      createElement(
        'main',
        {
          style: {
            backgroundColor: '#ffffff',
            maxWidth: '600px',
            padding: '32px',
          },
        },
        createElement('h1', { style: { fontSize: '24px', color: '#111827' } }, input.heading),
        createElement('p', { style: { color: '#374151', fontSize: '16px' } }, input.body),
        createElement(
          'a',
          {
            href: input.ctaUrl,
            style: {
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'inline-block',
              marginTop: '16px',
              padding: '12px 24px',
              textDecoration: 'none',
            },
          },
          input.ctaLabel,
        ),
      ),
    ),
  );
