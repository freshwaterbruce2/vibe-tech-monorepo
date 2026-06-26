import { vi, describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import AppDatabase from "@vibetech/db-app";
import { headers } from "next/headers";

const tmpDir = "D:\\databases\\ai-avatar-youtube-saas\\tmp";
const testDbPath = resolve(tmpDir, "stripe-webhooks.test.db");
const dummySecret = "whsec_test_secret";

// 1. Run hoisted setup to configure env variables before imports and mocks are resolved
vi.hoisted(() => {
  process.env.APP_DB_PATH = "D:\\databases\\ai-avatar-youtube-saas\\tmp\\stripe-webhooks.test.db";
  process.env.STRIPE_SECRET_KEY = "sk_test_mockkey";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
});

// 2. Mock next/headers
vi.mock("next/headers", () => {
  return {
    headers: vi.fn(),
  };
});

// 3. Mock the retrieve method while preserving other Stripe client properties
vi.mock("@/lib/stripe", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/stripe")>();
  return {
    ...original,
    stripe: {
      ...original.stripe,
      subscriptions: {
        ...original.stripe.subscriptions,
        retrieve: vi.fn(),
      },
    },
  };
});

// Reset the database singleton instance so it resolves to our custom path
AppDatabase.resetInstance();

// Import application modules dynamically/statically after variables are hoisted
const { initSchema, getSubscriptionByUserId, upsertSubscription } = await import("@/lib/db");
const { stripe } = await import("@/lib/stripe");
const { POST } = await import("./route");

beforeAll(() => {
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  try {
    rmSync(testDbPath, { force: true });
  } catch {
    // ignore
  }
  initSchema();
});

afterAll(() => {
  try {
    rmSync(testDbPath, { force: true });
    AppDatabase.resetInstance();
  } catch {
    // ignore
  }
});

