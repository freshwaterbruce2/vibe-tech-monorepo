"use client";

import { useState, useTransition } from "react";
import { createCheckoutSessionAction, createPortalSessionAction } from "@/app/actions/billing";
import type { PlanTierKey } from "@/lib/stripe";

export interface BillingDashboardProps {
  userId: string;
  subscription: {
    planTier: "hobby" | PlanTierKey;
    status: string;
    currentPeriodEnd: number;
    videoCredits: number;
    stripeSubscriptionId: string | null;
  };
}

const TIER_INFO: Record<
  PlanTierKey,
  { name: string; price: string; credits: number; features: string[] }
> = {
  startup: {
    name: "Startup Pro",
    price: "$29",
    credits: 100,
    features: ["100 HD video renders", "Commercial utilization rights", "Standard support"],
  },
  growth: {
    name: "Growth Channel",
    price: "$99",
    credits: 500,
    features: ["500 HD video renders", "Multi-language subtitles", "Premium voice clones", "Priority support"],
  },
  saas_scale: {
    name: "SaaS Scale",
    price: "$399",
    credits: 2500,
    features: ["2,500 HD video renders", "Infinite scale queues", "Dedicated portal options", "Account manager"],
  },
};

export default function BillingDashboard({ userId, subscription }: BillingDashboardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activePlan = subscription.planTier;
  const credits = subscription.videoCredits;
  const maxCredits = activePlan === "hobby" ? 10 : TIER_INFO[activePlan].credits;
  const creditPercentage = Math.min((credits / maxCredits) * 100, 100);

  const handleSubscribe = (tier: PlanTierKey) => {
    setError(null);
    startTransition(async () => {
      const res = await createCheckoutSessionAction(userId, tier);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error ?? "Checkout failed");
      }
    });
  };

  const handleManagePortal = () => {
    setError(null);
    startTransition(async () => {
      const res = await createPortalSessionAction(userId);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error ?? "Portal redirect failed");
      }
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscriptions</h1>
        <p className="text-muted-foreground mt-2">Manage your plan, payment method, and video render credits.</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current plan</span>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-black capitalize">{activePlan.replace("_", " ")}</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                subscription.status === "active"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
              }`}
            >
              {subscription.status}
            </span>
          </div>
          {subscription.currentPeriodEnd > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Billing period ends on{" "}
              <strong>{new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString()}</strong>
            </p>
          )}
          {subscription.stripeSubscriptionId && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleManagePortal}
                disabled={isPending}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              >
                {isPending ? "Loading..." : "Manage subscription & card"}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-end justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Video credits remaining
            </span>
            <span className="text-sm font-mono font-bold text-primary">
              {credits} / {maxCredits} renders
            </span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full border border-border bg-secondary p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
              style={{ width: `${creditPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Credits are consumed when a final render is queued.</p>
        </div>
      </div>

      {!subscription.stripeSubscriptionId && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {(Object.keys(TIER_INFO) as PlanTierKey[]).map((tier) => {
            const info = TIER_INFO[tier];
            const popular = tier === "growth";
            return (
              <div
                key={tier}
                className={`relative flex flex-col justify-between rounded-xl border bg-card p-6 shadow-sm transition-all ${
                  popular ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/50"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wider text-primary-foreground">
                    Popular
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold">{info.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">{info.credits} HD renders per cycle.</p>
                  <div className="my-4">
                    <span className="text-3xl font-extrabold">{info.price}</span>
                    <span className="text-sm text-muted-foreground"> / month</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {info.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => handleSubscribe(tier)}
                  disabled={isPending}
                  className="mt-6 w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "Loading..." : `Upgrade to ${info.name}`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
