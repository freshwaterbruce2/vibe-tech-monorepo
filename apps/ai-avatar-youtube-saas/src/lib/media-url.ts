import { env } from "@/lib/env";

/**
 * SSRF guard for server-side media fetches.
 *
 * `videoUrl` / `output_url` values reach `fetch()` on the server (probe, chunk
 * download, publish). Without a guard a caller could point them at a local or
 * private-network endpoint. We allowlist the trusted storage origins instead of
 * trying to enumerate everything that must be blocked.
 */
function buildAllowlist(): { exact: Set<string>; suffixes: string[] } {
  const exact = new Set<string>(["storage.googleapis.com", "storage.cloud.google.com"]);
  const suffixes = [".storage.googleapis.com", ".googleusercontent.com"];

  if (env.GCS_BUCKET_NAME) {
    exact.add(`${env.GCS_BUCKET_NAME}.storage.googleapis.com`);
  }
  // The render worker writes outputs and is a trusted, operator-configured origin.
  for (const configured of [env.RENDER_WORKER_URL, env.NEXT_PUBLIC_APP_URL]) {
    try {
      exact.add(new URL(configured).hostname.toLowerCase());
    } catch {
      /* ignore malformed config */
    }
  }
  for (const raw of (process.env.ALLOWED_MEDIA_HOSTS ?? "").split(",")) {
    const host = raw.trim().toLowerCase();
    if (!host) continue;
    if (host.startsWith(".")) suffixes.push(host);
    else exact.add(host);
  }
  return { exact, suffixes };
}

const ALLOWLIST = buildAllowlist();

/**
 * Validate that `rawUrl` targets a trusted storage origin and return the parsed,
 * canonical URL string to fetch. Throws on anything not explicitly allowed so
 * tainted input can never drive a server-side request to an arbitrary host.
 */
export function assertAllowedMediaUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid media URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Unsupported media URL protocol");
  }
  const host = url.hostname.toLowerCase();
  const allowed =
    ALLOWLIST.exact.has(host) || ALLOWLIST.suffixes.some((suffix) => host.endsWith(suffix));
  if (!allowed) {
    throw new Error("Media URL host is not in the trusted allowlist");
  }
  return url.toString();
}
