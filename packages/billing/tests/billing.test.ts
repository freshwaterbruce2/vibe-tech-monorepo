import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_REMINDERS,
  buildCheckoutSession,
  getDunningPolicy,
  runDunningSweep,
  upsertDunningPolicy,
  validateDunningReminders,
  verifyWebhookSignature,
  type DunningAuditRecord,
  type EnqueueJobRecord,
  type StripeClientLike,
} from '../src/index.js';
import { activateLicense, normalizeLicenseKey } from '../src/client.js';

interface InvoiceRecord {
  id: string;
  userId: string;
  dueDate: string;
  status: string;
}

interface PolicyRecord {
  userId: string;
  enabled: boolean;
  reminders: { daysAfterDue: number }[];
}

class FakeDb {
  policies = new Map<string, PolicyRecord>();
  invoices = new Map<string, InvoiceRecord>();
  history: Array<{ invoiceId: string; reminderStep: number; sentAt: string }> = [];

  prepare(sql: string) {
    return {
      get: (arg?: string) => this.handleGet(sql, arg),
      all: (arg?: string) => this.handleAll(sql, arg),
      run: (...args: unknown[]) => this.handleRun(sql, args),
    };
  }

  private handleGet(sql: string, arg?: string) {
    if (sql.includes('FROM dunning_policies')) {
      const policy = arg ? this.policies.get(arg) : undefined;
      if (!policy) {
        return undefined;
      }

      return {
        user_id: policy.userId,
        enabled: policy.enabled ? 1 : 0,
        reminders_json: JSON.stringify(policy.reminders),
      };
    }

    return undefined;
  }

  private handleAll(sql: string, arg?: string) {
    if (sql.includes('FROM invoices')) {
      return [...this.invoices.values()]
        .filter((invoice) => invoice.status === 'sent' && invoice.dueDate < String(arg))
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
        .map((invoice) => ({
          id: invoice.id,
          user_id: invoice.userId,
          due_date: invoice.dueDate,
        }));
    }

    if (sql.includes('FROM dunning_history')) {
      return this.history
        .filter((row) => row.invoiceId === arg)
        .map((row) => ({ reminder_step: row.reminderStep }));
    }

    return [];
  }

  private handleRun(sql: string, args: unknown[]) {
    if (sql.includes('INSERT INTO dunning_policies')) {
      const [userId, enabled, remindersJson] = args as [string, number, string];
      this.policies.set(userId, {
        userId,
        enabled: enabled === 1,
        reminders: JSON.parse(remindersJson) as { daysAfterDue: number }[],
      });
      return { changes: 1 };
    }

    if (sql.includes('INSERT OR IGNORE INTO dunning_history')) {
      const [, invoiceId, reminderStep, sentAt] = args as [string, string, number, string];
      const exists = this.history.some(
        (row) => row.invoiceId === invoiceId && row.reminderStep === reminderStep,
      );
      if (exists) {
        return { changes: 0 };
      }

      this.history.push({ invoiceId, reminderStep, sentAt });
      return { changes: 1 };
    }

    return { changes: 0 };
  }
}

describe('@vibetech/billing stripe helpers', () => {
  it('builds a checkout session from generic line items', async () => {
    const create = vi.fn(async (input: Parameters<StripeClientLike['checkout']['sessions']['create']>[0]) => ({
      input,
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session',
    }));
    const stripeClient: StripeClientLike = {
      checkout: {
        sessions: {
          create,
        },
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    };

    const session = await buildCheckoutSession(
      {
        currency: 'USD',
        successUrl: 'https://example.test/success',
        cancelUrl: 'https://example.test/cancel',
        customerEmail: 'billing@example.com',
        metadata: {
          invoice_id: 'inv_123',
        },
        lineItems: [
          {
            name: 'Invoice INV-123',
            unitAmount: 42.5,
          },
        ],
      },
      stripeClient,
    );

    expect(session).toEqual({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/session',
    });
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls.at(0)?.[0]).not.toHaveProperty('payment_method_types');
  });

  it('delegates webhook verification to Stripe', () => {
    const event = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {},
      },
    };
    const constructEvent = vi.fn(() => event);
    const stripeClient: StripeClientLike = {
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
      webhooks: {
        constructEvent,
      },
    };

    expect(
      verifyWebhookSignature(Buffer.from('{}'), 'sig', 'secret', stripeClient),
    ).toBe(event);
    expect(constructEvent).toHaveBeenCalledOnce();
  });
});

