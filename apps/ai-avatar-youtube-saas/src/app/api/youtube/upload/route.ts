import { NextResponse, type NextRequest } from "next/server";
import { getValidAccessToken } from "@/lib/youtube-auth-utils";
import { MEDIA_HOST_ALLOWLIST } from "@/lib/media-url";

export const runtime = "nodejs";

const YOUTUBE_UPLOAD_ENDPOINT =
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status";
const CHUNK_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

interface UploadRequestBody {
  videoUrl: string;
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: "private" | "unlisted" | "public";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const response = new NextResponse();

  try {
    const body = (await request.json()) as UploadRequestBody;

    if (!body.videoUrl || typeof body.videoUrl !== "string") {
      return jsonError("videoUrl is required", 400);
    }
    if (!body.title || typeof body.title !== "string") {
      return jsonError("title is required", 400);
    }

    const accessToken = await getValidAccessToken(request, response);
    const { contentType, contentLength } = await probeVideoSource(body.videoUrl);

    if (!contentLength || contentLength <= 0) {
      return jsonError("Could not determine video content length", 400);
    }

    const uploadLocation = await initiateResumableUpload(
      accessToken,
      body,
      contentLength,
      contentType
    );

    const videoId = await uploadVideoInChunks(
      uploadLocation,
      body.videoUrl,
      contentLength,
      contentType
    );

    const successResponse = NextResponse.json({ success: true, videoId });
    propagateCookies(response, successResponse);
    return successResponse;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const errorResponse = NextResponse.json({ error: message }, { status: 500 });
    propagateCookies(response, errorResponse);
    return errorResponse;
  }
}

async function probeVideoSource(videoUrl: string): Promise<{
  contentType: string;
  contentLength: number | null;
}> {
  // SSRF guard: only request trusted storage hosts, never arbitrary endpoints.
  const target = new URL(videoUrl);
  const host = target.hostname.toLowerCase();
  const allowed =
    MEDIA_HOST_ALLOWLIST.exact.has(host) ||
    MEDIA_HOST_ALLOWLIST.suffixes.some((suffix) => host.endsWith(suffix));
  if (!allowed) {
    throw new Error("Media URL host is not in the trusted allowlist");
  }
  const headResponse = await fetch(target, { method: "HEAD" });
  if (!headResponse.ok) {
    throw new Error(`Failed to probe video source: ${headResponse.status}`);
  }
  const contentType = headResponse.headers.get("content-type") || "video/mp4";
  const contentLength = headResponse.headers.get("content-length");
  return {
    contentType,
    contentLength: contentLength ? Number.parseInt(contentLength, 10) : null,
  };
}

async function initiateResumableUpload(
  accessToken: string,
  body: UploadRequestBody,
  contentLength: number,
  contentType: string
): Promise<string> {
  const metadata = {
    snippet: {
      title: body.title,
      description: body.description || "",
      tags: body.tags || [],
      categoryId: body.categoryId || "22", // People & Blogs default
    },
    status: {
      privacyStatus: body.privacyStatus || "private",
      selfDeclaredMadeForKids: false,
    },
    selfDeclaredAlteredContent: true,
  };

  const initResponse = await fetch(YOUTUBE_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Upload-Content-Length": String(contentLength),
      "X-Upload-Content-Type": contentType,
    },
    body: JSON.stringify(metadata),
  });

  if (!initResponse.ok) {
    const text = await initResponse.text();
    throw new Error(`Resumable upload initiation failed: ${initResponse.status} ${text}`);
  }

  const location = initResponse.headers.get("Location");
  if (!location) {
    throw new Error("Resumable upload initiation did not return a Location header");
  }

  return location;
}

async function uploadVideoInChunks(
  uploadLocation: string,
  videoUrl: string,
  totalLength: number,
  contentType: string
): Promise<string> {
  for (let start = 0; start < totalLength; start += CHUNK_SIZE_BYTES) {
    const end = Math.min(start + CHUNK_SIZE_BYTES - 1, totalLength - 1);
    const chunk = await withRetry(() => fetchChunk(videoUrl, start, end, contentType), `fetch chunk ${start}-${end}`);

    const chunkResponse = await withRetry(
      async () => {
        const response = await fetch(uploadLocation, {
          method: "PUT",
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${totalLength}`,
          },
          body: chunk,
        });

        if (!response.ok && response.status !== 308) {
          const text = await response.text();
          throw new Error(`Chunk upload failed (${start}-${end}): ${response.status} ${text}`);
        }

        return response;
      },
      `upload chunk ${start}-${end}`
    );

    if (end === totalLength - 1) {
      const result = (await chunkResponse.json()) as { id?: string };
      if (!result.id) {
        throw new Error("Upload completed but no video ID was returned");
      }
      return result.id;
    }
  }

  throw new Error("Upload loop completed without returning a video ID");
}

async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_RETRY_DELAY_MS * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`${context} failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

async function fetchChunk(videoUrl: string, start: number, end: number, contentType: string): Promise<Blob> {
  // SSRF guard: only request trusted storage hosts, never arbitrary endpoints.
  const target = new URL(videoUrl);
  const host = target.hostname.toLowerCase();
  const allowed =
    MEDIA_HOST_ALLOWLIST.exact.has(host) ||
    MEDIA_HOST_ALLOWLIST.suffixes.some((suffix) => host.endsWith(suffix));
  if (!allowed) {
    throw new Error("Media URL host is not in the trusted allowlist");
  }
  const response = await fetch(target, {
    headers: { Range: `bytes=${start}-${end}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chunk ${start}-${end}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Blob([arrayBuffer], { type: contentType });
}

function propagateCookies(source: NextResponse, target: NextResponse): void {
  const setCookie = source.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookie) {
    target.headers.append("Set-Cookie", cookie);
  }
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
