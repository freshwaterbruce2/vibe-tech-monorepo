"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";

import { verifyDpopProof } from "@/lib/dpop";
import { getBucket } from "@/lib/gcp";
import { initSchema, insertAvatarAsset } from "@/lib/db";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const URL_TTL_MS = 60 * 60 * 1000;

export async function uploadAvatarAsset(formData: FormData) {
  initSchema();

  const file = formData.get("file") as File | null;
  const nonce = formData.get("dpop_nonce") as string | null;
  const proof = formData.get("dpop_proof") as string | null;

  if (!file || !nonce || !proof) {
    return { success: false, error: "Missing file or DPoP binding" };
  }

  const valid = await verifyDpopProof(nonce, proof);
  if (!valid) {
    return { success: false, error: "Invalid or expired DPoP proof" };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "File exceeds 10 MB limit" };
  }

  const bucket = getBucket();
  if (!bucket) {
    return { success: false, error: "GCS is not configured" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256")
    .update(randomBytes(16))
    .update(buffer)
    .digest("hex");
  const fileName = `avatars/${hash}.webp`;
  const blob = bucket.file(fileName);

  await blob.save(buffer, { private: true, contentType: "image/webp" });

  const [url] = await blob.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + URL_TTL_MS,
  });

  insertAvatarAsset({
    gcsPath: fileName,
    signedUrl: url,
    signedUrlExpires: Date.now() + URL_TTL_MS,
    mimeType: "image/webp",
  });

  revalidateTag("avatar-assets", "max");

  return { success: true, url, path: fileName };
}
