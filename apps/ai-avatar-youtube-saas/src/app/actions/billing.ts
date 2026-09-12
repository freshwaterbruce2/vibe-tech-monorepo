"use server";

import { revalidateTag } from "next/cache";
import { env } from "@/lib/env";
import { getSubscriptionByUserId } from "@/lib/db";
import { PLAN_TIERS, PlanTierKey, stripe } from "@/lib/stripe";
import {
  createSquareCheckoutSession,
  type SquarePlanTierKey,
} from "@/lib/square";

interface BillingResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export async function createCheckoutSessionAction(
  userId: string,
  tier: PlanTierKey
): Promise<BillingResponse> {
  const appUrl =
    env.NEXT_PUBLIC_APP_URL ||
    "https://ai-avatar-studio-production.up.railway.app";

  if (env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN) {
    return createSquareCheckoutSession({
      userId,
      tier: tier as SquarePlanTierKey,
      redirectUrl: `${appUrl}/dashboard/billing?status=success&tier=${tier}`,
      cancelUrl: `${appUrl}/dashboard/billing?status=canceled`,
    });
  }

  try {
    const plan = PLAN_TIERS[tier];
    if (!plan?.priceId) {
      return { success: false, error: "Invalid billing tier or missing price ID" };
    }

    const existingSub = getSubscriptionByUserId(userId);
    const customerId = existingSub?.stripeCustomerId ?? undefined;

    const session = await stripe.checkout.sessions.create({
      client_reference_id: userId,
      customer: customerId,
      customer_email: customerId ? undefined : `user-${userId}@vibetech-user.com`,
      payment_method_types: ["card"],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${appUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing?status=canceled`,
    });

    return { success: true, url: session.url ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout creation failed";
    console.error("Stripe checkout creation failed:", message);
    return { success: false, error: message };
  }
}

export async function createPortalSessionAction(userId: string): Promise<BillingResponse> {
  try {
    const subscription = getSubscriptionByUserId(userId);
    if (!subscription?.stripeCustomerId) {
      return { success: false, error: "No active billing profile found" };
    }

    const appUrl = env.NEXT_PUBLIC_APP_URL;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return { success: true, url: portalSession.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Portal creation failed";
    console.error("Stripe portal creation failed:", message);
    return { success: false, error: message };
  }
}

export async function syncSubscriptionStateAction(userId: string) {
  revalidateTag(`user-billing-${userId}`, "max");
}
