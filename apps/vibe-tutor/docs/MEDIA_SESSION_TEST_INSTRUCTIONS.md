# Media Session API Testing Instructions - v1.0.15

**Feature:** Lock Screen Controls & Notification Playback
**Implementation Date:** October 25, 2025
**Browser Support:** Chrome 73+, Safari 15+, Firefox 82+

---

## 🎯 WHAT TO TEST

The Media Session API adds native playback controls to:

- 📱 **iOS Lock Screen** (iPhone/iPad)
- 🔔 **Android Notification Tray**
- 💻 **Desktop Media Keys** (Chrome/Edge/Firefox)
- 🖥️ **Windows Action Center** / **macOS Touch Bar**

---

## 🌐 WEB BROWSER TESTING (Quick Test - 5 minutes)

### Prerequisites

- Chrome/Edge 73+ OR Firefox 82+ OR Safari 15+
- Dev server running at `http://localhost:5173`

### Step 1: Open Application

```
1. Open Chrome browser
2. Navigate to: http://localhost:5173
3. Log in to Vibe-Tutor
```

### Step 2: Open DevTools Console

```
1. Press F12 to open Chrome DevTools
2. Go to Console tab
3. Look for these messages:
   ✅ "Media Session API supported - lock screen controls enabled"
   ✅ "Media Session action handlers registered"
```

**✅ PASS if:** Both messages appear
**❌ FAIL if:** "Media Session API not supported" warning appears

---

### Step 3: Play a Music Track

```
1. Click "Music" in sidebar
2. Go to "Local Music" tab
3. Download a test track (or use existing downloaded track)
4. Click Play button on any track
```

**Check Console for:**

```
✅ "Media Session metadata updated: [Track Name]"
✅ "Media Session playback state: playing"
```

---

### Step 4: Test Desktop Media Keys

**Chrome/Edge (Windows/Mac):**

```
1. While music is playing, press keyboard media keys:
   - Play/Pause key → Should pause/resume playback
   - Next Track key → Should skip to next track
   - Previous Track key → Should go back

2. Check browser tab title - should show track info
3. Hover over tab - mini player may appear (Chrome feature)
```

**Firefox (Windows/Mac/Linux):**

```
1. Play music in Vibe-Tutor
2. Press media keys on keyboard
3. Verify controls work
```

**✅ PASS if:** Media keys control Vibe-Tutor playback
**❌ FAIL if:** Keys do nothing or control wrong app

---

### Step 5: Test Chrome Mini Player (Desktop)

**Chrome Only:**

```
1. Play music in Vibe-Tutor
2. Look for media controls in:
   - Browser tab (hover for mini player)
   - Windows: Bottom-right notification area
   - Mac: Notification Center

3. Verify you see:
   - Track name
   - Artist name
   - Album art (if available)
   - Play/Pause button
   - Next/Previous buttons
```

**✅ PASS if:** Mini player shows correct track info
**❌ FAIL if:** No mini player appears or info is wrong

---

### Step 6: Test Action Handlers

**In Vibe-Tutor Music Player:**

```
1. Play a track in a playlist (3+ tracks)
2. Use browser media controls to:
   ✅ Pause track
   ✅ Resume playback
   ✅ Skip to next track
   ✅ Go back to previous track
   ✅ Skip forward 10 seconds
   ✅ Skip backward 10 seconds
```

**Check Console After Each Action:**

```
"Media Session playback state: paused"
"Media Session playback state: playing"
"Position: 45.2s / 180.0s" (updates every ~5 seconds)
```

**✅ PASS if:** All controls work correctly
**❌ FAIL if:** Any control doesn't work

---

## 📱 MOBILE TESTING (iOS/Android)

### iOS Testing (iPhone/iPad - Safari 15+)

**Prerequisites:**

- iPhone/iPad with iOS 15.4 or later
- Safari browser

**Step 1: Access from Phone**

```
1. Connect phone to same WiFi as dev computer
2. Find computer's IP address:
   - Windows: ipconfig (look for IPv4 Address)
   - Mac: ifconfig (look for inet address)
3. On iPhone Safari, navigate to: http://[YOUR_IP]:5173
```

**Step 2: Play Music**

```
1. Open Vibe-Tutor in Safari
2. Navigate to Music → Local Music
3. Play a downloaded track
```

**Step 3: Lock Phone**

```
1. Press iPhone power button to lock screen
2. Wake screen (don't unlock)
3. You should see music player on lock screen with:
   ✅ Track name
   ✅ Artist name
   ✅ Album art
   ✅ Play/Pause button
   ✅ Next/Previous buttons
   ✅ Progress bar
```

**Step 4: Test Lock Screen Controls**

```
From lock screen:
1. Tap Pause → Music should pause
2. Tap Play → Music should resume
3. Tap Next → Should skip to next track
4. Tap Previous → Should go back
5. Drag progress bar → Should seek
```

**✅ PASS if:** All controls work from lock screen
**❌ FAIL if:** Controls don't appear or don't work

---

### Android Testing (Chrome Browser)

**Prerequisites:**

- Android 7+ device
- Chrome browser

**Step 1: Access from Phone**

```
1. Connect Android to same WiFi as dev computer
2. On Android Chrome, navigate to: http://[YOUR_IP]:5173
```

