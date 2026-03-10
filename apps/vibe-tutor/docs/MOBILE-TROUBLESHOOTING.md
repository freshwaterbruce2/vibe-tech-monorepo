# Mobile Troubleshooting Guide - Vibe Tutor

Quick reference for common Android/Capacitor issues and solutions.

---

## 🔍 Common Issues & Solutions

### Issue 1: Duplicate Navigation Buttons (Both Desktop & Mobile Showing)

**Symptoms**:

- Desktop sidebar (white/glass background) visible on mobile
- Mobile bottom navigation also visible
- Both navigation sets stacked on top of each other

**Root Cause**:

- Tailwind CSS v4 from CDN uses modern CSS features (`@property`, `color-mix()`)
- Android WebView doesn't fully support these features
- Media query classes (`md:hidden`, `hidden md:flex`) are ignored

**Solution**:

```bash
# Remove CDN script from index.html
# Install Tailwind v3 properly
npm install -D tailwindcss@3.4.15 postcss autoprefixer

# Create tailwind.config.js
npx tailwindcss init -p

# Create src/index.css with:
# @tailwind base;
# @tailwind components;
# @tailwind utilities;

# Import in index.tsx
import './src/index.css';

# Rebuild
npm run build
npx cap sync android
```

**Prevention**:

- ✅ Always use installed Tailwind v3 for mobile apps
- ✅ Test responsive breakpoints on real devices
- ❌ Never use Tailwind CDN for Capacitor apps

---

### Issue 2: Chat Not Working / No Response

**Symptoms**:

- Chat window opens successfully
- Messages send but no response
- Console shows network errors or CORS issues

**Root Cause**:

- Capacitor 7's automatic `fetch()` patching is unreliable
- Standard `fetch()` calls hit CORS in Android WebView
- `CapacitorHttp.enabled = true` doesn't always patch correctly

**Solution**:

```typescript
// services/secureClient.ts

// 1. Import CapacitorHttp explicitly
import { CapacitorHttp } from '@capacitor/core';

// 2. Replace fetch() calls
// BEFORE:
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
const result = await response.json();

// AFTER:
const response = await CapacitorHttp.request({
  url: url,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  data: data
});
const result = response.data; // Already parsed!
```

**Prevention**:

- ✅ Always use `CapacitorHttp.request()` for native apps
- ✅ Set timeouts explicitly (connectTimeout, readTimeout)
- ❌ Don't rely on automatic fetch patching

---

### Issue 3: Stale Code After Rebuild

**Symptoms**:

- Code changes don't appear in installed app
- Old bugs reappear after fixes
- App behaves like previous version

**Root Cause**:

- Service worker caching old bundles
- Android not clearing WebView cache
- Old APK cached on device

**Solution**:

```bash
# 1. Increment cache version
# service-worker.js
const CACHE_NAME = 'vibe-tutor-cache-v{NEW_VERSION}';

# 2. Increment Android version
# android/app/build.gradle
versionCode {OLD} + 1
versionName "1.0.{NEW}"

# 3. Clean rebuild
cd android && ./gradlew.bat clean assembleDebug

# 4. Completely uninstall old app from device
adb uninstall com.vibetech.tutor

# 5. Install fresh APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Prevention**:

- ✅ Always increment versionCode on fixes
- ✅ Add version meta tag to index.html
- ✅ Test on clean installs, not upgrades

---

### ⚠️ CRITICAL: Android WebView Cache Busting

**Why This Matters**:
Android WebView aggressively caches old app versions. After making code changes (including AI prompt updates), the old code will continue to load from cache, making it appear like your changes didn't work. This can waste 1+ hours of debugging time.

**Symptoms**:

- "I fixed it but the bug is still there"
- "The new AI prompts aren't showing up"
- "It works in browser but not on Android"
- Code changes in JavaScript/TypeScript don't appear in installed app
- Old behavior persists after rebuild

**Complete Cache Busting Workflow**:

```bash
# STEP 1: Increment versionCode (REQUIRED)
# Edit android/app/build.gradle
versionCode {CURRENT} + 1  # e.g., 6 → 7
versionName "1.0.{NEW}"    # e.g., "1.0.5" → "1.0.6"

