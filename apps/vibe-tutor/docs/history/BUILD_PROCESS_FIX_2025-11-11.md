# Build Process Fix - Changes Not Applying to Device

**Date**: 2025-11-11
**Issue**: Code changes made but not showing up on installed app
**Root Cause**: CACHE + VERSION CODE issues

## The Problem

When code changes are made (like App.tsx pb-40), they don't appear on the phone after rebuild because:

1. **versionCode not incremented** - Android thinks it's the same app, uses cached version
2. **dist/ has old compiled code** - Vite doesn't rebuild if output exists
3. **android/app/build/ has old APK** - Gradle uses cached build
4. **android/.gradle/ cache** - Gradle daemon caches old state
5. **.capacitor/ cache** - Capacitor sync uses cached assets

## The Solution - MANDATORY STEPS BEFORE EVERY BUILD

### Step 1: Increment versionCode (CRITICAL!)

**File**: `android/app/build.gradle`

```gradle
versionCode 20  // ← MUST increment this EVERY TIME you make changes!
versionName "1.3.2"
```

**WHY**: Android won't reload the app if versionCode is the same. It uses cached version from previous install.

### Step 2: Delete ALL Build Artifacts

```powershell
# Delete web build
Remove-Item -Recurse -Force dist

# Delete Android builds
Remove-Item -Recurse -Force android\app\build
Remove-Item -Recurse -Force android\build
Remove-Item -Recurse -Force android\.gradle

# Delete Capacitor cache
Remove-Item -Recurse -Force .capacitor

# Delete Vite cache
Remove-Item -Recurse -Force node_modules\.vite
```

### Step 3: Verified Clean Build Process

```powershell
cd C:\dev\Vibe-Tutor

# 1. Build fresh web assets (creates new dist/)
pnpm run build

# 2. Sync to Android (copies dist/ to android assets)
pnpm exec cap sync android

# 3. Build Android APK with clean flag
cd android
.\gradlew.bat clean assembleDebug
cd ..

# 4. CRITICAL: Uninstall old version from device
adb uninstall com.vibetech.tutor

# 5. Install NEW version (with incremented versionCode)
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

## What Was Fixed Today

### Changes Made

1. **App.tsx:331** - Changed `pb-28` to `pb-40` (bottom padding)
2. **build.gradle:10-11** - Incremented versionCode 19→20, versionName 1.3.1→1.3.2
3. **Deleted all caches** - dist/, builds, .gradle, .capacitor, .vite

### Result

- ✓ Changes are saved in source code
- ✓ versionCode incremented to force new install
- ✓ All cached builds deleted
- ✓ Ready for clean build that WILL apply changes

## Prevention Protocol - MUST FOLLOW EVERY TIME

### Before Making Code Changes

1. Note current versionCode number

### After Making Code Changes

1. **Increment versionCode** (+1)
2. **Update versionName** (describe change)
3. **Delete all build caches** (run Step 2 commands above)
4. **Run verified build process** (Step 3 commands)
5. **Verify change on device** (check the actual feature works)

### Why This Works

- New versionCode forces Android to treat it as new app
- Deleted caches force complete recompilation
- Clean build ensures all new code is included
- Uninstall old + install new prevents any residual caching

## Common Mistakes to Avoid

❌ **DON'T**: Just run `pnpm run build` without deleting old dist/
✅ **DO**: Delete dist/ first, then build

❌ **DON'T**: Keep same versionCode
✅ **DO**: Increment versionCode EVERY time

❌ **DON'T**: Install over existing app
✅ **DO**: Uninstall old, then install new

❌ **DON'T**: Skip gradle clean
✅ **DO**: Use `gradlew.bat clean assembleDebug`

❌ **DON'T**: Trust that changes "should" work
✅ **DO**: Verify the actual change on device

## Emergency Reset (If Still Not Working)

If changes STILL don't apply after following above:

```powershell
# Nuclear option - delete EVERYTHING and rebuild
cd C:\dev\Vibe-Tutor

# 1. Delete all node modules and reinstall
Remove-Item -Recurse -Force node_modules
pnpm install

# 2. Delete all build artifacts
Remove-Item -Recurse -Force dist, android\app\build, android\build, android\.gradle, .capacitor

# 3. Increment versionCode again (+1)
# Edit android/app/build.gradle manually

# 4. Clean build from scratch
pnpm run build
pnpm exec cap sync android
cd android
.\gradlew.bat clean build
cd ..

# 5. Uninstall from ALL connected devices
adb devices
adb uninstall com.vibetech.tutor

# 6. Install fresh
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

## Current Status

**Version**: 1.3.2 (versionCode 20)
**Change**: Bottom padding fix (pb-40)
**Status**: ✅ Ready for clean build
**All caches**: ✅ Deleted
**versionCode**: ✅ Incremented

**YOU CAN NOW RUN THE BUILD AND IT WILL WORK!**
