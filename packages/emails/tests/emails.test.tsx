import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import {
  AbandonedScorecardDay1,
  AbandonedScorecardDay3,
  AbandonedScorecardDay7,
  InvoiceCreated,
  OverdueReminder,
  PaymentReceipt,
  renderToHtml,
  renderToText,
} from '../src/index.js';

describe('@vibetech/emails', () => {
  const payUrl = 'https://example.com/pay/inv-12345';
  const invoiceNumber = 'INV-12345';
  const scorecardUrl = 'https://example.com/scorecards/free-123';
  const proRewriteUrl = 'https://example.com/pro-rewrite/start';

  it('renders InvoiceCreated HTML with invoice number and pay URL', async () => {
    const html = await renderToHtml(
      createElement(InvoiceCreated, {
        invoiceNumber,
        clientName: 'Acme Corp',
        total: 1234.56,
        currency: 'USD',
        dueDate: '2026-06-01',
        payUrl,
        companyName: 'Vibetech Studio',
      }),
    );

    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain(invoiceNumber);
    expect(html).toContain(payUrl);
    expect(html).toContain('Acme Corp');
  });

  it('renders InvoiceCreated plain text with invoice number and pay URL', async () => {
    const text = await renderToText(
      createElement(InvoiceCreated, {
        invoiceNumber,
        clientName: 'Acme Corp',
        total: 1234.56,
        currency: 'USD',
        dueDate: '2026-06-01',
        payUrl,
      }),
    );

    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain(invoiceNumber);
    expect(text).toContain(payUrl);
  });

  it('renders PaymentReceipt HTML with invoice number and view URL', async () => {
    const viewUrl = 'https://example.com/i/inv-12345';
    const html = await renderToHtml(
      createElement(PaymentReceipt, {
        invoiceNumber,
        amount: 1234.56,
        currency: 'USD',
        paidAt: '2026-05-30',
        viewUrl,
        companyName: 'Vibetech Studio',
        clientName: 'Acme Corp',
      }),
    );

    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain(invoiceNumber);
    expect(html).toContain(viewUrl);
  });

  it.each([1, 2, 3] as const)(
    'renders OverdueReminder step %s HTML with invoice number and pay URL',
    async (step) => {
      const html = await renderToHtml(
        createElement(OverdueReminder, {
          invoiceNumber,
          total: 1234.56,
          currency: 'USD',
          dueDate: '2026-04-01',
          daysOverdue: 14,
          payUrl,
          reminderStep: step,
          clientName: 'Acme Corp',
        }),
      );

      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(invoiceNumber);
      expect(html).toContain(payUrl);
    },
  );

  it.each([
    {
      Template: AbandonedScorecardDay1,
      dayCopy: 'Abandoned scorecard day 1',
      ctaCopy: 'Start my Pro Rewrite',
    },
    {
      Template: AbandonedScorecardDay3,
      dayCopy: 'Abandoned scorecard day 3',
      ctaCopy: 'Turn my scorecard into a rewrite',
    },
    {
      Template: AbandonedScorecardDay7,
      dayCopy: 'Abandoned scorecard day 7',
      ctaCopy: 'Get the Pro Rewrite',
    },
  ] as const)(
    'renders $dayCopy HTML with scorecard and Pro Rewrite copy',
    async ({ Template, dayCopy, ctaCopy }) => {
      const html = await renderToHtml(
        createElement(Template, {
          recipientName: 'Jordan',
          score: 72,
          scorecardUrl,
          proRewriteUrl,
          companyName: 'VibeTech',
        }),
      );

      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain(dayCopy);
      expect(html).toContain(ctaCopy);
      expect(html).toContain(scorecardUrl);
      expect(html).toContain(proRewriteUrl);
      expect(html).toContain('scorecard');
      expect(html).toContain('Pro Rewrite');
      expect(html).toContain('72/100');
    },
  );
});