# STEP 2: Build fresh web assets
npm run build

# STEP 3: Sync to Android
npx cap sync android

# STEP 4: Clean rebuild (removes cached build files)
cd android
./gradlew.bat clean assembleDebug

# STEP 5: Completely uninstall old app from device
adb uninstall com.vibetech.tutor

# STEP 6: Install fresh APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Why Each Step is Necessary**:

1. **versionCode increment**: Forces Android to recognize it as a new version
   - Without this, Android treats it as the same app and keeps cache
   - This is THE most important step

2. **npm run build**: Compiles your latest code changes into JavaScript bundles
   - Prompt changes in `constants.ts` are compiled into the bundle
   - Without this, old prompts are in the bundle

3. **npx cap sync**: Copies new web assets to `android/www/`
   - Without this, Android builds with old assets

4. **clean assembleDebug**: Removes all cached build artifacts
   - Prevents gradle from using cached outputs
   - Ensures fresh compilation

5. **adb uninstall**: Removes ALL cached data from device
   - WebView cache is tied to the app installation
   - This is the nuclear option that guarantees fresh state

6. **adb install**: Installs the new APK with incremented versionCode
   - Fresh installation = fresh cache

**Shortcuts DON'T WORK**:

❌ **Just reinstalling without uninstalling first**

- Android keeps WebView cache from previous install
- Old JavaScript still loads

❌ **Incrementing versionCode without clean rebuild**

- Gradle may use cached build outputs
- APK has old code

❌ **Skipping `npx cap sync`**

- Android builds with old assets from previous sync
- Your new code never makes it to `android/www/`

❌ **Just clearing app data from device settings**

- WebView cache persists beyond app data
- Must fully uninstall

**Real-World Example (v1.0.6)**:

```bash
# Changed AI prompts in constants.ts for neurodivergent support
# Without cache busting, user would still see old emoji-heavy responses
# With proper cache busting, new structured responses appear

# Bad workflow:
npm run build
npx cap sync android
cd android && ./gradlew.bat assembleDebug
adb install -r app-debug.apk
# Result: OLD prompts still load from cache

# Good workflow:
# Edit build.gradle: versionCode 6 → 7, versionName "1.0.5" → "1.0.6"
npm run build
npx cap sync android
cd android && ./gradlew.bat clean assembleDebug
adb uninstall com.vibetech.tutor
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
# Result: NEW prompts load successfully
```

**When to Apply This**:

✅ **Always cache bust for**:

- AI prompt changes (constants.ts)
- Service worker updates
- Major bug fixes
- New features
- Styling changes
- Any JavaScript/TypeScript code changes

❌ **Don't need full cache bust for**:

- Android-only changes (build.gradle, manifest.xml)
- Native plugin updates (may just need `npx cap sync`)
- Documentation updates (README.md, etc.)

**Verification**:

After installing, verify the new version is running:

```javascript
// In Chrome DevTools (chrome://inspect)
console.log("App version:", "1.0.6"); // Your new version
localStorage.getItem('lastAppVersion'); // Check if updated
```

Or add version display in app UI:

```typescript
// App.tsx
<div className="version-tag">v1.0.6</div>
```

**Pro Tip**: Tag your git commits with version numbers for easy rollback:

```bash
git tag -a v1.0.6 -m "Neurodivergent-friendly AI prompts"
git push origin v1.0.6
```

---

### Issue 4: Media Queries Not Working

**Symptoms**:

- Desktop styles showing on mobile
- Mobile-specific CSS not applying
- Breakpoints ignored

**Root Cause**:

- WebView version too old for modern CSS
- Tailwind v4 requires Chrome 111+
- Some Android devices on older WebView

**Solution**:

```bash
# Check WebView version
adb shell dumpsys webview

# If < Chrome 111, use Tailwind v3
npm install -D tailwindcss@3.4.15

# Configure for older browsers
# tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',  // Tablet
      'lg': '1024px', // Desktop
    }
  }
}
```

