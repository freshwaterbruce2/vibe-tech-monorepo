import { getBillingUserId } from "@/lib/billing-user";
import { getSubscriptionByUserId, initSchema } from "@/lib/db";
import BillingDashboard from "./BillingDashboard";

export default async function BillingPage() {
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