describe('@vibetech/billing client activation helpers', () => {
  it('normalizes license keys and supports local demo activation without a server URL', async () => {
    expect(normalizeLicenseKey(' demo-1234 ')).toBe('DEMO-1234');

    await expect(
      activateLicense({
        appId: 'factory-tauri-smoke',
        licenseKey: ' demo-1234 ',
        deviceName: 'Desktop',
      }),
    ).resolves.toMatchObject({
      ok: true,
      appId: 'factory-tauri-smoke',
      licenseKey: 'DEMO-1234',
      status: 'active',
      entitlement: 'desktop-license',
      deviceName: 'Desktop',
    });
  });

  it('posts to the activation endpoint when a server URL is configured', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ok: true,
        appId: 'proposal-review-saas',
        licenseKey: 'prod-999',
        status: 'active',
        entitlement: 'desktop-license',
        activatedAt: '2026-05-15T14:00:00.000Z',
      }),
    })) as unknown as typeof fetch;

    await expect(
      activateLicense(
        {
          appId: 'proposal-review-saas',
          licenseKey: 'prod-999',
          activationUrl: 'https://billing.test/activate',
          deviceName: 'Laptop',
        },
        fetchImpl,
      ),
    ).resolves.toMatchObject({
      licenseKey: 'PROD-999',
      appId: 'proposal-review-saas',
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://billing.test/activate', expect.objectContaining({
      method: 'POST',
    }));
  });
});

describe('@vibetech/billing dunning helpers', () => {
  it('returns the default policy when the user has no custom row', () => {
    const db = new FakeDb();

    expect(getDunningPolicy(db as never, 'user-1')).toEqual({
      userId: 'user-1',
      enabled: true,
      reminders: DEFAULT_REMINDERS,
    });
  });

  it('validates reminder ordering and limits', () => {
    expect(() => validateDunningReminders([])).toThrow(/between 1 and 5/);
    expect(() =>
      validateDunningReminders([{ daysAfterDue: 14 }, { daysAfterDue: 7 }]),
    ).toThrow(/ascending/);
  });

  it('round-trips a custom policy', () => {
    const db = new FakeDb();
    const policy = upsertDunningPolicy(db as never, 'user-1', {
      enabled: false,
      reminders: [{ daysAfterDue: 3 }, { daysAfterDue: 10 }],
    });

    expect(policy).toEqual({
      userId: 'user-1',
      enabled: false,
      reminders: [{ daysAfterDue: 3 }, { daysAfterDue: 10 }],
    });
  });

  it('enqueues one overdue reminder and records audit state', () => {
    const db = new FakeDb();
    db.invoices.set('inv-1', {
      id: 'inv-1',
      userId: 'user-1',
      dueDate: '2026-05-07',
      status: 'sent',
    });

    const jobs: EnqueueJobRecord[] = [];
    const audits: DunningAuditRecord[] = [];

    const result = runDunningSweep(
      db as never,
      {
        enqueueJob: (_db, job) => {
          jobs.push(job);
        },
        recordAudit: (_db, entry) => {
          audits.push(entry);
        },
      },
      new Date('2026-05-15T10:00:00Z'),
    );

    expect(result).toEqual({
      invoicesScanned: 1,
      remindersEnqueued: 1,
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toEqual({
      type: 'email.overdue',
      payload: {
        invoiceId: 'inv-1',
        reminderStep: 1,
        daysOverdue: 8,
      },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]?.action).toBe('dunning.reminder_enqueued');
  });
});
