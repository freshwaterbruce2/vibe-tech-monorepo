import { describe, expect, it, vi } from "vitest";

process.env.DPOP_SECRET = "a-very-secret-key-that-is-long-enough-for-hmac256";
process.env.GCS_CREDENTIALS = JSON.stringify({ type: "service_account", project_id: "test" });
process.env.GCS_BUCKET_NAME = "test-bucket";

const saveMock = vi.fn();
const getSignedUrlMock = vi.fn();
const fileMock = vi.fn(() => ({ save: saveMock, getSignedUrl: getSignedUrlMock }));
const bucketMock = vi.fn(() => ({ file: fileMock }));

class MockStorage {
  bucket = bucketMock;
}

vi.mock("@google-cloud/storage", () => ({
  Storage: MockStorage,
}));

vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/db", async () => {
  return {
    initSchema: vi.fn(),
    insertAvatarAsset: vi.fn(),
  };
});

const { createDpopChallenge } = await import("@/lib/dpop");
const { uploadAvatarAsset } = await import("./upload");

describe("uploadAvatarAsset", () => {
  it("rejects missing file", async () => {
    const form = new FormData();
    form.append("dpop_nonce", "n");
    form.append("dpop_proof", "p");
    const res = await uploadAvatarAsset(form);
    expect(res.success).toBe(false);
    expect(res.error).toContain("Missing");
  });

  it("rejects invalid dpop proof", async () => {
    const form = new FormData();
    const file = new File(["pixels"], "avatar.jpg", { type: "image/jpeg" });
    form.append("file", file);
    form.append("dpop_nonce", "n");
    form.append("dpop_proof", "p");
    const res = await uploadAvatarAsset(form);
    expect(res.success).toBe(false);
    expect(res.error).toContain("DPoP");
  });

  it("uploads when configured and proof is valid", async () => {
    const challenge = await createDpopChallenge();
    getSignedUrlMock.mockResolvedValue(["https://signed.url/avatar.webp"]);

    const form = new FormData();
    const file = new File(["pixels"], "avatar.jpg", { type: "image/jpeg" });
    form.append("file", file);
    form.append("dpop_nonce", challenge.nonce);
    form.append("dpop_proof", challenge.proof);

    const res = await uploadAvatarAsset(form);
    expect(res.success).toBe(true);
    expect(res.url).toBe("https://signed.url/avatar.webp");
    expect(res.path).toMatch(/^avatars\/[a-f0-9]+\.webp$/);
    expect(saveMock).toHaveBeenCalled();
  });
});
