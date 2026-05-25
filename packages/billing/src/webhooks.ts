export interface StripeWebhookBusEvent {
  id: string;
  type: string;
  data: {
    object: unknown;
  };
}

export interface StripeWebhookVerifierLike {
  webhooks: {
    constructEvent(
      rawBody: Buffer,
      signature: string,
      secret: string,
    ): StripeWebhookBusEvent;
  };
}

export interface StripeWebhookLogger {
  debug?(metadata: Record<string, unknown>, message: string): void;
  info?(metadata: Record<string, unknown>, message: string): void;
}

export interface StripeWebhookBusContext {
  logger?: StripeWebhookLogger;
}

export type StripeWebhookHandler = (
  event: StripeWebhookBusEvent,
  context: StripeWebhookBusContext,
) => void | Promise<void>;

export interface StripeWebhookPrefixHandler {
  prefix: string;
  handle: StripeWebhookHandler;
}

export interface StripeWebhookBusOptions {
  handlers?: Record<string, StripeWebhookHandler>;
  prefixHandlers?: StripeWebhookPrefixHandler[];
  defaultHandler?: StripeWebhookHandler;
  hasProcessedEvent?: (eventId: string) => boolean | Promise<boolean>;
  markEventProcessed?: (event: StripeWebhookBusEvent) => void | Promise<void>;
}

export interface StripeWebhookBusDispatchResult {
  ok: true;
  handled: boolean;
  skipped: boolean;
  eventId: string;
  eventType: string;
}

export interface ResolveStripeWebhookEventInput {
  rawBody?: Buffer;
  signature?: string | string[];
  secret?: string;
  parsedBody?: unknown;
  stripeClient?: StripeWebhookVerifierLike;
  allowUnsigned?: boolean;
}

export type StripeIdLike = string | { id?: string } | null | undefined;

export interface StripeCheckoutSessionLike {
  id: string;
  mode?: string | null;
  customer?: StripeIdLike;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
  subscription?: StripeIdLike;
  metadata?: Record<string, string | undefined> | null;
}

export interface StripePriceLike {
  id?: string;
  unit_amount?: number | null;
  currency?: string | null;
  recurring?: {
    interval?: 'day' | 'week' | 'month' | 'year' | string | null;
    interval_count?: number | null;
  } | null;
}

export interface StripeSubscriptionItemLike {
  quantity?: number | null;
  price?: StripePriceLike | null;
}

export interface StripeSubscriptionLike {
  id: string;
  status: string;
  customer?: StripeIdLike;
  current_period_end?: number | null;
  metadata?: Record<string, string | undefined> | null;
  cancel_at_period_end?: boolean | null;
  items?: {
    data?: StripeSubscriptionItemLike[];
  };
}

export interface StripeInvoiceLike {
  subscription?: StripeIdLike;
}

export interface StripeSubscriptionMrr {
  monthlyMrrCents: number;
  currency: string;
}

export function createStripeWebhookBus(options: StripeWebhookBusOptions = {}) {
  const handlers = options.handlers ?? {};
  const prefixHandlers = options.prefixHandlers ?? [];

  return {
    async dispatch(
      event: StripeWebhookBusEvent,
      context: StripeWebhookBusContext = {},
    ): Promise<StripeWebhookBusDispatchResult> {
      if (options.hasProcessedEvent && (await options.hasProcessedEvent(event.id))) {
        context.logger?.info?.(
          { eventId: event.id, eventType: event.type },
          'Stripe event already processed',
        );
        return {
          ok: true,
          handled: true,
          skipped: true,
          eventId: event.id,
          eventType: event.type,
        };
      }

      const exactHandler = handlers[event.type];
      if (exactHandler) {
        await exactHandler(event, context);
        await options.markEventProcessed?.(event);

        return {
          ok: true,
          handled: true,
          skipped: false,
          eventId: event.id,
          eventType: event.type,
        };
      }

      const prefixHandler = prefixHandlers.find((handler) =>
        event.type.startsWith(handler.prefix),
      );
      if (prefixHandler) {
        await prefixHandler.handle(event, context);
        await options.markEventProcessed?.(event);

        return {
          ok: true,
          handled: true,
          skipped: false,
          eventId: event.id,
          eventType: event.type,
        };
      }

      await options.defaultHandler?.(event, context);
      await options.markEventProcessed?.(event);

      return {
        ok: true,
        handled: false,
        skipped: false,
        eventId: event.id,
        eventType: event.type,
      };
    },
  };
}

export function resolveStripeWebhookEvent(
  input: ResolveStripeWebhookEventInput,
): StripeWebhookBusEvent {
  const signature = normalizeStripeWebhookHeader(input.signature);

  if (input.secret) {
    if (!input.rawBody || !signature || !input.stripeClient) {
      throw new Error('Stripe webhook signature verification requires raw body, signature, and client');
    }

    return input.stripeClient.webhooks.constructEvent(
      input.rawBody,
      signature,
      input.secret,
    );
  }

  if (input.allowUnsigned === false) {
    throw new Error('Unsigned Stripe webhook payloads are disabled');
  }

  return assertStripeWebhookBusEvent(input.parsedBody);
}

export function assertStripeWebhookBusEvent(value: unknown): StripeWebhookBusEvent {
  if (!value || typeof value !== 'object') {
    throw new Error('Stripe webhook payload must be an object');
  }

  const event = value as Partial<StripeWebhookBusEvent>;
  if (
    typeof event.id !== 'string' ||
    typeof event.type !== 'string' ||
    !event.data ||
    typeof event.data !== 'object'
  ) {
    throw new Error('Stripe webhook payload is missing id, type, or data');
  }

  return event as StripeWebhookBusEvent;
}

export function readStripeObjectId(value: StripeIdLike): string | null {
  if (typeof value === 'string') {
    return value;
  }

  return value?.id ?? null;
}

export function deriveStripeSubscriptionMrr(
  subscription: StripeSubscriptionLike,
): StripeSubscriptionMrr {
  const items = subscription.items?.data ?? [];
  let currency = 'usd';
  let total = 0;

  for (const item of items) {
    const price = item.price;
    const amount = price?.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    const itemCurrency = price?.currency?.toLowerCase();
    if (itemCurrency) {
      currency = itemCurrency;
    }

    total += normalizeRecurringAmountToMonthlyCents(amount * quantity, price?.recurring);
  }

  return {
    monthlyMrrCents: Math.round(total),
    currency,
  };
}

export function normalizeRecurringAmountToMonthlyCents(
  amount: number,
  recurring: StripePriceLike['recurring'],
): number {
  const interval = recurring?.interval ?? 'month';
  const intervalCount = Math.max(1, recurring?.interval_count ?? 1);

  if (interval === 'year') {
    return amount / (12 * intervalCount);
  }
  if (interval === 'week') {
    return (amount * 52) / (12 * intervalCount);
  }
  if (interval === 'day') {
    return (amount * 365) / (12 * intervalCount);
  }

  return amount / intervalCount;
}

function normalizeStripeWebhookHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
