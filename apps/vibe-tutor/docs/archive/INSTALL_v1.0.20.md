# Vibe-Tutor v1.0.20 - "Lock Screen Controls" Installation Guide

**Version:** 1.0.20 (versionCode 21)
**Feature:** Media Session API - Lock Screen Controls
**Build Date:** October 25, 2025
**Status:** ✅ Ready for Installation

---

## 📦 APK Location

**File Path:**

```
C:\dev\Vibe-Tutor\android\app\build\outputs\apk\debug\app-debug.apk
```

**File Size:** ~80-90 MB

---

## 📱 Installation Methods

### Method 1: Direct USB Installation (Recommended)

**Prerequisites:**

- Android device connected via USB
- USB debugging enabled on device
- ADB drivers installed

**Steps:**

1. **Connect your Android device** via USB

2. **Enable USB debugging** (if not already enabled):

   ```
   Settings → About Phone → Tap "Build Number" 7 times
   Settings → Developer Options → Enable "USB Debugging"
   ```

3. **Install using pnpm** (from `C:\dev\Vibe-Tutor`):

   ```bash
   pnpm run android:install
   ```

   **OR** install manually with ADB:

   ```bash
   adb install -r C:\dev\Vibe-Tutor\android\app\build\outputs\apk\debug\app-debug.apk
   ```

4. **Launch the app** from your phone's app drawer

---

### Method 2: File Transfer Installation

**Steps:**

1. **Copy APK to your device:**
   - Connect phone to PC via USB
   - Copy `app-debug.apk` to `Downloads` folder on phone
   - **OR** use cloud storage (Google Drive, Dropbox, etc.)
   - **OR** use file transfer apps (Send Anywhere, etc.)

2. **Enable "Install Unknown Apps"** (if prompted):

   ```
   Settings → Security → Install Unknown Apps
   → Select "Files" or "Chrome" → Enable
   ```

3. **Install from phone:**
   - Open "Files" app or "Downloads"
   - Tap on `app-debug.apk`
   - Tap "Install"
   - Wait for installation to complete

4. **Launch the app**

---

### Method 3: Uninstall Old + Install New (Clean Install)

**For clean installation** (removes all data):

```bash
# From C:\dev\Vibe-Tutor
pnpm run android:deploy
```

This command will:

1. Build fresh APK
2. Uninstall old version (clears all data)
3. Install new version
4. Launch the app

**⚠️ WARNING:** This will **delete all local data** (homework, achievements, music downloads)

---

## 🎯 What to Test After Installation

### Quick Test (2 minutes)

