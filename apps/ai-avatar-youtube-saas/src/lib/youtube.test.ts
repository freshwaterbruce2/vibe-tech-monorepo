import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildYppDescription,
  exchangeCodeForTokens,
  getGoogleAuthUrl,
  refreshAccessToken,
  uploadVideo,
} from "./youtube";

describe("youtube helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds an auth URL with required params", () => {
    const url = getGoogleAuthUrl("test_state_123");
    const parsed = new URL(url);
    expect(parsed.hostname).toBe("accounts.google.com");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("state")).toBe("test_state_123");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("scope")).toContain("youtube.upload");
  });

  it("appends AI disclosure to description when requested", () => {
    const base = "Learn about AI avatars.";
    const result = buildYppDescription(base, true);
    expect(result).toContain(base);
    expect(result).toContain("synthetic media generated with AI");
  });

  it("leaves description unchanged when disclosure is off", () => {
    const base = "Just a normal description.";
    expect(buildYppDescription(base, false)).toBe(base);
  });

  it("exchanges a code for tokens", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "at", refresh_token: "rt", expires_in: 3600, token_type: "Bearer" }),
    });

    const tokens = await exchangeCodeForTokens("code123");
    expect(tokens.access_token).toBe("at");
    expect(tokens.refresh_token).toBe("rt");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("refreshes an access token", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "new_at", expires_in: 3600, token_type: "Bearer" }),
    });

    const tokens = await refreshAccessToken("rt");
    expect(tokens.access_token).toBe("new_at");
  });

  it("uploads a video via multipart", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "video123", status: { uploadStatus: "uploaded" } }),
    });

    const result = await uploadVideo({
      accessToken: "at",
      title: "Test",
      description: "desc",
      tags: ["ai", "avatar"],
      privacyStatus: "private",
      madeForKids: false,
      videoBuffer: Buffer.from("fake-video"),
    });

    expect(result.videoId).toBe("video123");
    expect(result.status).toBe("uploaded");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("uploadType=multipart"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer at" }),
      })
    );
  });
});
