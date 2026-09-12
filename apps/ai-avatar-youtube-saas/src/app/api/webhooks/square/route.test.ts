import { vi, describe, expect, it, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import crypto from "node:crypto";
import AppDatabase from "@/shared/db-app/index";
import { headers } from "next/headers";

const tmpDir = resolve(process.cwd(), "tmp");
const testDbPath = resolve(tmpDir, "square-webhooks.test.db");
const dummySecret = "sq_whsec_test_secret_12345";

vi.hoisted(() => {
  process.env.APP_DB_PATH = "./tmp/square-webhooks.test.db";
  process.env.SQUARE_ACCESS_TOKEN = "sq_test_access_token";
  process.env.SQUARE_WEBHOOK_SECRET = "sq_whsec_test_secret_12345";
  process.env.SQUARE_LOCATION_ID = "sq_test_loc";
});

vi.mock("next/headers", () => {
  return {
    headers: vi.fn(),
  };
});

AppDatabase.resetInstance();

const { initSchema, getSubscriptionByUserId, upsertSubscription } =
  await import("@/lib/db");
const { POST } = await import("./route");

beforeAll(() => {
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  initSchema();
});

afterAll(() => {
  if (existsSync(testDbPath)) {
    try {
      rmSync(testDbPath, { force: true });
    } catch {
      // Ignored
    }
  }
});

function createSignedSquareRequest(
  payload: Record<string, unknown>,
  signatureOverride?: string | null
) {
  const jsonBody = JSON.stringify(payload);
  let signature: string | undefined;

  if (signatureOverride !== undefined) {
    signature = signatureOverride === null ? undefined : signatureOverride;
  } else {
    signature = crypto
      .createHmac("sha256", dummySecret)
      .update(jsonBody, "utf8")
      .digest("hex");
  }

  vi.mocked(headers).mockResolvedValue(
    new Headers(
      signature ? { "x-square-hmacsha256-signature": signature } : {}
    ) as any
  );

  return new Request("http://localhost:4300/api/webhooks/square", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: jsonBody,
  });
}

describe("Square Webhook Endpoint", () => {
  it("returns 400 when x-square-hmacsha256-signature header is missing", async () => {
    const req = createSignedSquareRequest({}, null);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Missing x-square-hmacsha256-signature");
  });

  it("returns 400 when signature is invalid", async () => {
    const req = createSignedSquareRequest({}, "invalid_signature");
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Signature verification failed");
  });

  it("handles payment.updated COMPLETED and grants growth tier credits", async () => {
    const userId = "user-sq-growth-01";
    upsertSubscription({
      userId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      planTier: "hobby",
      status: "active",
      currentPeriodEnd: 0,
      videoCredits: 10,
    });

    const payload = {
      type: "payment.updated",
      event_id: "sq_evt_101",
      data: {
        type: "payment",
        id: "sq_pay_999",
        object: {
          payment: {
            id: "sq_pay_999",
            status: "COMPLETED",
            amount_money: { amount: 4900, currency: "USD" },
            order_id: "sq_ord_888",
            note: JSON.stringify({ userId, tier: "growth" }),
          },
        },
      },
    };

    const req = createSignedSquareRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);

    const sub = getSubscriptionByUserId(userId);
    expect(sub).toBeDefined();
    expect(sub?.planTier).toBe("growth");
    expect(sub?.status).toBe("active");
    expect(sub?.videoCredits).toBe(500);
  });

  it("handles payment.created COMPLETED and grants startup tier credits", async () => {
    const userId = "user-sq-startup-02";
    const payload = {
      type: "payment.created",
      event_id: "sq_evt_102",
      data: {
        type: "payment",
        id: "sq_pay_1002",
        object: {
          payment: {
            id: "sq_pay_1002",
            status: "COMPLETED",
            amount_money: { amount: 1900, currency: "USD" },
            note: JSON.stringify({ userId, tier: "startup" }),
          },
        },
      },
    };

    const req = createSignedSquareRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);

    const sub = getSubscriptionByUserId(userId);
    expect(sub).toBeDefined();
    expect(sub?.planTier).toBe("startup");
    expect(sub?.status).toBe("active");
    expect(sub?.videoCredits).toBe(100);
  });
});
