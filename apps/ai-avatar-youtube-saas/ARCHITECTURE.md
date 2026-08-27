# AI Avatar YouTube SaaS — Technical Architecture

This document describes the current implementation of the `ai-avatar-youtube-saas` application. It covers the browser-side 3D avatar preview, the server-side YouTube OAuth2 flow, the self-healing token refresh mechanism, and the resumable video upload pipeline.

## 1. System Overview

The application is a Next.js 16 App Router service that lets users:

1. Preview a Ready Player Me 3D avatar with real-time or offline lip-sync.
2. Connect a YouTube channel via OAuth2.
3. Publish rendered videos to that channel using a resumable, chunked upload protocol.

All server-side secrets and tokens are kept out of the client bundle. Tokens are encrypted with AES-256-GCM and stored in `httpOnly` cookies.

## 2. Frontend: 3D Avatar Preview

**File:** `src/components/ReadyPlayerMeAvatar.tsx`

The component renders a Ready Player Me GLB model inside a React Three Fiber canvas and drives facial morph targets from either:

- **Offline mode:** word-level timestamps from a Whisper subtitle alignment, mapped to Oculus visemes.
- **Real-time mode:** device microphone input analyzed through a WebAudio `AnalyserNode` with `fftSize=256`.

Key implementation details:

- The model URL is rewritten to append `?morphTargets=Oculus%20Visemes,mouthSmile,eyeBlinkLeft,eyeBlinkRight`, forcing the CDN to include the required blendshapes.
- All morph-target weights are normalized to the `0.0–1.0` range expected by glTFast.
- Viseme transitions use `THREE.MathUtils.lerp` to avoid mouth jitter.
- A procedural eye-blink coroutine runs on a randomized timer.
- The canvas listens for `webglcontextlost` and fires `onRenderCrash` so the UI can fall back to a 2D renderer.

## 3. YouTube OAuth2: Init and Callback

**Files:**

- `src/app/api/auth/youtube/route.ts`
- `src/app/api/auth/youtube/callback/route.ts`
- `src/lib/youtube-auth.ts`

The OAuth2 handshake uses PKCE (`S256`) with `access_type=offline` and `prompt=consent` to obtain a long-lived `refresh_token`.

Flow:

1. The init route generates a code verifier, encrypts it, and stores it in a short-lived `httpOnly` cookie (`yt_code_verifier`).
2. The user is redirected to Google's consent screen with a signed `state` parameter that includes a safe `returnTo` path.
3. The callback route validates `state`, decrypts the verifier, and exchanges the authorization code for tokens.
4. Tokens are encrypted and stored in the `yt_tokens` cookie, then the user is redirected back to the originating page.

Encryption is AES-256-GCM with a key derived from `AUTH_SECRET` via SHA-256.

## 4. Self-Healing Token Refresh

**File:** `src/lib/youtube-auth-utils.ts`

`getValidAccessToken(request, response)` decrypts the session cookie and returns a valid access token. If the token is within 5 minutes of expiring, it automatically calls Google's token endpoint with the stored `refresh_token`, encrypts the refreshed token set, and writes it back to the response cookie. This keeps the session alive without sending the user back through the consent screen.

## 5. Resumable YouTube Upload

**File:** `src/app/api/youtube/upload/route.ts`

The upload handler accepts a `POST` request with video metadata and a `videoUrl` pointing to the rendered asset (for example, a Google Cloud Storage signed URL).

Steps:

1. Probe the source with `HEAD` to obtain total size and MIME type.
2. POST metadata to `youtube/v3/videos?uploadType=resumable` to obtain a unique upload `Location`.
3. Stream the video in 10 MB chunks using HTTP `Range` requests.
4. PUT each chunk to the upload `Location` with `Content-Range` headers.
5. Retry failed source fetches or chunk uploads up to 3 times with exponential backoff.
6. Return the resulting YouTube `videoId`.

The metadata payload includes `selfDeclaredAlteredContent: true` at the top level of the video resource.

## 6. YPP / Altered Content Declaration

The upload route injects `selfDeclaredAlteredContent: true` into every video insert request. This is the programmatic equivalent of YouTube's "Altered content" label and should be used for videos that contain synthetic or materially altered visuals or audio. This is a transparency measure; it does not guarantee monetization eligibility or protect against policy violations on its own.

## 7. Security Boundaries

- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, and `AUTH_SECRET` are server-only environment variables.
- Tokens are never returned to the client in plaintext.
- OAuth `state` is signed and includes the `returnTo` path to prevent CSRF and open-redirect issues.
- PKCE verifier is bound to the cookie and cleared immediately after token exchange.
- Upload route requires a valid, decrypted session token.

## 8. Required Environment Variables

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:4300

# Database
APP_DB_PATH=D:\databases\ai-avatar-youtube-saas.db

# Google Cloud Storage
GCS_CREDENTIALS={}
GCS_BUCKET_NAME=vibetech-avatar-assets

# AI / Voice
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Render worker
RENDER_WORKER_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379/0

# YouTube OAuth
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REDIRECT_URI=http://localhost:4300/api/auth/youtube/callback

# Encryption
AUTH_SECRET=change-me-min-32-characters-long
DPOP_SECRET=change-me-min-32-characters-long
```

## 9. Build Configuration

The production build script uses Next.js 16's default bundler:

```json
"build": "next build"
```

## 10. Verification Status

- TypeScript type-checking passes (`pnpm run typecheck`).
- The implementation has not yet been verified against live Google OAuth2 or YouTube Data API endpoints.
- Before production deployment, run end-to-end tests covering: OAuth consent, token refresh, resumable upload interruption, and the `webglcontextlost` fallback path.
