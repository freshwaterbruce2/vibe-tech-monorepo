import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { signSession, unsignSession } from "@/lib/session";
import { getSubscriptionByUserId, initSchema, upsertSubscription } from "@/lib/db";

const COOKIE_NAME = "billing_user_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getBillingUserId(): Promise<string> {
  initSchema();
  const cookieStore = await cookies();
  const signed = cookieStore.get(COOKIE_NAME)?.value;
  const existingId = signed ? unsignSession(signed) : null;

  if (existingId) {
    return existingId;
  }

  const newId = `anon_${randomBytes(8).toString("hex")}`;
  cookieStore.set(COOKIE_NAME, signSession(newId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  if (!getSubscriptionByUserId(newId)) {
    upsertSubscription({
      userId: newId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      planTier: "hobby",
      status: "active",
      currentPeriodEnd: 0,
      videoCredits: 10,
    });
  }

  return newId;
}