**Step 2: Play Music**

```
1. Open Vibe-Tutor
2. Navigate to Music → Local Music
3. Play a downloaded track
```

**Step 3: Check Notification**

```
1. Swipe down from top to open notification tray
2. You should see media notification with:
   ✅ Track name
   ✅ Artist name (if available)
   ✅ Album art
   ✅ Play/Pause button
   ✅ Next/Previous buttons
```

**Step 4: Test Notification Controls**

```
From notification:
1. Tap Pause → Music should pause
2. Tap Play → Music should resume
3. Tap Next → Should skip
4. Tap Previous → Should go back
5. Swipe notification away → Should pause music
```

**Step 5: Lock Screen Test**

```
1. Lock Android device
2. Wake screen (don't unlock)
3. Media controls should appear on lock screen
4. Test all buttons work
```

**✅ PASS if:** Notification and lock screen controls work
**❌ FAIL if:** No notification or controls don't work

---

## 🐛 TROUBLESHOOTING

### Issue: "Media Session API not supported" in Console

**Cause:** Old browser or unsupported browser
**Solution:**

- Chrome/Edge: Update to version 73 or later
- Safari: Update to iOS 15.4 / macOS 12+ or later
- Firefox: Update to version 82 or later

---

### Issue: Lock Screen Controls Don't Appear (iOS)

**Possible Causes:**

1. iOS version too old (need 15.4+)
2. Playing in Private/Incognito mode
3. Audio not actually playing
4. Website not added to Home Screen (not required but helps)

**Solution:**

1. Check iOS version: Settings → General → About → iOS Version
2. Use normal Safari tab (not Private)
3. Verify audio is playing with sound
4. Try adding to Home Screen: Share → Add to Home Screen

---

### Issue: Media Keys Control Wrong App

**Cause:** Multiple apps playing audio
**Solution:**

1. Close other music apps (Spotify, YouTube, etc.)
2. Refresh Vibe-Tutor
3. Start playing music in Vibe-Tutor first

---

### Issue: Album Art Not Showing

**Possible Causes:**

1. Track doesn't have embedded album art
2. Album art extraction failed
3. Image URL inaccessible

**Solution:**

- This is expected for tracks without album art
- Fallback: Vite logo shows instead
- Not a critical failure

---

### Issue: Position Bar Not Updating

**Expected Behavior:** Position updates every ~5 seconds (throttled)

**If Never Updates:**

1. Check console for errors
2. Verify track duration is valid (not NaN)
3. Try playing different track

---

## ✅ SUCCESS CRITERIA

**Web Browser (Desktop):**

- [ ] Media Session API supported message in console
- [ ] Media keys control playback
- [ ] Chrome mini player shows track info
- [ ] Play/pause/next/previous all work

**iOS (Safari):**

- [ ] Lock screen shows media player
- [ ] Album art displays correctly
- [ ] All controls work from lock screen
- [ ] Progress bar updates
- [ ] Seeking works

**Android (Chrome):**

- [ ] Notification appears when playing
- [ ] Notification shows track info
- [ ] All notification controls work
- [ ] Lock screen shows controls
- [ ] Swipe-to-dismiss pauses music

---

## 📊 TESTING CHECKLIST

Copy this checklist and fill it out:

```
DESKTOP BROWSER TESTING:
[ ] Chrome - Media keys work
[ ] Chrome - Mini player appears
[ ] Edge - Media keys work
[ ] Firefox - Media keys work
[ ] Safari - Media controls work (Mac only)

iOS TESTING:
[ ] Lock screen player appears
[ ] Album art shows correctly
[ ] Play/Pause works
[ ] Next/Previous works
[ ] Progress bar works
[ ] Seeking works

ANDROID TESTING:
[ ] Notification appears
[ ] Notification controls work
[ ] Lock screen controls work
[ ] Swipe-to-dismiss pauses

REGRESSION TESTING:
[ ] Music still plays normally in app
[ ] Download still works
[ ] Playlist queue still works
[ ] Volume controls still work
[ ] No new console errors
```

---

## 🎓 NOTES

**Performance Impact:** Minimal (~200 lines of code, <1KB gzipped)

**Battery Impact:** None (uses native OS media APIs)

**Compatibility:** Gracefully degrades on unsupported browsers (no errors, just no lock screen controls)

**Known Limitations:**

- Android WebView (Capacitor app) requires native plugin for full support
- Position updates throttled to 1/sec to avoid spam
- Some older devices may have buggy implementations

---

## 📝 REPORTING ISSUES

If you find issues, report with:

1. Device/Browser (e.g., "iPhone 14 Pro, iOS 16.3, Safari")
2. Steps to reproduce
3. Expected vs Actual behavior
4. Console errors (if any)
5. Screenshot/video of issue

Example:

```
Device: Samsung Galaxy S23, Android 13, Chrome 120
Issue: Notification doesn't show album art
Steps:
1. Play track "Song.mp3" with album art
2. Check notification tray
Expected: Album art shows in notification
Actual: Gray placeholder instead
Console: No errors
```

---

**Testing Duration:** ~15-20 minutes (web + mobile)
**Critical Tests:** Desktop media keys (5 min) + iOS/Android lock screen (10 min)

**Ready to test?** Open <http://localhost:5173> and start with desktop browser testing!
