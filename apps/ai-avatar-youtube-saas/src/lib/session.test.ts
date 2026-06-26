import { describe, expect, it } from "vitest";
import { generateState, signSession, unsignSession } from "./session";

describe("session signing", () => {
  it("round-trips a signed value", () => {
    const value = "user_123";
    const signed = signSession(value);
    expect(signed).toContain(".");
    expect(unsignSession(signed)).toBe(value);
  });

  it("rejects tampered signatures", () => {
    const signed = signSession("user_123");
    const tampered = signed.replace("user_123", "user_999");
    expect(unsignSession(tampered)).toBeNull();
  });

  it("rejects missing separator", () => {
    expect(unsignSession("noseparator")).toBeNull();
  });

  it("generates unique states", () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });
});
