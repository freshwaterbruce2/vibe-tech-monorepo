# Play Store Release Checklist (Android)

## 1) One-time setup

- Confirm `applicationId` is final: `android/app/build.gradle` -> `com.vibetech.tutor`
- Create signing key + config (LOCAL ONLY)
  - `android/generate-keystore.ps1`
  - Fill `android/keystore.properties` (do not commit)
  - Verify it actually signs:
    - `storeFile` points to the keystore file that exists
    - `storePassword` matches the keystore password
    - `keyAlias` exists in the keystore
    - `keyPassword` matches the key’s password

## 2) Backend (required for AI + analytics)

- Ensure your production backend is deployed (Render etc)
- Set secrets in the host dashboard (never commit):
  - `GEMINI_API_KEY` (primary provider)
  - `OPENROUTER_API_KEY` (fallback provider)

## 3) Point the app at production

- Update `src/config.ts` -> `PRODUCTION_BACKEND_URL`
- For local Android debugging, keep the `adb reverse tcp:3001 tcp:3001` flow

## 4) Build release bundle (AAB)

From repo root:

- `pnpm install`
- `pnpm run build`
- `pnpm exec cap sync android`
- `pnpm run android:bundle:release:clean`

If you see `:app:signReleaseBundle` failing with “keystore password was incorrect”, update `android/keystore.properties` with the real values (the repo ships placeholders).

Output:

- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## 5) Play Console

- Upload `app-release.aab`
- Complete required store listing assets (see `store-assets/`)
- Provide a Privacy Policy URL (you can host `public/privacy-policy.html` or use `docs/PRIVACY_POLICY.md` as the source)
- Declare permissions:
  - Microphone is used for voice input (see `components/dashboard/AddHomeworkModal.tsx`)

## 6) Quick sanity checks

- Release build uses HTTPS-only (debug allows localhost via debug manifest)
- App launches offline without crashing (AI features will show fallback messaging)