describe("Stripe Webhook Handler Integration Tests", () => {
  const signAndSendRequest = async (payload: object, signatureHeaderValue?: string) => {
    const payloadString = JSON.stringify(payload);
    const signature =
      signatureHeaderValue !== undefined
        ? signatureHeaderValue
        : stripe.webhooks.generateTestHeaderString({
            payload: payloadString,
            secret: dummySecret,
          });

    vi.mocked(headers).mockResolvedValue(
      new Headers(signature ? { "stripe-signature": signature } : {}) as any
    );

    const req = new Request("http://localhost:4300/api/webhooks/stripe", {
      method: "POST",
      body: payloadString,
    });

    return POST(req);
  };

  it("returns 400 when stripe-signature header is missing", async () => {
    const payload = { id: "evt_test", object: "event", type: "ping" };
    const res = await signAndSendRequest(payload, ""); // empty signature
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing stripe-signature");
  });

  it("returns 400 when stripe-signature header is invalid", async () => {
    const payload = { id: "evt_test", object: "event", type: "ping" };
    const res = await signAndSendRequest(payload, "t=123,v1=invalid_sig");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Signature verification failed");
  });

  it("successfully handles checkout.session.completed for startup tier", async () => {
    const userId = "user_startup_123";
    const subscriptionId = "sub_startup_123";
    const customerId = "cus_startup_123";

    // Mock retrieval of subscription properties from Stripe without hitting network
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      id: subscriptionId,
      status: "active",
      customer: customerId,
      items: {
        data: [
          {
            price: {
              id: "price_startup",
            },
            current_period_end: 1893456000,
          },
        ],
      },
    } as any);

    const payload = {
      id: "evt_startup_completed",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_startup_123",
          object: "checkout.session",
          client_reference_id: userId,
          customer: customerId,
          subscription: subscriptionId,
          status: "complete",
        },
      },
    };

    const res = await signAndSendRequest(payload);
    expect(res.status).toBe(200);

    const sub = getSubscriptionByUserId(userId);
    expect(sub).toBeDefined();
    expect(sub?.planTier).toBe("startup");
    expect(sub?.stripeCustomerId).toBe(customerId);
    expect(sub?.stripeSubscriptionId).toBe(subscriptionId);
    expect(sub?.videoCredits).toBe(100);
    expect(sub?.status).toBe("active");
  });

  it("successfully handles checkout.session.completed for growth tier", async () => {
    const userId = "user_growth_123";
    const subscriptionId = "sub_growth_123";
    const customerId = "cus_growth_123";

    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      id: subscriptionId,
      status: "active",
      customer: customerId,
      items: {
        data: [
          {
            price: {
              id: "price_growth",
            },
            current_period_end: 1893456000,
          },
        ],
      },
    } as any);

    const payload = {
      id: "evt_growth_completed",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_growth_123",
          object: "checkout.session",
          client_reference_id: userId,
          customer: customerId,
          subscription: subscriptionId,
          status: "complete",
        },
      },
    };

    const res = await signAndSendRequest(payload);
    expect(res.status).toBe(200);

    const sub = getSubscriptionByUserId(userId);
    expect(sub?.planTier).toBe("growth");
    expect(sub?.videoCredits).toBe(500);
  });

  it("successfully handles checkout.session.completed for saas_scale tier", async () => {
    const userId = "user_scale_123";
    const subscriptionId = "sub_scale_123";
    const customerId = "cus_scale_123";

    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      id: subscriptionId,
      status: "active",
      customer: customerId,
      items: {
        data: [
          {
            price: {
              id: "price_saas_scale",
            },
            current_period_end: 1893456000,
          },
        ],
      },
    } as any);

    const payload = {
      id: "evt_scale_completed",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_scale_123",
          object: "checkout.session",
          client_reference_id: userId,
          customer: customerId,
          subscription: subscriptionId,
          status: "complete",
        },
      },
    };

    const res = await signAndSendRequest(payload);
    expect(res.status).toBe(200);

    const sub = getSubscriptionByUserId(userId);
    expect(sub?.planTier).toBe("saas_scale");
    expect(sub?.videoCredits).toBe(2500);
  });

  it("successfully updates plan/credits on customer.subscription.updated", async () => {
    const userId = "user_update_123";
    const customerId = "cus_update_123";
    const subscriptionId = "sub_update_123";

    // Pre-insert a subscription so the customer mapping lookup succeeds
    upsertSubscription({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      planTier: "startup",
      status: "active",
      currentPeriodEnd: 1893456000,
      videoCredits: 100,
    });

    // Update payload transitions user to growth tier
    const payload = {
      id: "evt_sub_updated",
      object: "event",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: subscriptionId,
          object: "subscription",
          customer: customerId,
          status: "active",
          items: {
            data: [
              {
                price: {
                  id: "price_growth",
                },
                current_period_end: 1893456999,
              },
            ],
          },
        },
      },
    };

    const res = await signAndSendRequest(payload);
    expect(res.status).toBe(200);

    const sub = getSubscriptionByUserId(userId);
    expect(sub?.planTier).toBe("growth");
    expect(sub?.videoCredits).toBe(500);
    expect(sub?.currentPeriodEnd).toBe(1893456999);
  });

  it("successfully downgrades to hobby and sets to canceled on customer.subscription.deleted", async () => {
    const userId = "user_delete_123";
    const customerId = "cus_delete_123";
    const subscriptionId = "sub_delete_123";

    // Pre-insert a subscription
    upsertSubscription({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      planTier: "saas_scale",
      status: "active",
      currentPeriodEnd: 1893456000,
      videoCredits: 2500,
    });

    const payload = {
      id: "evt_sub_deleted",
      object: "event",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: subscriptionId,
          object: "subscription",
          customer: customerId,
          status: "canceled",
          items: {
            data: [
              {
                price: {
                  id: "price_saas_scale",
                },
                current_period_end: 0,
              },
            ],
          },
        },
      },
    };

    const res = await signAndSendRequest(payload);
    expect(res.status).toBe(200);

    const sub = getSubscriptionByUserId(userId);
    expect(sub?.planTier).toBe("hobby");
    expect(sub?.status).toBe("canceled");
    expect(sub?.stripeSubscriptionId).toBeNull();
    expect(sub?.videoCredits).toBe(10);
  });
});
