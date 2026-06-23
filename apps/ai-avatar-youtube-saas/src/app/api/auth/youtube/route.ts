import { NextResponse, type NextRequest } from "next/server";
import {
  buildAuthUrl,
  encrypt,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  getCookieOptions,
  CODE_VERIFIER_COOKIE,
} from "@/lib/youtube-auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
  const authSecret = process.env.AUTH_SECRET;

  if (!clientId || !redirectUri || !authSecret) {
    return NextResponse.json(
      { error: "YouTube OAuth environment variables are not configured" },
      { status: 500 }
    );
  }

  if (clientId.length === 0 || redirectUri.length === 0 || authSecret.length < 32) {
    return NextResponse.json(
      { error: "Invalid YouTube OAuth configuration" },
      { status: 500 }
    );
  }

  // Optional: accept a return-to path so the UI can restore context after consent
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") ?? "/dashboard";

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Embed returnTo inside state so the callback can redirect back safely
  const statePayload = JSON.stringify({ nonce: state, returnTo });
  const encryptedVerifier = encrypt(codeVerifier, authSecret);

  const authUrl = buildAuthUrl({
    clientId,
    redirectUri,
    state: Buffer.from(statePayload).toString("base64url"),
    codeChallenge,
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(CODE_VERIFIER_COOKIE, encryptedVerifier, getCookieOptions(600));

  return response;
}
