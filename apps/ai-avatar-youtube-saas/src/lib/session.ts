import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const SEPARATOR = ".";

export function signSession(value: string): string {
  const signature = createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
  return `${value}${SEPARATOR}${signature}`;
}

export function unsignSession(signed: string): string | null {
  const lastIndex = signed.lastIndexOf(SEPARATOR);
  if (lastIndex === -1) return null;
  const value = signed.slice(0, lastIndex);
  const signature = signed.slice(lastIndex + 1);
  const expected = createHmac("sha256", env.AUTH_SECRET).update(value).digest("base64url");
  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expected, "base64url");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  return value;
}

export function generateState(): string {
  return randomBytes(32).toString("base64url");
}
