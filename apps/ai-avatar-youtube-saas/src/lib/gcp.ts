import { Storage } from "@google-cloud/storage";
import { env } from "@/lib/env";

let storage: Storage | undefined;
let bucket: ReturnType<Storage["bucket"]> | undefined;

function initBucket() {
  if (bucket) return bucket;

  const credentialsRaw = process.env.GCS_CREDENTIALS ?? env.GCS_CREDENTIALS;
  if (!credentialsRaw || credentialsRaw === "{}") {
    return undefined;
  }

  let credentials: object;
  try {
    credentials = JSON.parse(credentialsRaw);
  } catch {
    return undefined;
  }

  const bucketName = process.env.GCS_BUCKET_NAME ?? env.GCS_BUCKET_NAME;
  storage = new Storage({ credentials });
  bucket = storage.bucket(bucketName);
  return bucket;
}

export function getBucket() {
  return initBucket();
}
