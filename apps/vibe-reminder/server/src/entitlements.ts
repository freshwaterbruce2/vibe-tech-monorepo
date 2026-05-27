import { EntitlementsService } from '@vibetech/entitlements';

export const GENERATED_FEATURES = {
  premiumRoute: 'premium.route',
} as const;

const entitlements = new EntitlementsService({
  free: [],
  pro: [GENERATED_FEATURES.premiumRoute],
});

export function hasFeature(plan: 'free' | 'pro', featureKey: string): boolean {
  return entitlements.hasFeature(plan, featureKey, {
    environment: 'dev',
  });
}
