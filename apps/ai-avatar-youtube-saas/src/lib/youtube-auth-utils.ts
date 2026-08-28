import type { NextRequest, NextResponse } from "next/server";
import {
  decrypt,
  encrypt,
  getCookieOptions,
  TOKEN_COOKIE,
  type YouTubeTokens,
} from "@/lib/youtube-auth";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export interface TokenPair {
  accessToken: string;
  tokens: YouTubeTokens;
}

export async function refreshYouTubeTokens(refreshToken: string): Promise<YouTubeTokens> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing YouTube OAuth client credentials");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as Omit<YouTubeTokens, "obtained_at" | "refresh_token">;
  return {
    ...data,
    refresh_token: refreshToken,
    obtained_at: Date.now(),
  };
}

export function isTokenExpiringSoon(tokens: YouTubeTokens): boolean {
  const expiresAt = tokens.obtained_at + tokens.expires_in * 1000;
  return Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS;
}

export async function getValidAccessToken(
  request: NextRequest,
  response: NextResponse
): Promise<string> {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret || authSecret.length < 32) {
    throw new Error("AUTH_SECRET is not configured");
  }

  const encryptedTokens = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!encryptedTokens) {
    throw new Error("YouTube tokens not found in session");
  }

  let tokens: YouTubeTokens;
  try {
    tokens = JSON.parse(decrypt(encryptedTokens, authSecret)) as YouTubeTokens;
  } catch {
    throw new Error("Failed to decrypt YouTube tokens");
  }

  if (!tokens.access_token) {
    throw new Error("Invalid YouTube token payload");
  }

  if (!isTokenExpiringSoon(tokens)) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    throw new Error("Access token expired and no refresh token is available");
  }

  const refreshed = await refreshYouTubeTokens(tokens.refresh_token);
  const encryptedRefreshed = encrypt(JSON.stringify(refreshed), authSecret);
  response.cookies.set(TOKEN_COOKIE, encryptedRefreshed, getCookieOptions(60 * 60 * 24 * 30));

  return refreshed.access_token;
}
