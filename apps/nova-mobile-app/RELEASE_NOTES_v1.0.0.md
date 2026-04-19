# NOVA Mobile v1.0.0 — Release Notes

**Release date:** 2026-04-18
**Platform:** Android (primary), Web (debug export)
**Pairs with:** NOVA Agent desktop v1.3.0
**Package id:** `com.nova.assistant`
**Minimum Android:** 9.0 (API 28)

---

## Highlights

- First public Android release of the NOVA Mobile companion app.
- Real-time chat with the Nova Agent over a local HTTP bridge (port 3000).
- Biometric re-lock on app background.
- Offline queue with automatic replay on reconnect.
- Expo SDK 54 / React Native 0.81.5 / React 19.2.4 / TypeScript 5.9.3.

## What's Included

### Screens
- **AuthScreen** — bridge token entry + connection check
- **ChatScreen** — streaming chat with typing indicator and offline banner
- **MemoryScreen** — search + browse Nova's memory store
- **StatusScreen** — live connection health + agent heartbeat
- **SettingsScreen** — bridge URL override, token rotation, feature flags
- **LockScreen** — biometric unlock gate

### Services
- `HttpAgentAdapter` — REST client for the Nova Desktop bridge, with bearer-token auth, 30s timeout, and health polling every 15s
- `pushNotificationService` — Expo Push device registration relayed to the desktop
- Zustand stores (`authStore`, `chatStore`, `connectionStore`, `offlineQueueStore`) with AsyncStorage persistence
- Secure storage for tokens via `expo-secure-store`

### Build & Release
- `eas.json` with `development`, `preview` (APK), and `production` (AAB + Play internal track) profiles
- `scripts/ship-v1.0.0.ps1` — staged PowerShell 7 playbook for the full release flow
- `scripts/adb-reverse.ps1` — USB port forward helper for physical-device testing

## Fixes Rolled Into 1.0.0

- **Hermes/JSI blank-screen crash.** Expo Go's New Architecture sealed `console.error` as non-writable; `ExceptionsManager`'s reassignment threw during module init and blanked the app. Fixed via accessor-based console shim in `index.ts` loaded before `require('react-native')`. Full root-cause analysis in `POST-MORTEM-console-patch.md`.
- **Version drift.** `src/config.ts` claimed `APP_VERSION: '2.0.0'` while `package.json` and `app.json` said `1.0.0`. Reconciled to `1.0.0`.
- **npm-in-the-pnpm-monorepo.** `README.md` documented an `npm` workflow that would corrupt the root `pnpm-lock.yaml`. Rewritten to use `pnpm --filter nova-mobile-app` exclusively.
- **Missing `.env.example`.** Production builds threw when `EXPO_PUBLIC_BRIDGE_TOKEN` was unset; developers had no template to copy from. Added.

## Feature Flags

All on by default, configurable at `src/config.ts > FEATURES`:

| Flag | Default | Notes |
|------|---------|-------|
| `VOICE_INPUT` | `true` | Uses `expo-speech`; hardware mic permission requested on first chat |
| `OFFLINE_MODE` | `true` | Queues outgoing messages when disconnected; replays on reconnect |
| `BIOMETRIC_AUTH` | `true` | Re-locks app on background via `expo-local-authentication` |
| `PUSH_NOTIFICATIONS` | `true` | Registers Expo Push token with desktop |
| `MEMORY_SEARCH` | `true` | Enables Memory tab and search UI |

## Connection Model

The app is a client to the desktop. Nova Agent v1.3.0 binds the bridge to `127.0.0.1:3000` with no authentication beyond the bridge token. Supported configurations:

- **Android emulator** — talks to `http://10.0.2.2:3000` automatically.
- **iOS simulator / Expo Go web** — talks to `http://localhost:3000` automatically.
- **Physical Android device over USB** — run `pnpm --filter nova-mobile-app adb:reverse`; requests go through loopback.
- **Physical device over LAN** — not supported in v1.0.0. Requires a desktop-side change to un-gate the bridge with proper auth; tracked as a nova-agent follow-up, not a mobile blocker.

## Security

- Bridge token (`EXPO_PUBLIC_BRIDGE_TOKEN`) is required in production builds; `src/config.ts` throws at startup if missing.
- Token and any OAuth credentials are stored in `expo-secure-store`, not `AsyncStorage`.
- App re-locks on background when biometric auth is enabled.
- No telemetry phones home from the mobile app. Push notification tokens are shared only with the paired desktop.

## Test Results (target on release build)

| Suite | Command | Expected |
|-------|---------|----------|
| Unit | `pnpm --filter nova-mobile-app test` | All Vitest passing |
| Integration (desktop running) | `pnpm --filter nova-mobile-app test:integration` | All passing |
| Typecheck | `pnpm --filter nova-mobile-app typecheck` | 0 errors |
| Lint | `pnpm --filter nova-mobile-app lint` | 0 errors |

## Build Artifacts

Produced by `scripts/ship-v1.0.0.ps1` via EAS Cloud:

- `_builds\nova-mobile-v1.0.0.apk` — preview APK for internal distribution / sideload
- Production AAB — uploaded directly to Play Console internal track by `eas submit`
- `_builds\SHA256SUMS.txt` — hashes of every locally-downloaded artifact

## Upgrade Notes

No prior public release. First install instructions:

1. Install the APK on the target Android device (enable "install from unknown sources" for sideload, or use Play internal track).
2. Launch Nova Agent desktop (v1.3.0+) with the bridge running.
3. If on a physical device, run `pnpm --filter nova-mobile-app adb:reverse` with the device connected via USB debugging.
4. Open NOVA Mobile, enter the bridge token that matches the desktop, tap Connect.

## Known Non-Blockers

- Web export in `dist/` is stale from an earlier debug build; not part of this release.
- iOS `bundleIdentifier` is reserved in `app.json` but no iOS artifact is produced by this release. iOS is tracked as a future release.
- Android `versionCode` is `1`. Future releases must increment this — `eas.json` has `autoIncrement: true` on the `production` profile so Play Console won't reject subsequent uploads.
- Desktop bridge LAN exposure remains blocked on a separate nova-agent change; v1.0.0 ships USB / loopback only by design.

## Credits

Solo release — Bruce Freshwater (`@freshwaterbruce2` on the private monorepo).
