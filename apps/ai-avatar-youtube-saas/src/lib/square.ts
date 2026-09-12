import { SquareClient, SquareEnvironment, WebhooksHelper, type Currency } from "square";
import crypto from "node:crypto";
import { env } from "@/lib/env";

export const SQUARE_PLAN_TIERS = {
  startup: {
    id: "startup",
    name: "Startup Pro",
    price: 1900, // $19.00 in cents
    currency: "USD",
    credits: 100,
  },
  growth: {
    id: "growth",
    name: "Growth Channel",
    price: 4900, // $49.00 in cents
    currency: "USD",
    credits: 500,
  },
  saas_scale: {
    id: "saas_scale",
    name: "SaaS Scale",
    price: 19900, // $199.00 in cents
    currency: "USD",
    credits: 2500,
  },
} as const;

export type SquarePlanTierKey = keyof typeof SQUARE_PLAN_TIERS;

export function getSquareCreditsForTier(tier: SquarePlanTierKey | "hobby"): number {
  if (tier === "hobby") return 10;
  return SQUARE_PLAN_TIERS[tier]?.credits ?? 10;
}

export function getSquareTierFromAmount(amountCents: number): SquarePlanTierKey | "hobby" {
  for (const [key, plan] of Object.entries(SQUARE_PLAN_TIERS)) {
    if (plan.price === amountCents) {
      return key as SquarePlanTierKey;
    }
  }
  return "hobby";
}

let squareClientInstance: SquareClient | null = null;

export function getSquareClient(): SquareClient {
  if (!squareClientInstance) {
    const token =
      env.SQUARE_ACCESS_TOKEN ||
      process.env.SQUARE_ACCESS_TOKEN ||
      "sq_test_placeholder";
    const isProduction =
      env.SQUARE_ENVIRONMENT === "production" ||
      process.env.SQUARE_ENVIRONMENT === "production";
    squareClientInstance = new SquareClient({
      environment: isProduction
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
      token,
    });
  }
  return squareClientInstance;
}

export interface SquareCheckoutOptions {
  userId: string;
  tier: SquarePlanTierKey;
  redirectUrl: string;
  cancelUrl?: string;
  customerEmail?: string;
}

export async function createSquareCheckoutSession(
  options: SquareCheckoutOptions
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const client = getSquareClient();
    const locationId =
      env.SQUARE_LOCATION_ID || process.env.SQUARE_LOCATION_ID || "main";
    const plan = SQUARE_PLAN_TIERS[options.tier];
    if (!plan) {
      return { success: false, error: `Invalid subscription tier: ${options.tier}` };
    }

    const paymentNote = JSON.stringify({
      userId: options.userId,
      tier: options.tier,
      planName: plan.name,
    });

    const response = await client.checkout.paymentLinks.create({
      idempotencyKey: `sub_${options.userId}_${Date.now()}`,
      description: `AI Avatar Studio Subscription - ${plan.name}`,
      quickPay: {
        name: `AI Avatar Studio: ${plan.name}`,
        locationId,
        priceMoney: {
          amount: BigInt(plan.price),
          currency: plan.currency as Currency,
        },
      },
      checkoutOptions: {
        redirectUrl: options.redirectUrl,
        askForShippingAddress: false,
        acceptedPaymentMethods: {
          applePay: true,
          googlePay: true,
          cashAppPay: true,
          afterpayClearpay: false,
        },
      },
      prePopulatedData: {
        buyerEmail:
          options.customerEmail || `user-${options.userId}@vibetech-user.com`,
      },
      paymentNote,
    });

    if (response?.paymentLink?.url) {
      return { success: true, url: response.paymentLink.url };
    }

    return { success: false, error: "Failed to create Square payment link" };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Square checkout failed";
    console.error("Square checkout link error:", err);
    return { success: false, error: message };
  }
}

export async function verifySquareWebhookSignature(
  body: string,
  signature: string,
  secretKey?: string,
  notificationUrl?: string
): Promise<boolean> {
  const key =
    secretKey ||
    env.SQUARE_WEBHOOK_SECRET ||
    process.env.SQUARE_WEBHOOK_SECRET;

  if (!key || !signature) {
    return false;
  }

  // 1. Try official WebhooksHelper if notificationUrl is available
  if (notificationUrl) {
    try {
      const valid = await WebhooksHelper.verifySignature({
        requestBody: body,
        signatureHeader: signature,
        signatureKey: key,
        notificationUrl,
      });
      if (valid) return true;
    } catch {
      // Fall back to HMAC check
    }
  }

  // 2. Direct HMAC-SHA256 signature verification
  try {
    const cleanSig = signature.replace(/^sha256=/, "");
    const hmac = crypto.createHmac("sha256", key).update(body, "utf8").digest();
    const hmacHex = hmac.toString("hex");
    const hmacBase64 = hmac.toString("base64");

    if (
      cleanSig === hmacHex ||
      signature === hmacHex ||
      signature === hmacBase64
    ) {
      return true;
    }

    if (notificationUrl) {
      const hmacUrl = crypto
        .createHmac("sha256", key)
        .update(notificationUrl + body, "utf8")
        .digest("base64");
      if (signature === hmacUrl) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}
