import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getUserIdByStripeCustomerId, upsertSubscription } from "@/lib/db";
import { getCreditsForTier, getPlanKeyFromPriceId, PLAN_TIERS, stripe } from "@/lib/stripe";

function getPriceIdFromSubscription(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  if (!item) return null;
  return typeof item.price === "string" ? item.price : item.price.id;
}

function getCurrentPeriodEnd(subscription: Stripe.Subscription): number {
  return subscription.items.data[0]?.current_period_end ?? 0;
}

export async function POST(req: Request) {
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret unconfigured" }, { status: 500 });
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "signature verification failed";
    // eslint-disable-next-line no-console
    console.error(`Stripe webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const userId = checkoutSession.client_reference_id;
        const subscriptionId = checkoutSession.subscription as string;
        const customerId = checkoutSession.customer as string;

        if (!userId) {
          // eslint-disable-next-line no-console
          console.error("Stripe checkout completed missing client_reference_id");
          return NextResponse.json({ error: "Missing client_reference_id" }, { status: 400 });
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = getPriceIdFromSubscription(subscription);
        const planTier = priceId ? getPlanKeyFromPriceId(priceId) : "hobby";

        upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          planTier,
          status: subscription.status === "active" ? "active" : (subscription.status as UserSubscriptionStatus),
          currentPeriodEnd: getCurrentPeriodEnd(subscription),
          videoCredits: getCreditsForTier(planTier),
        });

        // eslint-disable-next-line no-console
        console.log(`Stripe checkout completed for user ${userId} on tier ${planTier}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = getUserIdByStripeCustomerId(customerId);
        if (!userId) {
          // eslint-disable-next-line no-console
          console.warn(`Subscription update for unknown customer ${customerId}`);
          break;
        }

        const priceId = getPriceIdFromSubscription(subscription);
        const planTier = priceId ? getPlanKeyFromPriceId(priceId) : "hobby";

        upsertSubscription({
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          planTier,
          status: subscription.status as UserSubscriptionStatus,
          currentPeriodEnd: getCurrentPeriodEnd(subscription),
          videoCredits: getCreditsForTier(planTier),
        });

        // eslint-disable-next-line no-console
        console.log(`Subscription updated for user ${userId}: ${subscription.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = getUserIdByStripeCustomerId(customerId);
        if (userId) {
          upsertSubscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            planTier: "hobby",
            status: "canceled",
            currentPeriodEnd: 0,
            videoCredits: getCreditsForTier("hobby"),
          });
          // eslint-disable-next-line no-console
          console.log(`User ${userId} downgraded to hobby after cancellation`);
        }
        break;
      }

      default:
        // eslint-disable-next-line no-console
        console.log(`Unhandled Stripe webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "fulfillment failed";
    // eslint-disable-next-line no-console
    console.error("Stripe webhook fulfillment failed:", message);
    return NextResponse.json({ error: "Fulfillment persistence failed" }, { status: 500 });
  }
}

type UserSubscriptionStatus = "active" | "canceled" | "trialing" | "past_due" | "incomplete" | "unpaid";
