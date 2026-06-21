import { NextResponse, type NextRequest } from "next/server";
import {
  decrypt,
  encrypt,
  exchangeCodeForTokens,
  getCookieOptions,
  CODE_VERIFIER_COOKIE,
  TOKEN_COOKIE,
} from "@/lib/youtube-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  const authSecret = process.env.AUTH_SECRET;

  if (!clientId || !clientSecret || !redirectUri || !authSecret) {
    return NextResponse.json(
      { error: "YouTube OAuth environment variables are not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const baseUrl = new URL(request.url).origin;

  if (error) {
    return redirectWithError(baseUrl, "oauth_denied", error);
  }

  if (!code || !state) {
    return redirectWithError(baseUrl, "invalid_callback", "Missing authorization code or state");
  }

  let returnTo = "/dashboard";
  try {
    const statePayload = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (typeof statePayload.returnTo === "string" && statePayload.returnTo.startsWith("/")) {
      returnTo = statePayload.returnTo;
    }
  } catch {
    return redirectWithError(baseUrl, "invalid_state", "State parameter is malformed");
  }

  const encryptedVerifier = request.cookies.get(CODE_VERIFIER_COOKIE)?.value;
  if (!encryptedVerifier) {
    return redirectWithError(baseUrl, "missing_verifier", "PKCE code verifier cookie is missing");
  }

  let codeVerifier: string;
  try {
    codeVerifier = decrypt(encryptedVerifier, authSecret);
  } catch {
    return redirectWithError(baseUrl, "verifier_decrypt_failed", "Could not verify PKCE challenge");
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });

    const encryptedTokens = encrypt(JSON.stringify(tokens), authSecret);
    const response = NextResponse.redirect(new URL(returnTo, request.url));

    // Persist encrypted tokens in an httpOnly cookie
    response.cookies.set(TOKEN_COOKIE, encryptedTokens, getCookieOptions(60 * 60 * 24 * 30));
    // Clear the short-lived verifier cookie immediately
    response.cookies.set(CODE_VERIFIER_COOKIE, "", { ...getCookieOptions(0), maxAge: 0 });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token exchange failed";
    return redirectWithError(baseUrl, "token_exchange_failed", message);
  }
}

function redirectWithError(baseUrl: string, code: string, message: string): NextResponse {
  const url = new URL("/dashboard/youtube-error", baseUrl);
  url.searchParams.set("code", code);
  url.searchParams.set("message", encodeURIComponent(message));
  return NextResponse.redirect(url);
}
