# nova-mobile-app — AI Context

## What this is
React Native (Expo) mobile companion app for the Nova AI agent — chat interface with biometric auth, push notifications, and offline support.

## Stack
- **Runtime**: Node.js 22 + React Native 0.81.5
- **Framework**: Expo SDK 54 (managed workflow)
- **Key deps**: expo-local-authentication, expo-notifications, expo-secure-store, react-navigation v7, zustand

## Dev
```bash
pnpm --filter nova-mobile-app start    # Expo dev server (Metro bundler)
pnpm --filter nova-mobile-app android  # Launch on Android
pnpm --filter nova-mobile-app build    # expo export --platform web
pnpm --filter nova-mobile-app test     # Vitest unit tests
```

## Notes
- Entry point is `index.ts` (not `App.tsx`); Expo managed workflow
- USB Android debugging: run `pnpm adb:reverse` (PowerShell script)
- Secure store for tokens (expo-secure-store), not AsyncStorage
- `src/config.ts` holds API base URL and feature flags — check before editing
- Several files were recently deleted (tailwind.config.js, global.css, useNovaAgent.ts) — do not recreate without purpose