**Testing**:

```bash
# Test responsive design on device
adb shell am start -a android.intent.action.VIEW \
  -d "http://192.168.1.x:5173"
```

---

## 🛠️ Debugging Tools

### Chrome Remote Debugging

```bash
# Enable on device: Settings → Developer Options → USB Debugging
# Connect device via USB
# Open Chrome: chrome://inspect/#devices
# Click "Inspect" under your app
```

**Useful Console Commands**:

```javascript
// Check Capacitor detection
console.log(window.Capacitor);
console.log(window.location.protocol);

// Check WebView version
navigator.userAgent;

// Test CapacitorHttp
import { CapacitorHttp } from '@capacitor/core';
const result = await CapacitorHttp.get({ url: 'https://api.example.com' });
```

### ADB Logcat

```bash
# Filter for Capacitor logs
adb logcat | grep -i capacitor

# Filter for network errors
adb logcat | grep -i "err\|exception"

# Clear and watch
adb logcat -c && adb logcat | grep -i "vibetutor"
```

### Capacitor Doctor

```bash
# Check environment setup
npx cap doctor

# Check plugins
npx cap ls

# Check configuration
npx cap sync --dry-run
```

---

## 🧪 Testing Checklist

**Before Publishing**:

- [ ] Test on real device (not emulator)
- [ ] Test with fresh install (not upgrade)
- [ ] Test with Wi-Fi and mobile data
- [ ] Test with backend sleeping (30s wait)
- [ ] Test offline mode
- [ ] Verify responsive breakpoints work
- [ ] Check Chrome DevTools console for errors
- [ ] Verify all buttons are 44x44px minimum
- [ ] Test chat sends and receives messages

**Device Compatibility**:

- [ ] Samsung Galaxy A54 (Android 15)
- [ ] Test on Android 10+ minimum
- [ ] Check WebView version >= 74
- [ ] Verify Tailwind classes work

---

## 📚 Quick References

### WebView Compatibility

| Feature | Minimum WebView | Notes |
|---------|----------------|-------|
| Tailwind v3 | 74+ | All classes work |
| Tailwind v4 | 111+ | Requires @property, color-mix() |
| CapacitorHttp | Any | Native bridge |
| CSS Grid | 57+ | Full support |
| Flexbox | 21+ | Full support |

### Capacitor Config Priority

1. `capacitor.config.ts` (TypeScript - recommended)
2. `capacitor.config.json` (JSON fallback)
3. `capacitor.config.js` (JavaScript fallback)

### Build Order

```bash
npm run build              # 1. Build web assets
npx cap sync android       # 2. Copy to android/
cd android                 # 3. Navigate to Android
./gradlew.bat assembleDebug # 4. Build APK
```

---

## 🔗 Useful Search Terms

When stuck, try searching:

- "Capacitor [issue] Android [version]"
- "Tailwind CSS Android WebView compatibility"
- "CapacitorHttp not working [Capacitor version]"
- "[Framework] media queries not working Android"
- "Android WebView CSS compatibility"

**Official Docs**:

- Capacitor: <https://capacitorjs.com/docs>
- Tailwind CSS: <https://tailwindcss.com/docs/compatibility>
- Android WebView: <https://developer.android.com/reference/android/webkit/WebView>

---

## 🚨 Emergency Recovery

**If completely broken**:

```bash
# 1. Checkout last working version
git log --oneline
git checkout v1.0.5

# 2. Clean install
npm install
npm run build

# 3. Fresh Android build
cd android && ./gradlew.bat clean assembleDebug

# 4. Reinstall on device
adb uninstall com.vibetech.tutor
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

**Working APK Backup**: `vibe-tutor-v1.0.5-STABLE.apk`

---

**Last Updated**: October 4, 2025
**Tested On**: Samsung Galaxy A54 (Android 15)
**Capacitor Version**: 7.4.3
**Latest Version**: v1.0.6 (Neurodivergent-Friendly AI Prompts)
