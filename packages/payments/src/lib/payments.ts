import {
  buildCheckoutSession,
  getStripeClient,
  verifyWebhookSignature,
  type BuildCheckoutSessionInput,
  type CheckoutLineItemInput,
  type CheckoutSessionResult,
  type StripeClientLike,
  type StripeWebhookEventLike,
} from '@vibetech/billing';
import { currentTenantId, type PlanLevel, type TenantId } from '@vibetech/monetization';

export type {
  BuildCheckoutSessionInput,
  CheckoutLineItemInput,
  CheckoutSessionResult,
  StripeClientLike,
  StripeWebhookEventLike,
};

export { buildCheckoutSession, getStripeClient, verifyWebhookSignature };

export interface TenantCustomerRecord {
  tenantId: TenantId;
  stripeCustomerId: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantCheckoutSessionInput
  extends Omit<BuildCheckoutSessionInput, 'metadata' | 'customerId'> {
  tenantId?: TenantId;
  plan?: PlanLevel;
  stripeCustomerId?: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscriptionLike {
  id: string;
  status: string;
  customer?: string | { id: string } | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
}

export interface StripeSubscriptionClientLike extends StripeClientLike {
  subscriptions: {
    retrieve(subscriptionId: string): Promise<StripeSubscriptionLike>;
  };
}

export interface SubscriptionStatus {
  id: string;
  status: string;
  stripeCustomerId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

const tenantCustomers = new Map<TenantId, TenantCustomerRecord>();

const normalizeTenantId = (tenantId: TenantId | undefined): TenantId => {
  const normalized = tenantId?.trim();
  if (normalized === undefined || normalized.length === 0) {
    return currentTenantId();
  }

  return normalized;
};

export function linkStripeCustomer(
  tenantId: TenantId,
  stripeCustomerId: string,
  options: { email?: string; now?: Date } = {},
): TenantCustomerRecord {
  const normalizedTenantId = normalizeTenantId(tenantId);
  const now = (options.now ?? new Date()).toISOString();
  const existing = tenantCustomers.get(normalizedTenantId);
  const record: TenantCustomerRecord = {
    tenantId: normalizedTenantId,
    stripeCustomerId,
    email: options.email ?? existing?.email,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  tenantCustomers.set(normalizedTenantId, record);
  return record;
}

export function getStripeCustomer(tenantId: TenantId = currentTenantId()): TenantCustomerRecord | null {
  return tenantCustomers.get(normalizeTenantId(tenantId)) ?? null;
}

export function getStripeCustomerId(tenantId: TenantId = currentTenantId()): string | undefined {
  return getStripeCustomer(tenantId)?.stripeCustomerId;
}

export function clearStripeCustomerLinks(tenantId?: TenantId): void {
  if (tenantId) {
    tenantCustomers.delete(normalizeTenantId(tenantId));
    return;
  }
  tenantCustomers.clear();
}

export async function createTenantCheckoutSession(
  input: CreateTenantCheckoutSessionInput,
  stripeClient: StripeClientLike = getStripeClient(),
): Promise<CheckoutSessionResult> {
  const tenantId = normalizeTenantId(input.tenantId);
  const stripeCustomerId = input.stripeCustomerId ?? getStripeCustomerId(tenantId);

  return buildCheckoutSession(
    {
      ...input,
      customerId: stripeCustomerId,
      metadata: {
        ...(input.metadata ?? {}),
        tenant_id: tenantId,
        ...(input.plan ? { plan: input.plan } : {}),
      },
    },
    stripeClient,
  );
}

export async function lookupSubscriptionStatus(
  subscriptionId: string,
  stripeClient: StripeSubscriptionClientLike = getStripeClient() as StripeSubscriptionClientLike,
): Promise<SubscriptionStatus> {
  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
  const customer = subscription.customer;

  return {
    id: subscription.id,
    status: subscription.status,
    stripeCustomerId: typeof customer === 'string' ? customer : customer?.id,
    currentPeriodEnd:
      subscription.current_period_end == null
        ? undefined
        : new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}

export function verifyStripeWebhook(
  rawBody: Buffer,
  signature: string,
  secret: string,
  stripeClient: StripeClientLike = getStripeClient(),
): StripeWebhookEventLike {
  return verifyWebhookSignature(rawBody, signature, secret, stripeClient);
}

export const createCheckoutSession = createTenantCheckoutSession;
