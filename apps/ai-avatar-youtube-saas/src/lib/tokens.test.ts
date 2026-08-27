import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken } from "./tokens";

describe("token encryption", () => {
  it("round-trips a plain text token", () => {
    const plain = "ya29.a0Ae4lvC0_test_refresh_token";
    const encrypted = encryptToken(plain);
    expect(encrypted).not.toBe(plain);
    expect(decryptToken(encrypted)).toBe(plain);
  });

  it("produces different ciphertexts for the same input", () => {
    const plain = "same";
    const a = encryptToken(plain);
    const b = encryptToken(plain);
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(plain);
    expect(decryptToken(b)).toBe(plain);
  });

  it("throws on invalid cipher text", () => {
    expect(() => decryptToken("not-valid")).toThrow();
  });
});
