import {
  EntitlementsService,
  type FeatureKey,
  type PlanFeatureMatrix,
} from '@vibetech/entitlements'

export const INVOICE_SAAS_FEATURES = {
  recurringBilling: 'recurring.billing',
} as const satisfies Record<string, FeatureKey>

const PLAN_FEATURES = {
  legacy: [INVOICE_SAAS_FEATURES.recurringBilling],
} as const satisfies PlanFeatureMatrix

const entitlements = new EntitlementsService(PLAN_FEATURES)

const getEntitlementEnvironment = (): 'dev' | 'staging' | 'prod' => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return 'prod'
    case 'staging':
      return 'staging'
    default:
      return 'dev'
  }
}

export interface UserEntitlementSnapshot {
  featureKey: FeatureKey
  plan: keyof typeof PLAN_FEATURES
  enabled: boolean
}

export const resolveUserEntitlement = (
  userId: string,
  featureKey: FeatureKey,
): UserEntitlementSnapshot => {
  const plan = 'legacy'
  const enabled = entitlements.hasFeature(plan, featureKey, {
    environment: getEntitlementEnvironment(),
    userId,
  })

  return {
    featureKey,
    plan,
    enabled,
  }
}
