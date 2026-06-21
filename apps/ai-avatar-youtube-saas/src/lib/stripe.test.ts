import { describe, expect, it } from "vitest";
import { getCreditsForTier, getPlanKeyFromPriceId, PLAN_TIERS } from "./stripe";

describe("stripe tier mapping", () => {
  it("maps known price IDs to plan keys", () => {
    expect(getPlanKeyFromPriceId(PLAN_TIERS.startup.priceId)).toBe("startup");
    expect(getPlanKeyFromPriceId(PLAN_TIERS.growth.priceId)).toBe("growth");
    expect(getPlanKeyFromPriceId(PLAN_TIERS.saas_scale.priceId)).toBe("saas_scale");
  });

  it("returns hobby for unknown price IDs", () => {
    expect(getPlanKeyFromPriceId("price_unknown")).toBe("hobby");
  });

  it("returns the correct credit quota for each tier", () => {
    expect(getCreditsForTier("hobby")).toBe(10);
    expect(getCreditsForTier("startup")).toBe(100);
    expect(getCreditsForTier("growth")).toBe(500);
    expect(getCreditsForTier("saas_scale")).toBe(2500);
  });
});
