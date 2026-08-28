import { describe, expect, it } from "vitest";
import { httpClient } from "../../services/httpClient";

describe("httpClient — HIGH #axios-dup fix", () => {
  it("reads baseURL from VITE_API_URL", () => {
    expect(httpClient.defaults.baseURL).toBe(import.meta.env.VITE_API_URL ?? "http://localhost:8000");
  });
  it("has a 30s timeout", () => {
    expect(httpClient.defaults.timeout).toBe(30_000);
  });
});
