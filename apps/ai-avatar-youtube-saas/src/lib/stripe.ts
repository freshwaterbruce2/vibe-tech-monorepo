import Stripe from "stripe";
import { env } from "@/lib/env";

if (!env.STRIPE_SECRET_KEY && env.NODE_ENV !== "test") {
  throw new Error("Missing STRIPE_SECRET_KEY server-side environment variable");
}

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
    })
  : ({} as Stripe);

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
