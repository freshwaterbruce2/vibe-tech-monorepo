# NOVA Mobile App

Android companion for the NOVA AI Assistant desktop (nova-agent). Connects over HTTP to the desktop bridge on port 3000.

**Stack:** Expo SDK 54 · React Native 0.81.5 · React 19 · TypeScript 5.9.3 · Zustand
**Platforms:** Android (primary), Web (Expo export for debugging). iOS build config exists but is not part of the current release target.

## Prerequisites

- Node 22.x, pnpm 10.x (monorepo workspace is at `C:\dev`)
- Android Studio + Android SDK Platform-Tools (`adb` must be on PATH)
- `eas-cli` globally installed for cloud builds: `pnpm add -g eas-cli`
- An Expo account linked to EAS (`eas login`)
- Nova Desktop (`apps/nova-agent`) running on the same machine

## Quick Start (Dev)

Run every command from `C:\dev` using pnpm workspace filters.

```powershell
# 1. Install dependencies for this app only
pnpm install --filter nova-mobile-app

# 2. Copy the env template and set the bridge token
Copy-Item C:\dev\apps\nova-mobile-app\.env.example C:\dev\apps\nova-mobile-app\.env
# then edit .env — EXPO_PUBLIC_BRIDGE_TOKEN must match the desktop

# 3. Start the Nova Desktop bridge (separate terminal)
pnpm --filter nova-agent start

# 4. Start Expo on the mobile app
pnpm --filter nova-mobile-app start
```

From the Expo dev menu press `a` for Android emulator, or scan the QR code with Expo Go on a physical device.

## Connecting a Physical Android Device

The desktop bridge binds to `127.0.0.1:3000` only. Use ADB reverse to forward the loopback port to your phone:

```powershell
pnpm --filter nova-mobile-app adb:reverse
```

This runs `C:\dev\apps\nova-mobile-app\scripts\adb-reverse.ps1`, which calls `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081` (Metro bundler). USB debugging must be enabled on the device.

## API URL Resolution

`src\config.ts` auto-detects the host:

| Target | URL |
|--------|-----|
| Android emulator | `http://10.0.2.2:3000` (host loopback alias) |
| iOS simulator / web | `http://localhost:3000` |
| Physical device + `adb reverse` | `http://10.0.2.2:3000` (default) or `http://localhost:3000` via override |
| Production build | `https://api.nova-ai.com` (placeholder host for future cloud bridge) |

Set `EXPO_PUBLIC_OVERRIDE_API_URL` in `.env` to bypass auto-detection (e.g. LAN testing on a non-loopback IP — requires LAN-binding the desktop bridge with authentication).

## Features

- Real-time chat with Nova via REST/JSON
- Memory search + browse
- Biometric re-lock on app background (`expo-local-authentication`)
- Voice input (`expo-speech` wired, feature-flagged in `src/config.ts`)
- Push notifications (`expo-notifications`)
- Offline queue + AsyncStorage persistence (Zustand)
- Connection health banner with auto-reconnect

## Development Commands

```powershell
pnpm --filter nova-mobile-app start             # Expo dev server
pnpm --filter nova-mobile-app android           # Launch on Android target
pnpm --filter nova-mobile-app test              # Vitest unit tests
pnpm --filter nova-mobile-app test:integration  # Requires desktop running
pnpm --filter nova-mobile-app typecheck         # tsc --noEmit
pnpm --filter nova-mobile-app lint              # ESLint
pnpm --filter nova-mobile-app build             # expo export --platform web
pnpm --filter nova-mobile-app adb:reverse       # USB port forward helper
```

## Production Build (Android, EAS Cloud)

```powershell
Set-Location C:\dev\apps\nova-mobile-app

# APK for internal distribution (sideload on any device)
pnpm exec eas build --platform android --profile preview

# AAB for Play Store internal track
pnpm exec eas build --platform android --profile production
pnpm exec eas submit --platform android --profile production
```

Build profiles live in `eas.json`. The full release flow is scripted at `C:\dev\apps\nova-mobile-app\scripts\ship-v1.0.0.ps1` — read `RELEASE_NOTES_v1.0.0.md` before running.

## Project Structure

```
nova-mobile-app/
├── App.tsx                     # Root component + ErrorBoundary + biometric lock gate
├── index.ts                    # Entry point (console-patch before RN loads — see POST-MORTEM)
├── app.json                    # Expo config (bundle id com.nova.assistant)
├── eas.json                    # EAS build profiles
├── src/
│   ├── components/             # ChatInputBar, MemoryCard, MessageBubble, OfflineBanner, TypingIndicator
│   ├── screens/                # Auth, Chat, Lock, Memory, Settings, Status
│   ├── navigation/             # AppNavigator (bottom tabs + stack)
│   ├── services/               # HttpAgentAdapter, pushNotificationService
│   ├── stores/                 # Zustand: auth, chat, connection, offlineQueue
│   ├── types/                  # Shared type contracts
│   └── config.ts               # Platform-aware URL + feature flags + theme
├── scripts/
│   ├── adb-reverse.ps1         # USB Android port forward
│   └── ship-v1.0.0.ps1         # Release playbook
├── _backups/                   # Local zip snapshots (never committed)
└── assets/                     # App icons + splash
```

## Troubleshooting

**Blank screen / ExceptionsManager error on launch.** Expo Go's new architecture can seal `console.error`. The fix (getter/setter accessors in `index.ts`) is already in place. See `POST-MORTEM-console-patch.md`.

**"Network request failed" on Android.** Desktop bridge isn't running, or `adb reverse` hasn't been set up. Run `pnpm --filter nova-agent start` and `pnpm --filter nova-mobile-app adb:reverse`.

**Bridge token mismatch (401).** Confirm `EXPO_PUBLIC_BRIDGE_TOKEN` in `.env` matches the desktop token.

**TypeScript errors.** `pnpm --filter nova-mobile-app typecheck`.

## Data & Security

- Tokens stored in `expo-secure-store`, not `AsyncStorage`.
- Desktop bridge is bound to `127.0.0.1:3000` by default; LAN access requires explicit un-gating + authentication in `apps/nova-agent/src-tauri/src/main.rs`.
- No database in `C:\dev` — all app state lives on the device or in memory. Desktop-side data remains under `D:\databases\`.

## Related Docs

- `CLAUDE.md` — AI context (stack, entry point notes)
- `STATUS.md` — project status + connection model
- `TESTING.md` — manual + integration test checklist
- `RELEASE_NOTES_v1.0.0.md` — first release
- `SHIP_READY_REPORT.md` — pre-release audit
- `POST-MORTEM-console-patch.md` — Hermes/JSI console-seal incident

## License

MIT
