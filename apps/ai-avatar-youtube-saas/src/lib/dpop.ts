"use server";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const consumed = new Map<string, number>();

function cleanup() {
  const now = Date.now();
  for (const [nonce, expiresAt] of consumed.entries()) {
    if (now > expiresAt) {
      consumed.delete(nonce);
    }
  }
}

export async function createDpopChallenge() {
  const nonce = randomBytes(16).toString("hex");
  const proof = createHmac("sha256", env.DPOP_SECRET).update(nonce).digest("hex");
  return { nonce, proof };
}

export async function verifyDpopProof(nonce: string, proof: string) {
  cleanup();

  if (!nonce || !proof) return false;
  if (consumed.has(nonce)) return false;

  const expected = createHmac("sha256", env.DPOP_SECRET).update(nonce).digest("hex");
  const provided = Buffer.from(proof);
  const expectedBuf = Buffer.from(expected);

  if (provided.length !== expectedBuf.length) return false;
  if (!timingSafeEqual(provided, expectedBuf)) return false;

  consumed.set(nonce, Date.now() + NONCE_TTL_MS);
  return true;
}
