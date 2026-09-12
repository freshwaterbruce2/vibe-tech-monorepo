import Stripe from "stripe";
import { env } from "@/lib/env";

const apiKey = env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_for_build";

export const stripe = new Stripe(apiKey, {
  apiVersion: "2026-08-26.dahlia" as any,
});

export const PLAN_TIERS = {
  startup: {
    name: "Startup Pro",
    priceId: env.STRIPE_PRICE_STARTUP ?? "price_startup",
    credits: 100,
  },
  growth: {
    name: "Growth Channel",
    priceId: env.STRIPE_PRICE_GROWTH ?? "price_growth",
    credits: 500,
  },
  saas_scale: {
    name: "SaaS Scale",
    priceId: env.STRIPE_PRICE_SAAS_SCALE ?? "price_saas_scale",
    credits: 2500,
  },
} as const;

export type PlanTierKey = keyof typeof PLAN_TIERS;

export function getPlanKeyFromPriceId(priceId: string): PlanTierKey | "hobby" {
  for (const [key, plan] of Object.entries(PLAN_TIERS)) {
    if (plan.priceId === priceId) {
      return key as PlanTierKey;
    }
  }
  return "hobby";
}

export function getCreditsForTier(tier: PlanTierKey | "hobby"): number {
  if (tier === "hobby") return 10;
  return PLAN_TIERS[tier].credits;
}
