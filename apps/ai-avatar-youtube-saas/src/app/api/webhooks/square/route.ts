import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getSubscriptionByUserId, upsertSubscription } from "@/lib/db";
import {
  getSquareCreditsForTier,
  getSquareTierFromAmount,
  verifySquareWebhookSignature,
  type SquarePlanTierKey,
} from "@/lib/square";

interface SquarePaymentObj {
  id?: string;
  status?: string;
  amount_money?: {
    amount?: number | bigint;
    currency?: string;
  };
  order_id?: string;
  customer_id?: string;
  note?: string;
  metadata?: Record<string, string>;
}

interface SquareWebhookEvent {
  type: string;
  event_id?: string;
  created_at?: string;
  data?: {
    type?: string;
    id?: string;
    object?: {
      payment?: SquarePaymentObj;
      id?: string;
      status?: string;
      note?: string;
      customer_id?: string;
      plan_id?: string;
      metadata?: Record<string, string>;
      amount_money?: {
        amount?: number | bigint;
        currency?: string;
      };
    };
  };
}

export async function POST(req: Request) {
  const webhookSecret =
    env.SQUARE_WEBHOOK_SECRET || process.env.SQUARE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Square webhook secret unconfigured" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const headersList = await headers();
  const signature =
    headersList.get("x-square-hmacsha256-signature") ||
    headersList.get("x-square-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-square-hmacsha256-signature header" },
      { status: 400 }
    );
  }

  const notificationUrl = req.url;
  const isValid = await verifySquareWebhookSignature(
    body,
    signature,
    webhookSecret,
    notificationUrl
  );

  if (!isValid) {
    console.error("Square webhook signature verification failed");
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 400 }
    );
  }

  let event: SquareWebhookEvent;
  try {
    event = JSON.parse(body) as SquareWebhookEvent;
  } catch (err) {
    console.error("Malformed Square webhook JSON body:", err);
    return NextResponse.json(
      { error: "Malformed JSON body" },
      { status: 400 }
    );
  }

  try {
    const eventType = event.type;
    const payment =
      event.data?.object?.payment ??
      (event.data?.object as SquarePaymentObj | undefined);

    if (
      eventType === "payment.updated" ||
      eventType === "payment.created" ||
      eventType === "order.fulfillment.updated"
    ) {
      const status = payment?.status;
      if (status === "COMPLETED" || status === "APPROVED") {
        let userId: string | null = null;
        let planTier: SquarePlanTierKey | "hobby" = "startup";

        const note = payment?.note;
        if (note) {
          try {
            const parsed = JSON.parse(note) as {
              userId?: string;
              tier?: SquarePlanTierKey;
            };
            if (parsed.userId) userId = parsed.userId;
            if (parsed.tier) planTier = parsed.tier;
          } catch {
            const matchUser = /user[_-]([a-zA-Z0-9_-]+)/i.exec(note);
            if (matchUser?.[1]) userId = matchUser[1];
          }
        }

        if (!userId && payment?.metadata?.userId) {
          userId = payment.metadata.userId;
        }

        if (payment?.amount_money?.amount && (!note || planTier === "startup")) {
          const amountCents = Number(payment.amount_money.amount);
          const detectedTier = getSquareTierFromAmount(amountCents);
          if (detectedTier !== "hobby") {
            planTier = detectedTier;
          }
        }

        if (userId) {
          const customerId =
            payment?.customer_id ?? `sq_cust_${userId}`;
          const subscriptionId =
            payment?.id ?? payment?.order_id ?? `sq_sub_${Date.now()}`;
          const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;

          upsertSubscription({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            planTier,
            status: "active",
            currentPeriodEnd: periodEnd,
            videoCredits: getSquareCreditsForTier(planTier),
          });

          console.log(
            `Square payment completed for user ${userId} on tier ${planTier}`
          );
        } else {
          console.warn(
            `Square payment completed without identifiable userId: ${payment?.id}`
          );
        }
      }
    } else if (
      eventType === "subscription.canceled" ||
      eventType === "customer.subscription.deleted"
    ) {
      const customerId = payment?.customer_id;
      if (customerId) {
        // Attempt to match user
        const existing = getSubscriptionByUserId(customerId);
        if (existing) {
          upsertSubscription({
            userId: existing.userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            planTier: "hobby",
            status: "canceled",
            currentPeriodEnd: 0,
            videoCredits: getSquareCreditsForTier("hobby"),
          });
          console.log(`User ${existing.userId} subscription canceled via Square`);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Fulfillment persistence failed";
    console.error("Square webhook fulfillment failed:", message);
    return NextResponse.json(
      { error: "Fulfillment persistence failed" },
      { status: 500 }
    );
  }
}
