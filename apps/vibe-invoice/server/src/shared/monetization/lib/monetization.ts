import { AsyncLocalStorage } from 'node:async_hooks';

export const PLAN_LEVELS = ['free', 'starter', 'pro', 'business'] as const;

export type PlanLevel = (typeof PLAN_LEVELS)[number];
export type TenantId = string;

export type FeatureKey =
  | 'invoices.create'
  | 'invoices.unlimited'
  | 'stripe.checkout'
  | 'dunning.emails'
  | 'recurring.billing'
  | 'analytics.revenue'
  | 'ai.assistant'
  | 'bookings.create';

export type UsageMetric = 'invoices.created' | 'emails.sent' | 'ai.tokens';

export interface PlanDefinition {
  readonly level: PlanLevel;
  readonly name: string;
  readonly monthlyPriceUsd: number;
  readonly rank: number;
  readonly features: readonly FeatureKey[];
  readonly limits: Partial<Record<UsageMetric, number | null>>;
}

export interface UsageResult {
  tenantId: TenantId;
  metric: UsageMetric;
  used: number;
  amount: number;
  limit: number | null;
  allowed: boolean;
}

export class PlanRequiredError extends Error {
  constructor(
    readonly tenantId: TenantId,
    readonly currentPlan: PlanLevel,
    readonly requiredPlan: PlanLevel,
  ) {
    super(
      `Tenant ${tenantId} requires ${requiredPlan} plan or higher; current plan is ${currentPlan}`,
    );
    this.name = 'PlanRequiredError';
  }
}

const tenantContext = new AsyncLocalStorage<TenantId>();

const tenantPlans = new Map<TenantId, PlanLevel>();
const usageByTenant = new Map<TenantId, Map<UsageMetric, number>>();

export const DEFAULT_TENANT_ID = 'default';

export const PLAN_DEFINITIONS = {
  free: {
    level: 'free',
    name: 'Free',
    monthlyPriceUsd: 0,
    rank: 0,
    features: ['invoices.create', 'stripe.checkout'],
    limits: {
      'invoices.created': 3,
      'emails.sent': 25,
      'ai.tokens': 0,
    },
  },
  starter: {
    level: 'starter',
    name: 'Starter',
    monthlyPriceUsd: 9,
    rank: 1,
    features: ['invoices.create', 'invoices.unlimited', 'stripe.checkout', 'dunning.emails'],
    limits: {
      'invoices.created': null,
      'emails.sent': 500,
      'ai.tokens': 25_000,
    },
  },
  pro: {
    level: 'pro',
    name: 'Pro',
    monthlyPriceUsd: 19,
    rank: 2,
    features: [
      'invoices.create',
      'invoices.unlimited',
      'stripe.checkout',
      'dunning.emails',
      'recurring.billing',
      'analytics.revenue',
      'ai.assistant',
      'bookings.create',
    ],
    limits: {
      'invoices.created': null,
      'emails.sent': 2_500,
      'ai.tokens': 250_000,
    },
  },
  business: {
    level: 'business',
    name: 'Business',
    monthlyPriceUsd: 49,
    rank: 3,
    features: [
      'invoices.create',
      'invoices.unlimited',
      'stripe.checkout',
      'dunning.emails',
      'recurring.billing',
      'analytics.revenue',
      'ai.assistant',
      'bookings.create',
    ],
    limits: {
      'invoices.created': null,
      'emails.sent': null,
      'ai.tokens': null,
    },
  },
} as const satisfies Record<PlanLevel, PlanDefinition>;

const normalizeTenantId = (tenantId: TenantId | undefined): TenantId => {
  const normalized = tenantId?.trim();
  if (normalized === undefined || normalized.length === 0) {
    return DEFAULT_TENANT_ID;
  }

  return normalized;
};

const getUsageMap = (tenantId: TenantId): Map<UsageMetric, number> => {
  const normalized = normalizeTenantId(tenantId);
  const existing = usageByTenant.get(normalized);
  if (existing) {
    return existing;
  }

  const created = new Map<UsageMetric, number>();
  usageByTenant.set(normalized, created);
  return created;
};

