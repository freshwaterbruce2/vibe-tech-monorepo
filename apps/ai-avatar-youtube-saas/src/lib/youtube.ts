import { env } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/tokens";
import { getOAuthToken, upsertOAuthToken } from "@/lib/db";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const YOUTUBE_UPLOAD_ENDPOINT = "https://www.googleapis.com/upload/youtube/v3/videos";

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface YouTubeUploadResult {
  videoId: string;
  status: string;
}

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.YOUTUBE_CLIENT_ID ?? "",
    redirect_uri: env.YOUTUBE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/youtube.upload",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: env.YOUTUBE_CLIENT_ID ?? "",
    client_secret: env.YOUTUBE_CLIENT_SECRET ?? "",
    redirect_uri: env.YOUTUBE_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.YOUTUBE_CLIENT_ID ?? "",
    client_secret: env.YOUTUBE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  return (await res.json()) as TokenResponse;
}

export async function getValidAccessToken(userId: string): Promise<string> {
  const row = getOAuthToken("youtube", userId);
  if (!row) {
    throw new Error("YouTube account is not connected");
  }

  const accessToken = decryptToken(row.access_token_encrypted);
  const refreshTokenEncrypted = row.refresh_token_encrypted;

  if (row.expires_at > Date.now() + 60_000) {
    return accessToken;
  }

  if (!refreshTokenEncrypted) {
    throw new Error("YouTube token expired and no refresh token is available");
  }

  const refreshToken = decryptToken(refreshTokenEncrypted);
  const tokens = await refreshAccessToken(refreshToken);
  const newAccessToken = tokens.access_token;
  const newRefreshToken = tokens.refresh_token ?? refreshToken;
  const expiresAt = Date.now() + tokens.expires_in * 1000;

  upsertOAuthToken({
    provider: "youtube",
    userId,
    accessTokenEncrypted: encryptToken(newAccessToken),
    refreshTokenEncrypted: encryptToken(newRefreshToken),
    expiresAt,
  });

  return newAccessToken;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Userinfo failed: ${res.status} ${text}`);
  }
  return (await res.json()) as GoogleUserInfo;
}

export function buildYppDescription(baseDescription: string, aiDisclosure: boolean): string {
  if (!aiDisclosure) return baseDescription;
  const disclosure =
    "\n\n—\nThis video includes synthetic media generated with AI. " +
    "All likenesses and voices are generated or manipulated and are clearly labeled in accordance with the YouTube Partner Program.";
  return `${baseDescription.trim()}${disclosure}`;
}

interface UploadVideoOptions {
  accessToken: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: "private" | "unlisted" | "public";
  madeForKids: boolean;
  videoBuffer: Buffer;
}

export async function uploadVideo(options: UploadVideoOptions): Promise<YouTubeUploadResult> {
  const { accessToken, title, description, tags, privacyStatus, madeForKids, videoBuffer } = options;
  const boundary = `----yt_upload_${Date.now()}`;

  const metadata = JSON.stringify({
    snippet: {
      title: title.slice(0, 100),
      description,
      tags: tags.slice(0, 500),
      categoryId: "22",
      defaultLanguage: "en",
      defaultAudioLanguage: "en",
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: madeForKids,
      embeddable: true,
      license: "youtube",
    },
  });

  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    "utf8"
  );
  const videoPartHeader = Buffer.from(
    `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`,
    "utf8"
  );
  const closing = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");

  const body = Buffer.concat([metadataPart, videoPartHeader, videoBuffer, closing]);

  const res = await fetch(`${YOUTUBE_UPLOAD_ENDPOINT}?uploadType=multipart&part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube upload failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { id: string; status: { uploadStatus: string } };
  return { videoId: data.id, status: data.status.uploadStatus };
}
