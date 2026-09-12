# Session Handoff & Continuation Prompt

**Generated**: 2026-09-08T23:15:00.000Z  
**Session**: unified-monetization-square-revenuecat-execution-20260908

## Copy-Pasteable Continuation Prompt for Next Session

```markdown
# Session Continuation: Production Credentials, DNS Verification & Google Play Production Candidate Upload

## 1. Context & Live Verification Status

- **Square Billing Engine (Live Web SaaS on Railway)**:
  - **InvoiceFlow (`apps/vibe-invoice`)**: Deployed to Railway production service `invoiceflow` (Fresh deployment `20143900-7d79-4735-aa4f-1227361a4d16` reached terminal `SUCCESS`). Live health endpoint verified (`https://invoiceflow-production-86e9.up.railway.app/api/health` returned `{"ok":true}`). Live Square webhook route `/api/webhooks/square` verified actively validating HMAC-SHA256 signatures (HTTP 400 rejection on unsigned requests).
  - **AI Avatar YouTube Studio (`apps/ai-avatar-youtube-saas`)**: Deployed to Railway production service `ai-avatar-studio` (Fresh deployment `f5a25f15-20db-4610-b4b5-009e67652234` reached terminal `SUCCESS`). Live health endpoint verified (`https://ai-avatar-studio-production.up.railway.app/api/health` returned `{"status":"ok","service":"ai-avatar-youtube-saas"}`). Live Square webhook route `/api/webhooks/square` verified executing safely.
- **Railway Infrastructure & Credentials Check**:
  - `SQUARE_ENVIRONMENT=production` is confirmed active on both services.
  - Awaiting Bruce's entry of production credentials in Railway variables: `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, and `SQUARE_WEBHOOK_SECRET`.
  - Custom domain `invoiceflow.vibe-tech.org` status checked: Railway certificate status is `CERTIFICATE_STATUS_TYPE_VALIDATING_OWNERSHIP` / `Verified: no`; awaiting Cloudflare CNAME `l7kkzqu9.up.railway.app` propagation.
- **Vibe Chess (`chess-master`, `com.vibetech.chessmaster`) Android Delivery Pipeline**:
  - RevenueCat Google Play billing engine integrated and verified (`validate:billing`, `pnpm run typecheck`, and all 19 validators passing 100%).
  - Complete `android-delivery.mjs verify` suite passed 100% (run `2026-09-08T23-00-18-081Z-d2aa28fc-367`).
  - Following Bruce's authorization, bumped to `versionCode 3` / `versionName 1.0.2` (snapshot `C:\projects\_vibe-snapshots\chess-master-versionbump-20260908-210700`).
  - Assembled official release bundle (`bundleRelease`) signed with upload keystore (`keystore.properties`).
  - Official release inspection via `release-report.mjs inspect` passed 100% across all 11 checks (run `2026-09-09T01-09-17-798Z-60ad1f6b-615`): manifest `com.vibetech.chessmaster` (code 3 / 1.0.2 / targetSdk 36), display name "Vibe Chess", upload signer verified.
  - Candidate artifact: `C:\projects\chess-master\android\app\build\outputs\bundle\release\app-release.aab` (SHA-256 `6be5de4e04332c49db7c6b79f64e2da9cfb70c54efba3f336dfa8794c24b9dc6`, 44,616,316 bytes).
  - `PRODUCT_BOUNDARIES.md` freeze rules strictly maintained for `Vibe-Tutor`.

## 2. Immediate Next Tasks

1. **Bruce to Add Square Production Credentials on Railway**:
   - Add `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, and `SQUARE_WEBHOOK_SECRET` to `invoiceflow` and `ai-avatar-studio`.
2. **Bruce to Create Cloudflare DNS Record**:
   - Add CNAME for `invoiceflow.vibe-tech.org` pointing to `l7kkzqu9.up.railway.app` (and optional TXT `_railway-verify.invoiceflow`).
   - Run `railway domain status invoiceflow.vibe-tech.org --project invoiceflow -e production -s invoiceflow` once active.
3. **Google Play Production Console Upload**:
   - Bruce uploads the verified release candidate `C:\projects\chess-master\android\app\build\outputs\bundle\release\app-release.aab` (`versionCode 3` / `versionName 1.0.2`) to the Google Play Console production track.
```
