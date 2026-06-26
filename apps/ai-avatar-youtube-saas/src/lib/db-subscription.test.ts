import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const tmpDir = resolve(process.cwd(), "tmp");
const testDbPath = resolve(tmpDir, "subscriptions.test.db");

beforeAll(() => {
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });
  try {
    rmSync(testDbPath, { force: true });
  } catch {
    // ignore
  }
  process.env.APP_DB_PATH = testDbPath;
});

afterAll(() => {
  try {
    rmSync(testDbPath, { force: true });
  } catch {
    // ignore cleanup errors
  }
});

describe("subscription database helpers", async () => {
  const { initSchema, upsertSubscription, getSubscriptionByUserId, getUserIdByStripeCustomerId, deductVideoCredit } =
    await import("./db");

  initSchema();

  it("creates and retrieves a hobby subscription", () => {
    const userId = `test-hobby-${Date.now()}`;
    upsertSubscription({
      userId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      planTier: "hobby",
      status: "active",
      currentPeriodEnd: 0,
      videoCredits: 10,
    });

    const sub = getSubscriptionByUserId(userId);
    expect(sub).toBeDefined();
    expect(sub?.planTier).toBe("hobby");
    expect(sub?.videoCredits).toBe(10);
  });

  it("updates a subscription to a paid tier and looks it up by Stripe customer", () => {
    const userId = `test-paid-${Date.now()}`;
    const customerId = `cus_${userId}`;
    const subscriptionId = `sub_${userId}`;
    upsertSubscription({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      planTier: "startup",
      status: "active",
      currentPeriodEnd: 1893456000,
      videoCredits: 100,
    });

    expect(getUserIdByStripeCustomerId(customerId)).toBe(userId);
    expect(getSubscriptionByUserId(userId)?.planTier).toBe("startup");
  });

  it("deducts video credits until depleted", () => {
    const userId = `test-credits-${Date.now()}`;
    upsertSubscription({
      userId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      planTier: "hobby",
      status: "active",
      currentPeriodEnd: 0,
      videoCredits: 2,
    });

    expect(deductVideoCredit(userId)).toBe(true);
    expect(getSubscriptionByUserId(userId)?.videoCredits).toBe(1);
    expect(deductVideoCredit(userId)).toBe(true);
    expect(getSubscriptionByUserId(userId)?.videoCredits).toBe(0);
    expect(deductVideoCredit(userId)).toBe(false);
  });
});
