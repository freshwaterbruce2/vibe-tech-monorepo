import { describe, expect, it, vi } from 'vitest';

import {
  TRANSACTIONAL_TEMPLATES,
  buildDunningEmail,
  buildUpgradePromptEmail,
  sendTransactionalEmail,
} from './email';

describe('@vibetech/email', () => {
  it('registers the standard transactional templates', () => {
    expect(Object.keys(TRANSACTIONAL_TEMPLATES).sort()).toEqual([
      'dunning.late_payment',
      'invoice.reminder',
      'trial.ending',
      'upgrade.prompt',
      'welcome',
    ]);
  });

  it('renders dunning emails through the shared React Email templates', async () => {
    const rendered = await buildDunningEmail({
      invoiceNumber: 'INV-100',
      total: 250,
      currency: 'USD',
      dueDate: '2026-05-01',
      daysOverdue: 10,
      payUrl: 'https://example.test/pay',
      reminderStep: 1,
      clientName: 'Acme',
    });

    expect(rendered.html).toContain('INV-100');
    expect(rendered.text).toContain('Acme');
  });

  it('renders upgrade prompts and sends through a Resend-compatible client', async () => {
    const rendered = await buildUpgradePromptEmail({
      productName: 'InvoiceFlow',
      currentPlan: 'Free',
      recommendedPlan: 'Pro',
      upgradeUrl: 'https://example.test/upgrade',
    });
    const send = vi.fn(async () => ({
      data: {
        id: 'email_123',
      },
    }));

    await expect(
      sendTransactionalEmail(
        {
          from: 'VibeTech <billing@example.test>',
          to: 'founder@example.test',
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        },
        {
          emails: {
            send,
          },
        },
      ),
    ).resolves.toEqual({ id: 'email_123' });
  });
});
