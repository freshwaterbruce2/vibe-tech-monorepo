import { afterEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "../../services/httpClient";
import { resetRuntimeAuthForTests } from "../../services/runtimeAuth";
import type { InternalAxiosRequestConfig } from "axios";

describe("httpClient — HIGH #axios-dup fix", () => {
  afterEach(() => {
    resetRuntimeAuthForTests();
    vi.unstubAllEnvs();
    delete httpClient.defaults.adapter;
  });

  it("reads baseURL from VITE_API_URL", () => {
    expect(httpClient.defaults.baseURL).toBe(import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000");
  });
  it("has a 30s timeout", () => {
    expect(httpClient.defaults.timeout).toBe(30_000);
  });

  it("attaches the runtime API key on each request", async () => {
    vi.stubEnv("VITE_VIBE_JUSTICE_API_KEY", "runtime-test-key");
    resetRuntimeAuthForTests();
    let captured: InternalAxiosRequestConfig | undefined;
    httpClient.defaults.adapter = async (config) => {
      captured = config;
      return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config };
    };
    await httpClient.get("/health");
    expect(captured?.headers.get("X-API-Key")).toBe("runtime-test-key");
  });

  it("warns and rejects on 401 responses", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    httpClient.defaults.adapter = async (config) => {
      const error = Object.assign(new Error("Unauthorized"), {
        isAxiosError: true,
        config,
        response: { status: 401, data: {}, headers: {}, statusText: "Unauthorized", config },
      });
      throw error;
    };
    await expect(httpClient.get("/secure")).rejects.toBeTruthy();
    expect(warn).toHaveBeenCalledWith("[httpClient] 401 \u2014 backend auth failed");
    warn.mockRestore();
  });
});
