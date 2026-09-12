import { describe, it, expect, vi } from "vitest";
import { generateScript } from "./gemini";
import { VibeAIClient } from "@vibetech/ai-client";

describe("generateScript via Vibe AI Gateway", () => {
  it("successfully parses script returned by VibeAIClient", async () => {
    const mockPayload = {
      title: "Top 5 Space Facts",
      scenes: [
        {
          narration: "Space is completely silent.",
          visualKeywords: "deep space, stars, void",
          durationSeconds: 15,
        },
        {
          narration: "A day on Venus is longer than a year on Venus.",
          visualKeywords: "venus planet, atmosphere",
          durationSeconds: 15,
        },
      ],
      totalDurationSeconds: 30,
    };

    const mockClient = {
      generateText: vi.fn().mockResolvedValue(`\`\`\`json\n${JSON.stringify(mockPayload)}\n\`\`\``),
    } as unknown as VibeAIClient;

    const result = await generateScript("Space Facts", undefined, 30, mockClient);

    expect(result.title).toBe("Top 5 Space Facts");
    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[0].narration).toBe("Space is completely silent.");
    expect(result.totalDurationSeconds).toBe(30);
  });

  it("falls back to placeholder when gateway generation throws and firebase is unconfigured", async () => {
    const failingClient = {
      generateText: vi.fn().mockRejectedValue(new Error("Gateway connection timeout")),
    } as unknown as VibeAIClient;

    const result = await generateScript("Black Holes", undefined, 60, failingClient);

    expect(result.title).toBe("Placeholder: Black Holes");
    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0].narration).toContain("[PLACEHOLDER]");
  });

  it("successfully calls live Vibe AI Gateway when enabled", async () => {
    const realClient = new VibeAIClient({
      apiKey: "vibe_sk_avatar_test",
      baseURL: "https://vibe-ai-gateway-734857480460.us-east4.run.app",
    });

    const result = await generateScript("The Speed of Light", undefined, 30, realClient);

    expect(result.title).toBeTruthy();
    expect(result.scenes.length).toBeGreaterThan(0);
    expect(result.scenes[0].narration).toBeTruthy();
    expect(result.totalDurationSeconds).toBeGreaterThan(0);
  }, 30000);
});
