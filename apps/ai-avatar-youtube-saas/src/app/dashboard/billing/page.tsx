import { Suspense } from "react";
import { getBillingUserId } from "@/lib/billing-user";
import { getSubscriptionByUserId, initSchema } from "@/lib/db";
import BillingDashboard from "./BillingDashboard";

async function BillingDashboardWrapper() {
  initSchema();
  const userId = await getBillingUserId();
  const subscription = getSubscriptionByUserId(userId);

  const initialSubscription = subscription ?? {
    planTier: "hobby" as const,
    status: "active",
    currentPeriodEnd: 0,
    videoCredits: 10,
    stripeSubscriptionId: null,
  };

  return <BillingDashboard userId={userId} subscription={initialSubscription} />;
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Loading billing profile...</div>}>
      <BillingDashboardWrapper />
    </Suspense>
  );
}
