/* eslint-disable max-lines-per-function */
import type Database from 'better-sqlite3';
import StripeConstructor from 'stripe';
export * from './webhooks.js';

export interface StripeWebhookEventLike {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
}

export interface StripeClientLike {
  checkout: {
    sessions: {
      create(input: {
        mode: 'payment';
        line_items: Array<{
          price_data: {
            currency: string;
            product_data: {
              name: string;
            };
            unit_amount: number;
          };
          quantity: number;
        }>;
        metadata?: Record<string, string>;
        success_url: string;
        cancel_url: string;
        customer?: string;
        customer_email?: string;
      }): Promise<{
        id: string;
        url: string | null;
      }>;
    };
  };
  webhooks: {
    constructEvent(
      rawBody: Buffer,
      signature: string,
      secret: string,
    ): StripeWebhookEventLike;
  };
}

const createStripeClient = (key: string) =>
  new StripeConstructor(key, {
    apiVersion: '2026-04-22.dahlia',
  });

let cachedStripeClient: ReturnType<typeof createStripeClient> | undefined;

export function getStripeClient(): StripeClientLike {
  if (cachedStripeClient) {
    return cachedStripeClient as unknown as StripeClientLike;
  }

  const key = process.env['STRIPE_SECRET_KEY'];
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  cachedStripeClient = createStripeClient(key);

  return cachedStripeClient as unknown as StripeClientLike;
}

export interface CheckoutLineItemInput {
  name: string;
  unitAmount: number;
  quantity?: number;
}

export interface BuildCheckoutSessionInput {
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  lineItems: readonly CheckoutLineItemInput[];
}

export interface CheckoutSessionResult {
  id: string;
  url: string;
}

export async function buildCheckoutSession(
  input: BuildCheckoutSessionInput,
  stripeClient: StripeClientLike = getStripeClient(),
): Promise<CheckoutSessionResult> {
  const session = await stripeClient.checkout.sessions.create({
    mode: 'payment',
    line_items: input.lineItems.map((lineItem) => ({
      price_data: {
        currency: input.currency.toLowerCase(),
        product_data: {
          name: lineItem.name,
        },
        unit_amount: Math.round(lineItem.unitAmount * 100),
      },
      quantity: lineItem.quantity ?? 1,
    })),
    metadata: input.metadata,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer: input.customerId,
    customer_email: input.customerEmail,
  });

  if (!session.url) {
    throw new Error('Stripe Checkout Session returned no URL');
  }

  return {
    id: session.id,
    url: session.url,
  };
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
  stripeClient: StripeClientLike = getStripeClient(),
): StripeWebhookEventLike {
  return stripeClient.webhooks.constructEvent(rawBody, signature, secret);
}

export interface DunningReminder {
  daysAfterDue: number;
}

export interface DunningPolicy {
  userId: string;
  enabled: boolean;
  reminders: DunningReminder[];
}

export const DEFAULT_REMINDERS: DunningReminder[] = [
  { daysAfterDue: 7 },
  { daysAfterDue: 14 },
  { daysAfterDue: 30 },
];

interface PolicyRow {
  user_id: string;
  enabled: number;
  reminders_json: string;
}

const rowToPolicy = (row: PolicyRow): DunningPolicy => ({
  userId: row.user_id,
  enabled: row.enabled === 1,
  reminders: JSON.parse(row.reminders_json) as DunningReminder[],
});

export function getDunningPolicy(
  db: Database.Database,
  userId: string,
): DunningPolicy {
  const row = db
    .prepare(
      'SELECT user_id, enabled, reminders_json FROM dunning_policies WHERE user_id = ?',
    )
    .get(userId) as PolicyRow | undefined;

  if (row) {
    return rowToPolicy(row);
  }

  return {
    userId,
    enabled: true,
    reminders: DEFAULT_REMINDERS,
  };
}

