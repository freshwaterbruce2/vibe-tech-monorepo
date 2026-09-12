# Active Context

## Current Task

Vibe Tutor v1.5.18 Release Hardening & Workflow Optimization Blueprint (2026-09-11).

## Status

- Persistent memory system is available through repository-maintained tooling
- File-based Memory Bank at `memory-bank/` for high-level context
- **Vibe Tutor v1.5.18 Release Candidate Verified on Physical Samsung A54 (2026-09-11)**:
  - Designed, decomposed, compiled, and verified release candidate for **v1.5.18** featuring rich math formatting (KaTeX) and formatted code cards with copy buttons.
  - Successfully verified end-to-end on physical Samsung SM-A546U1 (`R5CW60X0PHT`) via Chrome DevTools Protocol (CDP) and automated port forwarding.
  - Verified backend security: unauthorized or sideloaded APKs fail closed against Play Integrity checks on Cloud Run without exposing backend resources or OpenRouter credits.
  - Implemented and fully verified all 5 blueprint items in the codebase:
    1. Dev-mode seams in debug builds (`config.ts` local proxy fallback / dev banner, `package.json` `dev:bridge`).
    2. Differentiated UI error messages (distinguishing 401 Play license rejections from quiet hours and 503 capacity issues, with distinct calm styling).
    3. Developer bypass for parental controls (quiet hours & screen time limits 1-hour bypass toggle in Parent Zone `ScreenTimeSettings.tsx` / debug mode in `usageMonitor.ts`).
    4. One-command on-device smoke test (`pnpm run test:device` via maintained `scripts/device-smoke-test.mjs` verifying hardware identity, port forwarding, prompts, code card assertion, and screenshot capture).
    5. Automated version-code allowlist deployment pipeline in `scripts/ship-release.ps1` staging Cloud Run payloads in `docs/release-readiness/cloud-run-staged-<versionCode>.json`.
  - Documented in `apps/vibe-tutor/docs/LESSONS-LEARNED.md`.
- **InvoiceFlow AI Smart-Drafting Frontend Wired & Live Railway Deployment Verified (2026-09-11)**:
  - Built `SmartDraftModal.tsx` with Tone Selector (`friendly`, `firm`, `urgent`, `final_notice`), custom instructions prompt, live AI Gateway draft preview, editable Subject & Body, "Copy Text" button, "Open in Mail App (mailto)" fallback, and "Send Reminder" button.
  - Integrated 1-click "Generate AI Payment Reminder" button on overdue invoices and "AI Reminder Draft" option on all sent invoices in `Dashboard.tsx`.
  - Created client service `src/services/dunningService.ts`.
  - Implemented backend endpoint `POST /api/dunning/send-reminder` in `server/src/routes/dunningRoutes.ts` with `sendDraftReminder` in `server/src/email/send.ts`.
  - Added unit and fake-db route tests; all 19 dunning & gateway tests pass cleanly (100% pass). Verified clean TypeScript (`npm run typecheck`, `npm run build:api`) and frontend Vite build (`npm run build`).
  - Created secret-safe snapshot at `C:\projects\_vibe-snapshots\vibe-invoice-smart-draft-ui-20260911-094700`.
  - Configured Railway production environment variables `VIBE_AI_GATEWAY_URL` and `VIBE_AI_GATEWAY_KEY` (`vibe_sk_invoiceflow_prod`).
  - Successfully deployed container to Railway via `railway up --detach` (deployment `4f6255af-2f3e-430d-8d8a-9329d6238826` reached `SUCCESS`).
  - Verified live health check (`GET /api/health` -> HTTP 200) and verified custom domain `https://invoiceflow.vibe-tech.org/api/health` (HTTP 200).
  - Executed live smoke test against production `POST /api/dunning/smart-draft` with session auth — returned HTTP 200 with structured dunning draft routed live via the Universal AI Gateway (`fallbackUsed: false`).
