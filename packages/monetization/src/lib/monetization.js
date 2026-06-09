import { AsyncLocalStorage } from 'node:async_hooks';
export const PLAN_LEVELS = ['free', 'starter', 'pro', 'business'];
export class PlanRequiredError extends Error {
    tenantId;
    currentPlan;
    requiredPlan;
    constructor(tenantId, currentPlan, requiredPlan) {
        super(`Tenant ${tenantId} requires ${requiredPlan} plan or higher; current plan is ${currentPlan}`);
        this.tenantId = tenantId;
        this.currentPlan = currentPlan;
        this.requiredPlan = requiredPlan;
        this.name = 'PlanRequiredError';
    }
}
const tenantContext = new AsyncLocalStorage();
const tenantPlans = new Map();
const usageByTenant = new Map();
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
};
const normalizeTenantId = (tenantId) => {
    const normalized = tenantId?.trim();
    if (normalized === undefined || normalized.length === 0) {
        return DEFAULT_TENANT_ID;
    }
    return normalized;
};
const getUsageMap = (tenantId) => {
    const normalized = normalizeTenantId(tenantId);
    const existing = usageByTenant.get(normalized);
    if (existing) {
        return existing;
    }
    const created = new Map();
    usageByTenant.set(normalized, created);
    return created;
};
/** Runs the callback with a tenant id available to all monetization helpers. */
export function runWithTenant(tenantId, callback) {
    return tenantContext.run(normalizeTenantId(tenantId), callback);
}
/** Returns the active tenant id, defaulting to `default` when no context exists. */
export function currentTenantId() {
    return tenantContext.getStore() ?? DEFAULT_TENANT_ID;
}
/** Assigns a plan to a tenant in the default in-memory store. */
export function setTenantPlan(tenantId, plan) {
    tenantPlans.set(normalizeTenantId(tenantId), plan);
}
/** Returns the tenant plan from the default in-memory store. */
export function getTenantPlan(tenantId = currentTenantId()) {
    return tenantPlans.get(normalizeTenantId(tenantId)) ?? 'free';
}
/** Returns the immutable definition for a plan level. */
export function getPlanDefinition(plan) {
    return PLAN_DEFINITIONS[plan];
}
/** Checks whether a tenant plan includes a feature. */
export function canUseFeature(tenantOrFeature, maybeFeature) {
    const tenantId = maybeFeature ? normalizeTenantId(tenantOrFeature) : currentTenantId();
    const featureKey = maybeFeature ?? tenantOrFeature;
    const plan = getTenantPlan(tenantId);
    return getPlanDefinition(plan).features.includes(featureKey);
}
/** Throws when a tenant is below the required plan level. */
export function requirePlan(tenantOrPlan, maybePlan) {
    const tenantId = maybePlan ? normalizeTenantId(tenantOrPlan) : currentTenantId();
    const requiredPlan = maybePlan ?? tenantOrPlan;
    const currentPlan = getTenantPlan(tenantId);
    if (PLAN_DEFINITIONS[currentPlan].rank < PLAN_DEFINITIONS[requiredPlan].rank) {
        throw new PlanRequiredError(tenantId, currentPlan, requiredPlan);
    }
    return true;
}
/** Tracks tenant usage in the default in-memory store and returns limit state. */
export function trackUsage(tenantOrMetric, metricOrAmount, maybeAmount = 1) {
    const tenantId = typeof metricOrAmount === 'string' ? normalizeTenantId(tenantOrMetric) : currentTenantId();
    const metric = typeof metricOrAmount === 'string' ? metricOrAmount : tenantOrMetric;
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
export function getUsage(tenantId, metric) {
    return getUsageMap(tenantId).get(metric) ?? 0;
}
/** Clears usage counters for one tenant or for every tenant. */
export function resetUsage(tenantId) {
    if (tenantId) {
        usageByTenant.delete(normalizeTenantId(tenantId));
        return;
    }
    usageByTenant.clear();
}
//# sourceMappingURL=monetization.js.map