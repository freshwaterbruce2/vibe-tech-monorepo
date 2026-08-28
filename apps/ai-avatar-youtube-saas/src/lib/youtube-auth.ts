import crypto from "node:crypto";

export interface YouTubeTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  obtained_at: number;
}

const YOUTUBE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const YOUTUBE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CODE_VERIFIER_COOKIE = "yt_code_verifier";
const TOKEN_COOKIE = "yt_tokens";

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encrypt(text: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${authTag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decrypt(encryptedText: string, secret: string): string {
  const key = deriveKey(secret);
  const [ivB64, authTagB64, cipherB64] = encryptedText.split(".");
  if (!ivB64 || !authTagB64 || !cipherB64) {
    throw new Error("Invalid encrypted payload format");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const authTag = Buffer.from(authTagB64, "base64url");
  const cipher = Buffer.from(cipherB64, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString("utf8");
}

export function generateCodeVerifier(): string {
  const bytes = crypto.randomBytes(64);
  return bytes
    .toString("base64url")
    .replace(/[^A-Za-z0-9-._~]/g, "")
    .slice(0, 128);
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function generateState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function getCookieOptions(maxAgeSeconds: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function buildAuthUrl({
  clientId,
  redirectUri,
  state,
  codeChallenge,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ].join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });
  return `${YOUTUBE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeCodeForTokens({
  code,
  codeVerifier,
  clientId,
  clientSecret,
  redirectUri,
}: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<YouTubeTokens> {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });

  const response = await fetch(YOUTUBE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorBody}`);
  }

  const data = (await response.json()) as Omit<YouTubeTokens, "obtained_at">;
  return { ...data, obtained_at: Date.now() };
}

export { CODE_VERIFIER_COOKIE, TOKEN_COOKIE };
