---
paths: apps/vibe-tutor/**
---

# Capacitor Mobile Development Rules

## Vibe-Tutor Project Overview

**vibe-tutor** (`apps/vibe-tutor`) - AI-powered homework manager for students

- **Type**: PWA + Capacitor Android app
- **Tech Stack**: React 19 + TypeScript + Vite + Capacitor 7
- **Status**: Production ready (v1.0.5+)
- **Nx Integration**: ✅ Fully integrated with Android build targets
- **Key Learning**: Always use Tailwind v3 (not CDN) and explicit CapacitorHttp for Android

## Critical Android WebView Rules

### ⚠️ ALWAYS Use HTTP Scheme (NOT HTTPS)

- **Problem**: `androidScheme: 'https'` causes blank screen with only background visible
- **Solution**: ALWAYS use `androidScheme: 'http'` with `cleartext: true`
- **Why**: Android WebView cannot load local assets with HTTPS scheme
- **Symptoms**: App shows background but no UI elements, no error messages
- **Location**: `capacitor.config.ts` server configuration

```typescript
// ✅ CORRECT
server: {
  androidScheme: 'http',
  cleartext: true
}

// ❌ WRONG - causes blank screen
server: {
  androidScheme: 'https',
  cleartext: false
}
```

**This is a RECURRING issue. Check this FIRST if blank screen appears.**

### ⚠️ NEVER Use Tailwind CSS from CDN

- **Problem**: Android WebView incompatible with Tailwind v4
- **Solution**: Always use Tailwind v3 installed via npm
- **Why**: WebView doesn't support all modern CSS features used by v4

### ⚠️ NEVER Rely on Automatic fetch() Patching

- **Problem**: Capacitor's automatic fetch() patching is unreliable
- **Solution**: Use `CapacitorHttp.request()` explicitly for all HTTP requests
- **Example**:

```typescript
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.request({
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
});
```

### ⚠️ ALWAYS Increment versionCode on Each Build

- **Problem**: Android caches aggressively, old builds may persist
- **Solution**: Increment `versionCode` in `android/app/build.gradle` before each build
- **Why**: Forces complete cache clear and ensures fresh install
- **Location**: `android/app/build.gradle`

```gradle
versionCode 10  // Increment this on each build
versionName "1.0.5"
```

### ⚠️ ALWAYS Test on Real Devices

- **Problem**: Emulators don't catch all WebView quirks
- **Solution**: Test critical features on physical Android devices
- **Why**: Real devices expose network, storage, and performance issues

## Nx Commands

```bash
# Web development
pnpm nx dev vibe-tutor               # Vite dev server
pnpm nx build vibe-tutor             # Production build

# Android development
pnpm nx android:sync vibe-tutor      # Sync web assets
pnpm nx android:build vibe-tutor     # Build APK
pnpm nx android:deploy vibe-tutor    # Full build + install

# Direct commands (alternative)
pnpm --filter vibe-tutor android:full-build
```

## Common Issues & Solutions

### Issue: White Screen on Android

**Cause**: Capacitor can't load index.html
**Solution**:

1. Check `capacitor.config.ts` has correct `webDir: 'dist'`
2. Run `pnpm nx build vibe-tutor` before syncing
3. Verify `android/app/src/main/assets/public/index.html` exists after sync

### Issue: API Requests Fail Silently

**Cause**: Using native fetch() instead of CapacitorHttp
**Solution**: Replace all `fetch()` calls with `CapacitorHttp.request()`

### Issue: Styles Not Applied

**Cause**: Tailwind CDN or v4 usage
**Solution**: Install Tailwind v3 via npm and configure PostCSS properly

### Issue: Old Build Still Running

**Cause**: Android cache not cleared
**Solution**:

1. Increment `versionCode` in `android/app/build.gradle`
2. Uninstall old app from device
3. Rebuild and reinstall

## Build Configuration

**Desktop Apps (General)**: Use Tauri (NOT Electron) - smaller bundles, better performance
**Python**: Use .venv virtual environments
**Node**: Fresh node_modules installation required per project

## Documentation

See `apps/vibe-tutor/CLAUDE.md` for mobile-specific guidance and detailed Capacitor workflows.