- **Universal Vibe AI Gateway & Multi-App Expansion (2026-09-10)**:
  - **Universal AI Gateway Live on Cloud Run**:
    - Service: `vibe-ai-gateway` in project `vibe-tutor-501213` (region `us-east4`).
    - Endpoint: `https://vibe-ai-gateway-734857480460.us-east4.run.app`.
    - Primary: DeepSeek V3 (`deepseek/deepseek-chat`) @ $0.14/M tokens with strict 10s timeout.
    - Fallback: Google Gemini 3.7 Flash (`google/gemini-3.7-flash`) with Zero Data Retention (ZDR).
    - Verified Cloud Run logs: 100% request success rate on valid POST completions, automatic seamless failover to Gemini when DeepSeek times out.
  - **Universal SDK (`@vibetech/ai-client`)**:
    - Package: `@vibetech/ai-client` built, strictly typed, and tested with zero external dependencies.
    - Exported `VibeAIClient` with `generateText()`, `createChatCompletion()`, and `checkHealth()`.
  - **AI Avatar YouTube Studio (`apps/ai-avatar-youtube-saas`) Deployed & Live Verified**:
    - Vendored `@vibetech/ai-client` into `src/shared/ai-client/` with `tsconfig.json` and `vitest.config.mts` path mappings, resolving container `npm install` errors.
    - Set environment variables `VIBE_AI_GATEWAY_URL` and `VIBE_AI_GATEWAY_KEY` (`vibe_sk_avatar_prod`) on Railway production service `ai-avatar-studio`.
    - Successfully deployed container to Railway (deployment ID `8c70e800-4878-474e-ab8c-626d884c9f7b` reached `SUCCESS`).
    - Verified live healthcheck (`/api/health` -> HTTP 200).
    - Smoke tested live video script generation endpoint `POST /api/ai/script` — returned HTTP 200 with structured multi-scene script routed via the AI Gateway.
  - **InvoiceFlow (`apps/vibe-invoice`) Wired to AI Gateway**:
    - Added `@vibetech/ai-client` to `package.json` dependencies and vendored under `server/src/shared/ai-client/`.
    - Implemented `server/src/clients/aiGateway.ts` with `draftPaymentReminder`, tone inference (`friendly`, `firm`, `urgent`, `final_notice`), and resilient deterministic template fallback.
    - Added authenticated endpoint `POST /api/dunning/smart-draft` in `server/src/routes/dunningRoutes.ts` with SQLite invoice lookup, overdue days calculation, and audit logging.
    - Created unit tests (`server/src/clients/aiGateway.test.ts`, 5/5 passed), fake-db route tests (`server/src/routes/dunningRoutes.fake-db.test.ts`, 8/8 passed), and real SQLite integration tests (`server/src/routes/dunningRoutes.test.ts`, 3/3 passed).
    - Verified clean TypeScript compilation (`npm run build:api`, `npm run typecheck`), frontend build (`npm run build`), and executed a successful live round-trip through the AI Gateway.
  - **Secret-Safe Snapshot**: Verified at `C:\projects\_vibe-snapshots\ai-gateway-expansion-preedit-20260910-201500`.
- **Square Payment Engine Standardized on Web SaaS**:
  - Reused and adapted the production-tested Square engine from `apps/vibe-shipping` (`SquareClient`, checkout links, HMAC-SHA256 webhooks).
  - **InvoiceFlow (`apps/vibe-invoice`)**:
    - Created `server/src/payments/squarePaymentService.ts` & `squareAdapter.ts`.
    - Added Square checkout session creation to `/api/public/invoices/:id/checkout-session`.
    - Implemented idempotent signed webhook handler at `/api/webhooks/square` with `square_events` deduplication table.
    - Updated UI `PaymentForm.tsx` to "Pay with Square".
    - Added comprehensive unit test suite `server/src/routes/squareWebhook.test.ts` (100% pass: missing headers, invalid sigs, payment completion fulfillment, duplicate idempotency).
    - Verified server TypeScript build (`npm run build:api`), client Vite build (`npm run build`), and diagnostics pass cleanly.
  - **AI Avatar YouTube Studio (`apps/ai-avatar-youtube-saas`)**:
    - Created `src/lib/square.ts` supporting Startup Pro ($19/mo, 100 credits), Growth Channel ($49/mo, 500 credits), SaaS Scale ($199/mo, 2500 credits).
    - Added signed Square webhook route `/api/webhooks/square` updating `subscriptions` table and crediting user video quotas.
    - Updated server action `createCheckoutSessionAction` in `src/app/actions/billing.ts` to generate Square payment links when configured.
    - Added unit tests `src/app/api/webhooks/square/route.test.ts` (100% pass, 39/39 passing vitest suite).
    - Typecheck passed cleanly (`npx tsc --noEmit`).
