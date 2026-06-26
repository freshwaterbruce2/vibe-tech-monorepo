import { describe, expect, it } from "vitest";
import { createDpopChallenge, verifyDpopProof } from "./dpop";

describe("dpop", () => {
  it("creates a verifiable challenge", async () => {
    const challenge = await createDpopChallenge();
    expect(challenge.nonce).toBeTruthy();
    expect(challenge.proof).toBeTruthy();

    const valid = await verifyDpopProof(challenge.nonce, challenge.proof);
    expect(valid).toBe(true);
  });

  it("rejects an invalid proof", async () => {
    const challenge = await createDpopChallenge();
    const valid = await verifyDpopProof(challenge.nonce, "wrong-proof");
    expect(valid).toBe(false);
  });

  it("rejects replay of a consumed nonce", async () => {
    const challenge = await createDpopChallenge();
    await verifyDpopProof(challenge.nonce, challenge.proof);
    const replay = await verifyDpopProof(challenge.nonce, challenge.proof);
    expect(replay).toBe(false);
  });
});
