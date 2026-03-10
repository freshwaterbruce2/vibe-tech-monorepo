# Vibe Tutor Android Release Runbook

This runbook prepares `vibe-tutor` for Google Play internal testing and production promotion.

## 1) Prerequisites

- JDK 17 installed and available in `PATH`
- Android SDK + build tools installed
- `pnpm install` completed at repo root (`C:\dev`)
- Play Console app created for package id `com.vibetech.tutor`
- Play App Signing enabled in Play Console

## 2) Signing Setup (Upload Key)

From `apps/vibe-tutor/android`:

1. Generate upload keystore:
   - `.\generate-keystore.ps1 -StorePassword "<strong-password>"`
2. Ensure `keystore.properties` exists in `apps/vibe-tutor/android` with:
   - `storeFile`
   - `storePassword`
   - `keyAlias`
   - `keyPassword`
3. Confirm no secrets are tracked:
   - `.gitignore` excludes `*.keystore` and `**/android/keystore.properties`

## 3) Versioning Rules

- Source of truth: `apps/vibe-tutor/package.json` `version`.
- `android/app/build.gradle` derives:
  - `versionName` from package version.
  - `versionCode` from semver as `major * 10000 + minor * 100 + patch`.
- Keep package version monotonic for every release (`1.5.8` -> `1.5.9`, etc.).

## 4) Build and Validate with Nx

Run from repo root (`C:\dev`):

```powershell
pnpm nx run vibe-tutor:build
pnpm nx run vibe-tutor:test
pnpm nx run vibe-tutor:android:sync
pnpm nx run vibe-tutor:android:build
pnpm nx run vibe-tutor:android:full-release
```

Expected release artifact:

- `apps/vibe-tutor/android/app/build/outputs/bundle/release/app-release.aab`

## 5) Play Console Internal Testing

1. Upload the generated `.aab` to **Internal testing**.
2. Verify Data Safety and permissions declarations match the app behavior.
3. Add tester emails/group and publish the internal release.
4. Validate install/update from Play internal testing link.
5. Review pre-launch report for crashes/ANRs and policy warnings.

## 6) Policy and Listing Requirements

- Privacy policy URL must be public and stable.
- Voice input disclosure must be visible before first microphone usage.
- App age target must stay consistent across:
  - Play target audience form
  - Store listing copy
  - in-app policy/docs

## 7) Promotion Gate (Internal -> Closed/Production)

Promote only after:

- No startup crash on supported Android versions
- Core flows pass (homework add/edit, AI tutor chat, music playback)
- Permission prompts are contextual and optional features degrade gracefully
- Play pre-launch report has no blocking issues
