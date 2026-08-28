import {
  canUseFeature,
  setTenantPlan,
  type FeatureKey,
  type PlanLevel,
} from '@vibetech/monetization'

export const INVOICE_SAAS_FEATURES = {
  invoiceCreation: 'invoices.create',
  invoiceUnlimited: 'invoices.unlimited',
  recurringBilling: 'recurring.billing',
  dunningEmails: 'dunning.emails',
} as const satisfies Record<string, FeatureKey>

const PLAN_LEVELS = ['free', 'starter', 'pro', 'business'] as const

const isPlanLevel = (value: string): value is PlanLevel =>
  (PLAN_LEVELS as readonly string[]).includes(value)

export const resolveUserPlan = (): PlanLevel => {
  const configured = process.env['INVOICE_SAAS_DEFAULT_PLAN'] ?? 'free'
  return isPlanLevel(configured) ? configured : 'free'
}

export interface UserEntitlementSnapshot {
  featureKey: FeatureKey
  plan: PlanLevel
  enabled: boolean
}

export const resolveUserEntitlement = (
  userId: string,
  featureKey: FeatureKey,
): UserEntitlementSnapshot => {
  const plan = resolveUserPlan()
  setTenantPlan(userId, plan)

  return {
    featureKey,
    plan,
    enabled: canUseFeature(userId, featureKey),
  }
}
