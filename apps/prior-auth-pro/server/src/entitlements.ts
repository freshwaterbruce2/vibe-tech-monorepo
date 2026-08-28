import { EntitlementsService } from '@vibetech/entitlements';

export const GENERATED_FEATURES = {
  appealGeneration: 'appeals.generate',
  premiumRoute: 'premium.route',
} as const;

const entitlements = new EntitlementsService({
  free: [],
  pro: [GENERATED_FEATURES.appealGeneration, GENERATED_FEATURES.premiumRoute],
});

export function hasFeature(plan: 'free' | 'pro', featureKey: string): boolean {
  return entitlements.hasFeature(plan, featureKey, {
    environment: 'dev',
  });
}