1. **Open Vibe-Tutor** on your device
2. **Navigate to Music** → Local Music
3. **Play a track** (download one if needed)
4. **Lock your phone** (press power button)
5. **Wake screen** (don't unlock)
6. **Check lock screen** - You should see:
   - Music player controls
   - Track name
   - Album art (if available)
   - Play/Pause button
   - Next/Previous buttons

7. **Test controls:**
   - Tap Pause → Music should pause
   - Tap Play → Music should resume
   - Tap Next → Should skip to next track

**Expected:** All controls work instantly from lock screen

---

### Full Test (15 minutes)

**See these files for comprehensive testing:**

- `MEDIA_SESSION_TEST_INSTRUCTIONS.md` - Full test cases
- `IMPLEMENTATION_SUMMARY.md` - Quick reference

**Test Categories:**

1. Lock screen controls (iOS/Android)
2. Notification tray controls (Android)
3. Media key support (desktop browsers)
4. Album art display
5. Progress bar updates

---

## 🆕 New in Version 1.0.20

### Media Session API Integration

**Lock Screen Features:**

- ✅ Music player appears on lock screen
- ✅ Play/Pause/Next/Previous controls
- ✅ Album art display
- ✅ Track info (name, artist, album)
- ✅ Progress bar with seek support
- ✅ Skip forward/backward (±10 seconds)

**Android Notification Features:**

- ✅ Notification tray playback controls
- ✅ Background playback support
- ✅ Swipe-to-dismiss pauses music
- ✅ System UI integration

**Desktop Browser Features:**

- ✅ Media keys work (Play/Pause/Next/Previous)
- ✅ Chrome mini player in browser tab
- ✅ Windows Action Center integration
- ✅ macOS Touch Bar support

**iOS Features:**

- ✅ Lock screen controls (iOS 15.4+)
- ✅ Audio Context unlock (fixes first-play)
- ✅ Safari integration
- ✅ Control Center support

---

## 🐛 Troubleshooting

### Issue: "App Not Installed"

**Cause:** Old version still installed with different signature
**Solution:**

1. Uninstall old version manually
2. Reinstall new APK
3. **OR** use `pnpm run android:deploy` (auto-uninstalls)

---

### Issue: Lock Screen Controls Don't Appear

**Android Check:**

1. Is music actually playing? (not paused)
2. Try pulling down notification tray - controls should be there
3. Lock phone and wake screen - controls should appear

**iOS Check:**

1. Must use Safari (not Chrome on iOS)
2. iOS 15.4+ required
3. Not in Private/Incognito mode

---

### Issue: Music Stops When Switching Apps

**Expected Behavior:**

- Music SHOULD continue in background (Android)
- Lock screen controls SHOULD remain active
- Notification SHOULD persist

**If music stops:**

1. Check battery optimization settings (disable for Vibe-Tutor)
2. Check notification permissions (must be enabled)
3. Restart app and try again

---

## 📊 Version Comparison

| Feature | v1.0.19 | v1.0.20 |
|---------|---------|---------|
| Lock Screen Controls | ❌ | ✅ |
| Notification Playback | ❌ | ✅ |
| Desktop Media Keys | ❌ | ✅ |
| Album Art Display | ❌ | ✅ |
| Background Playback | ✅ | ✅ (Enhanced) |
| iOS Audio Unlock | ❌ | ✅ |

---

## 🔍 Console Logs to Check

**Enable Chrome DevTools** (for debugging):

```
chrome://inspect/#devices
→ Connect device
→ Inspect "com.vibetech.tutor"
→ Open Console tab
```

**Expected Messages:**

```
✅ Media Session API supported - lock screen controls enabled
✅ Media Session action handlers registered
🎵 Media Session metadata updated: Song.mp3
▶️ Media Session playback state: playing
```

---

## 📝 Known Limitations

### Android WebView Limitation

- **Issue:** Media Session API not natively supported in Android WebView
- **Current Status:** Works in mobile Chrome browser
- **Workaround:** Use mobile Chrome for testing
- **Future Fix:** Install `@jofr/capacitor-media-session` plugin (Phase 3)

### Album Art

- Tracks without embedded album art show Vite logo (fallback)
- Not a bug - intentional behavior
- Custom default album art coming in Phase 2

---

## 📚 Additional Resources

**Documentation:**

- `IMPLEMENTATION_SUMMARY.md` - Quick reference guide
- `MEDIA_SESSION_TEST_INSTRUCTIONS.md` - Full test cases (407 lines)
- `PHASE_1_IMPLEMENTATION_COMPLETE.md` - Technical details (405 lines)
- `MUSIC_OPTIMIZATION_PLAN_2025.md` - Complete 4-phase roadmap

**Support:**

- Check console logs for error messages
- Review test instructions for expected behavior
- Report issues with device info + console logs

---

## ✅ Installation Checklist

**Before Installing:**

- [ ] Device connected via USB (for direct install)
- [ ] USB debugging enabled
- [ ] Old version uninstalled (optional, for clean install)

**After Installing:**

- [ ] App launches successfully
- [ ] Navigate to Music tab
- [ ] Download and play a track
- [ ] Lock phone and check lock screen
- [ ] Test play/pause/next/previous controls
- [ ] Check notification tray (Android)
- [ ] Verify background playback continues

**If Testing on Desktop:**

- [ ] Open <http://localhost:5173> in Chrome/Edge
- [ ] Play music
- [ ] Press media keys on keyboard
- [ ] Check Chrome mini player

---

## 🚀 Next Steps After Installation

1. **Quick Test** (2 min) - Lock screen controls
2. **Full Test** (15 min) - Follow `MEDIA_SESSION_TEST_INSTRUCTIONS.md`
3. **Daily Use** - Try using music player for homework sessions
4. **Report Issues** - Note any bugs or unexpected behavior

---

**Installation Date:** ___________
**Device Model:** ___________
**Android Version:** ___________
**Installation Method:** ___________
**Test Results:** ___________

---

**Built with:** React 19, Capacitor 7, Media Session API
**Tested on:** Chrome 120+, Safari 15+, Android 10+, iOS 15.4+

🎵 **Happy Listening!** 🎵
