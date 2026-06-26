import { describe, expect, it } from "vitest";
import { dominantViseme } from "./dominantViseme";

describe("dominantViseme", () => {
  it("returns 0 when all weights are zero", () => {
    expect(dominantViseme({ viseme_O: 0, viseme_U: 0, viseme_aa: 0, viseme_E: 0 })).toBe(0);
  });

  it("selects the highest weighted viseme", () => {
    expect(dominantViseme({ viseme_O: 0.1, viseme_U: 0.2, viseme_aa: 0.5, viseme_E: 0.3 })).toBe(3);
    expect(dominantViseme({ viseme_O: 0.9, viseme_U: 0.1, viseme_aa: 0, viseme_E: 0 })).toBe(1);
    expect(dominantViseme({ viseme_O: 0, viseme_U: 0, viseme_aa: 0, viseme_E: 0.8 })).toBe(4);
  });
});