export function validateDunningReminders(reminders: unknown): DunningReminder[] {
  if (!Array.isArray(reminders)) {
    throw new Error('reminders must be an array');
  }
  if (reminders.length === 0 || reminders.length > 5) {
    throw new Error('reminders must have between 1 and 5 entries');
  }

  const result: DunningReminder[] = [];
  let previousDays = -1;
  for (const reminder of reminders) {
    if (
      !reminder ||
      typeof reminder !== 'object' ||
      typeof (reminder as { daysAfterDue?: unknown }).daysAfterDue !== 'number'
    ) {
      throw new Error('each reminder must have a numeric daysAfterDue');
    }

    const days = (reminder as { daysAfterDue: number }).daysAfterDue;
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new Error('daysAfterDue must be an integer between 1 and 365');
    }
    if (days <= previousDays) {
      throw new Error('reminders must be ordered by ascending daysAfterDue');
    }

    previousDays = days;
    result.push({ daysAfterDue: days });
  }

  return result;
}

export function upsertDunningPolicy(
  db: Database.Database,
  userId: string,
  input: { enabled: boolean; reminders: DunningReminder[] },
): DunningPolicy {
  const reminders = validateDunningReminders(input.reminders);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO dunning_policies
       (user_id, enabled, reminders_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       enabled = excluded.enabled,
       reminders_json = excluded.reminders_json,
       updated_at = excluded.updated_at`,
  ).run(
    userId,
    input.enabled ? 1 : 0,
    JSON.stringify(reminders),
    now,
    now,
  );

  return getDunningPolicy(db, userId);
}

interface OverdueInvoiceRow {
  id: string;
  user_id: string;
  due_date: string;
}

interface SentStepRow {
  reminder_step: number;
}

export interface EnqueueJobRecord {
  type: string;
  payload: unknown;
}

export interface DunningAuditRecord {
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  metadata: Record<string, unknown>;
}

export interface DunningSweepHooks {
  enqueueJob(db: Database.Database, job: EnqueueJobRecord): void;
  recordAudit(db: Database.Database, entry: DunningAuditRecord): void;
}

export interface DunningSweepResult {
  invoicesScanned: number;
  remindersEnqueued: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function runDunningSweep(
  db: Database.Database,
  hooks: DunningSweepHooks,
  now: Date = new Date(),
): DunningSweepResult {
  const nowIso = now.toISOString();
  const overdue = db
    .prepare(
      `SELECT id, user_id, due_date
         FROM invoices
        WHERE status = 'sent'
          AND due_date < ?
        ORDER BY due_date ASC`,
    )
    .all(nowIso.slice(0, 10)) as OverdueInvoiceRow[];

  let remindersEnqueued = 0;

  for (const invoice of overdue) {
    const policy = getDunningPolicy(db, invoice.user_id);
    if (!policy.enabled) {
      continue;
    }

    const dueMs = new Date(invoice.due_date).getTime();
    const daysOverdue = Math.floor((now.getTime() - dueMs) / MS_PER_DAY);
    if (daysOverdue < 1) {
      continue;
    }

    const sentSteps = db
      .prepare('SELECT reminder_step FROM dunning_history WHERE invoice_id = ?')
      .all(invoice.id) as SentStepRow[];
    const sentStepSet = new Set(sentSteps.map((step) => step.reminder_step));

    for (let i = 0; i < policy.reminders.length; i++) {
      const reminderStep = i + 1;
      const reminder = policy.reminders[i];
      if (!reminder) {
        continue;
      }
      if (sentStepSet.has(reminderStep)) {
        continue;
      }
      if (daysOverdue < reminder.daysAfterDue) {
        continue;
      }

      const inserted = db
        .prepare(
          `INSERT OR IGNORE INTO dunning_history
             (id, invoice_id, reminder_step, sent_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(crypto.randomUUID(), invoice.id, reminderStep, nowIso);
      if (inserted.changes === 0) {
        continue;
      }

      hooks.enqueueJob(db, {
        type: 'email.overdue',
        payload: {
          invoiceId: invoice.id,
          reminderStep,
          daysOverdue,
        },
      });
      hooks.recordAudit(db, {
        action: 'dunning.reminder_enqueued',
        entityType: 'invoice',
        entityId: invoice.id,
        actorUserId: null,
        metadata: {
          reminder_step: reminderStep,
          days_overdue: daysOverdue,
          policy_user_id: invoice.user_id,
        },
      });
      remindersEnqueued++;
      break;
    }
  }

  return {
    invoicesScanned: overdue.length,
    remindersEnqueued,
  };
}