- **Railway Production Deployments Verified (Live with Square Engine)**:
  - **InvoiceFlow (`apps/vibe-invoice`)**: Fresh deployment `20143900-7d79-4735-aa4f-1227361a4d16` reached terminal `SUCCESS`. Live healthcheck verified (`https://invoiceflow-production-86e9.up.railway.app/api/health` returned `{"ok":true}`). Square webhook `/api/webhooks/square` verified live and rejecting unsigned payloads with HTTP 400 (`Missing x-square-hmacsha256-signature header`).
  - **AI Avatar YouTube Studio (`apps/ai-avatar-youtube-saas`)**: Fresh deployment `f5a25f15-20db-4610-b4b5-009e67652234` reached terminal `SUCCESS`. Live healthcheck verified (`https://ai-avatar-studio-production.up.railway.app/api/health` returned `{"status":"ok","service":"ai-avatar-youtube-saas"}`). Square webhook `/api/webhooks/square` verified live and safely returning `"Square webhook secret unconfigured"`.
  - **Square Production Credentials Status**: Confirmed `SQUARE_ENVIRONMENT=production` is set on both services. Bruce has not yet injected `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, and `SQUARE_WEBHOOK_SECRET` into Railway.
  - **Custom Domain Status**: `invoiceflow.vibe-tech.org` status checked on Railway (`CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP`, `Verified: no`). Cloudflare DNS check confirmed CNAME (`invoiceflow` -> `l7kkzqu9.up.railway.app`) is pending creation by Bruce.
- **Google Play Billing via RevenueCat & Release Pipeline**:
  - Installed `@revenuecat/purchases-capacitor` in `chess-master`.
  - Created `src/lib/billing/revenueCatProvider.ts` integrating RevenueCat SDK with fail-closed secure purchase handling and restore verification.
  - Mapped catalog items (`chessmaster_piece_010`, `chessmaster_board_004`) to RevenueCat offerings.
  - Verified `validate:billing` test suite (`scripts/validate-billing.ts`) and full typecheck (`pnpm run typecheck`) pass 100%.
  - Re-verified full test suite (`pnpm test`) across all 19 validators (100% pass).
  - Resolved Gradle offline dependency caching for RevenueCat Capacitor plugin; full `android-delivery.mjs verify` passed 100% (run `2026-09-08T23-00-18-081Z-d2aa28fc-367`).
  - **Version Bump & Official Release Candidate**: Bruce authorized bumping to `versionCode 3` / `versionName 1.0.2` (snapshot `C:\projects\_vibe-snapshots\chess-master-versionbump-20260908-210700`). Built official `bundleRelease` signed with upload keystore (`keystore.properties`).
  - **Official Release Inspection**: Executed `release-report.mjs inspect` (run `2026-09-09T01-09-17-798Z-60ad1f6b-615`): 100% passed (11/11 checks pass). Manifest verified: `com.vibetech.chessmaster`, `versionCode: 3`, `versionName: "1.0.2"`, `targetSdk: 36`. Branding verified: "Vibe Chess". Upload signer verified (SHA-256 fingerprint `912D0270E3BDE7DAF7EDF57B3E80C504DD3A0226D108EF6D53324CA3CFD6633E`). Candidate artifact: `android/app/build/outputs/bundle/release/app-release.aab` (SHA-256 `6be5de4e04332c49db7c6b79f64e2da9cfb70c54efba3f336dfa8794c24b9dc6`, 44,616,316 bytes).
  - Preserved boundary for `Vibe-Tutor` per `PRODUCT_BOUNDARIES.md` freeze rules.
- **YouTube Growth Marketing Engine Activated (2026-09-09)**:
  - Authored truth-audited marketing drafts in `C:\projects\YOUTUBE_GROWTH.md`.
  - Automated physical recording of **Vibe Tutor Short 1** via `phone-harness` directly on authorized Samsung A54 (`R5CW60X0PHT`). Muxed SAPI voiceover + captions into `C:\projects\outputs\vibe_tutor_short_final.mp4`.
  - Automated physical recording of **Vibe Chess Short 1** via `phone-harness` on A54 showcasing crystal 3D board, custom minimax AI, 14 lessons, and daily puzzles. Muxed SAPI voiceover + captions into `C:\projects\outputs\vibe_chess_short_final.mp4`.
  - Created ready-to-publish production packages (`TUTOR_SHORT_1_PACKAGE.md` and `CHESS_SHORT_1_PACKAGE.md`) in `C:\projects\outputs\`.
  - Documented durable engineering & marketing standards in `C:\projects\OPERATING_PLAYBOOK_AND_LEARNINGS.md`.
  - **Channel top-to-bottom pack (continued)**: Generated updated VT profile logo + branded banner; checklist at `C:\projects\outputs\youtube-channel\CHANNEL_SETUP_TOP_TO_BOTTOM.md`. Correct channel is **Vibe Tech @VibeTechLLC** (not Beyond The Veil). Cursor IDE browser MCP unavailable in forked session — Studio opened in system browser for Bruce apply.
- **Secret-Safe Snapshots**:
  - Pre-edit snapshot created and verified at `C:\projects\_vibe-snapshots\square-revenuecat-preedit-20260908-165500`.
  - Version bump snapshot created and verified at `C:\projects\_vibe-snapshots\chess-master-versionbump-20260908-210700`.

## Next Steps

1. **YouTube (now)**: On **Vibe Tech @VibeTechLLC**, apply `C:\projects\outputs\youtube-channel\CHANNEL_SETUP_TOP_TO_BOTTOM.md` — upload PRIMARY logo + banner, Basic info, then Tutor + Chess Shorts with pinned comments.
2. Bruce to input Square production credentials (`SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_WEBHOOK_SECRET`) into Railway variables for `invoiceflow` and `ai-avatar-studio`.
3. Bruce to add CNAME record for `invoiceflow.vibe-tech.org` pointing to `l7kkzqu9.up.railway.app` in Cloudflare DNS (and optional TXT `_railway-verify.invoiceflow`).
4. Chess Play: Hold **Send for review** on v1.0.2 / code 3 until Bruce or Nova names it.

## Blockers

None.