/** Runs the callback with a tenant id available to all monetization helpers. */
export function runWithTenant<T>(tenantId: TenantId, callback: () => T): T {
  return tenantContext.run(normalizeTenantId(tenantId), callback);
}

/** Returns the active tenant id, defaulting to `default` when no context exists. */
export function currentTenantId(): TenantId {
  return tenantContext.getStore() ?? DEFAULT_TENANT_ID;
}

/** Assigns a plan to a tenant in the default in-memory store. */
export function setTenantPlan(tenantId: TenantId, plan: PlanLevel): void {
  tenantPlans.set(normalizeTenantId(tenantId), plan);
}

/** Returns the tenant plan from the default in-memory store. */
export function getTenantPlan(tenantId: TenantId = currentTenantId()): PlanLevel {
  return tenantPlans.get(normalizeTenantId(tenantId)) ?? 'free';
}

/** Returns the immutable definition for a plan level. */
export function getPlanDefinition(plan: PlanLevel): PlanDefinition {
  return PLAN_DEFINITIONS[plan];
}

export function canUseFeature(featureKey: FeatureKey): boolean;
export function canUseFeature(tenantId: TenantId, featureKey: FeatureKey): boolean;
/** Checks whether a tenant plan includes a feature. */
export function canUseFeature(
  tenantOrFeature: TenantId | FeatureKey,
  maybeFeature?: FeatureKey,
): boolean {
  const tenantId = maybeFeature ? normalizeTenantId(tenantOrFeature) : currentTenantId();
  const featureKey = maybeFeature ?? (tenantOrFeature as FeatureKey);
  const plan = getTenantPlan(tenantId);
  return getPlanDefinition(plan).features.includes(featureKey);
}

export function requirePlan(requiredPlan: PlanLevel): true;
export function requirePlan(tenantId: TenantId, requiredPlan: PlanLevel): true;
/** Throws when a tenant is below the required plan level. */
export function requirePlan(
  tenantOrPlan: TenantId | PlanLevel,
  maybePlan?: PlanLevel,
): true {
  const tenantId = maybePlan ? normalizeTenantId(tenantOrPlan) : currentTenantId();
  const requiredPlan = maybePlan ?? (tenantOrPlan as PlanLevel);
  const currentPlan = getTenantPlan(tenantId);

  if (PLAN_DEFINITIONS[currentPlan].rank < PLAN_DEFINITIONS[requiredPlan].rank) {
    throw new PlanRequiredError(tenantId, currentPlan, requiredPlan);
  }

  return true;
}

export function trackUsage(metric: UsageMetric, amount?: number): UsageResult;
export function trackUsage(tenantId: TenantId, metric: UsageMetric, amount?: number): UsageResult;
/** Tracks tenant usage in the default in-memory store and returns limit state. */
export function trackUsage(
  tenantOrMetric: TenantId | UsageMetric,
  metricOrAmount?: UsageMetric | number,
  maybeAmount = 1,
): UsageResult {
  const tenantId =
    typeof metricOrAmount === 'string' ? normalizeTenantId(tenantOrMetric) : currentTenantId();
  const metric =
    typeof metricOrAmount === 'string' ? metricOrAmount : (tenantOrMetric as UsageMetric);
  const amount = typeof metricOrAmount === 'number' ? metricOrAmount : maybeAmount;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('usage amount must be a positive number');
  }

  const usage = getUsageMap(tenantId);
  const used = (usage.get(metric) ?? 0) + amount;
  usage.set(metric, used);

  const plan = getTenantPlan(tenantId);
  const limit = PLAN_DEFINITIONS[plan].limits[metric] ?? null;

  return {
    tenantId,
    metric,
    used,
    amount,
    limit,
    allowed: limit == null || used <= limit,
  };
}

/** Returns the current value for a tenant usage metric. */
export function getUsage(tenantId: TenantId, metric: UsageMetric): number {
  return getUsageMap(tenantId).get(metric) ?? 0;
}

/** Clears usage counters for one tenant or for every tenant. */
export function resetUsage(tenantId?: TenantId): void {
  if (tenantId) {
    usageByTenant.delete(normalizeTenantId(tenantId));
    return;
  }
  usageByTenant.clear();
}
