"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidateTag } from "next/cache";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { verifyDpopProof } from "@/lib/dpop";
import { getBucket } from "@/lib/gcp";
import { initSchema, insertAvatarAsset } from "@/lib/db";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const URL_TTL_MS = 60 * 60 * 1000;

async function saveLocalAsset(file: File): Promise<{ url: string; path: string }> {
  const uploadDir = resolve(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256")
    .update(randomBytes(16))
    .update(buffer)
    .digest("hex");

  const ext = file.name.split(".").pop() ?? "webp";
  const fileName = `uploads/${hash}.${ext}`;
  const filePath = resolve(process.cwd(), "public", fileName);

  await writeFile(filePath, buffer);
  const url = `/${fileName}`;
  return { url, path: fileName };
}

async function saveGcsAsset(
  bucket: NonNullable<ReturnType<typeof getBucket>>,
  file: File
): Promise<{ url: string; path: string }> {
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

  return { url, path: fileName };
}

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
    try {
      const { url, path } = await saveLocalAsset(file);
      insertAvatarAsset({
        gcsPath: path,
        signedUrl: url,
        signedUrlExpires: Date.now() + URL_TTL_MS,
        mimeType: file.type ?? "image/webp",
      });
      revalidateTag("avatar-assets", "max");
      return { success: true, url, path };
    } catch (err) {
      return { success: false, error: `Local upload failed: ${String(err)}` };
    }
  }

  try {
    const { url, path } = await saveGcsAsset(bucket, file);
    insertAvatarAsset({
      gcsPath: path,
      signedUrl: url,
      signedUrlExpires: Date.now() + URL_TTL_MS,
      mimeType: "image/webp",
    });
    revalidateTag("avatar-assets", "max");
    return { success: true, url, path };
  } catch (err) {
    return { success: false, error: `GCS upload failed: ${String(err)}` };
  }
}
