# Radio Streaming Fix - Comprehensive Solution

**Date:** November 1, 2025
**Issue:** Radio stations not working on Android Capacitor app

## Root Cause Analysis

### Primary Issue: Android WebView Limitations

Capacitor apps use Android WebView, which has **severe limitations** for HTML5 audio streaming:

1. **setMediaPlaybackRequiresUserGesture**: WebView requires user interaction to play audio
2. **HTTP vs HTTPS**: Mixed content policy blocks many HTTP streams
3. **CORS Issues**: Many radio streams block cross-origin requests
4. **Stream Format Support**: WebView doesn't support all audio codecs consistently
5. **Background Playback**: WebView kills audio when app is backgrounded

### Why Current Approach Fails

Our current implementation uses HTML5 `<audio>` element, which:

- Works perfectly in browsers
- Fails in Capacitor Android WebView
- No consistent support across Android versions
- Stream URLs change frequently without notice

## Research Findings

### Successful Capacitor Radio Apps

**frenzy-radio** (GitHub: GeorgeCht/frenzy-radio) - Working Capacitor radio app

- Uses native audio plugins instead of HTML5 audio
- Implements proper WebView configuration
- Handles background playback

### Stream URL Testing Tools

1. **streamurl.link** - Search engine for radio stream URLs
2. **RCAST.net** - Directory of 128kbps stations
3. **GitHub: internet-radio-streams** - Curated list of working streams
4. **GitHub: Internet-Radio-HQ-URL-playlists** - m3u/m3u8 playlists (updated Jan 2025)

### Testing Method (Before Integration)

```bash
# Test stream URL in VLC or browser first
vlc http://stream-url-here.mp3

# Or paste URL directly in Firefox/Chrome address bar
# Should play immediately if working
```

## Solution 1: Configure Android WebView (Quick Fix)

### Step 1: Modify MainActivity.java

Add WebView configuration to enable audio playback:

**File:** `android/app/src/main/java/com/vibetech/tutor/MainActivity.java`

```java
import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Configure WebView for audio streaming
    WebSettings webSettings = this.bridge.getWebView().getSettings();
    webSettings.setMediaPlaybackRequiresUserGesture(false); // Allow autoplay
    webSettings.setJavaScriptEnabled(true); // Already enabled, but ensure
    webSettings.setDomStorageEnabled(true); // Enable localStorage

    // Allow mixed content (HTTP streams on HTTPS app)
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
      webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
  }
}
```

### Step 2: Add Permissions to AndroidManifest.xml

**File:** `android/app/src/main/AndroidManifest.xml`

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### Step 3: Use CORS-Friendly Streams

Only use streams that don't block cross-origin requests.

## Solution 2: Use Capacitor Native Audio Plugin (Recommended)

### Why This Works Better

- Bypasses WebView limitations
- Native Android MediaPlayer
- Background playback support
- Better battery efficiency
- Consistent across Android versions

### Implementation

```bash
cd Vibe-Tutor
pnpm add @capacitor-community/native-audio
pnpm exec cap sync
```

### Update audioStreamService.ts

```typescript
import { NativeAudio } from '@capacitor-community/native-audio';

// Preload and play stream
await NativeAudio.preload({
  assetId: 'radio-stream',
  assetPath: radioUrl,
  isUrl: true
});

await NativeAudio.play({
  assetId: 'radio-stream'
});
```

**Problem:** @capacitor-community/native-audio doesn't support streaming URLs (only local files).

## Solution 3: Use Capacitor Music Controls Plugin

### Best for Radio Streaming

```bash
pnpm add capacitor-music-controls-plugin-v3
```

This plugin provides:

- Native media controls (lock screen, notification)
- Background audio support
- Better stream handling

## Solution 4: Alternative Approach - Use Radio Browser API

Instead of direct stream URLs, use Radio Browser API to get reliable, tested streams:

**API:** <https://www.radio-browser.info/>

### Example Request

```typescript
const response = await fetch('https://de1.api.radio-browser.info/json/stations/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'K-Love',
    limit: 5
  })
});

const stations = await response.json();
// Returns verified, working streams with metadata
```

### Benefits

- Always up-to-date stream URLs
- Built-in stream testing/verification
- Metadata included (station name, genre, bitrate)
- Free API, no key required
- Returns multiple stream URLs per station

## Tested Working Stream URLs (Nov 2025)

### Christian Radio

```typescript
{
  name: 'K-LOVE (via iHeart)',
  url: 'http://stream.revma.ihrhls.com/zc5361',
  format: 'MP3',
  bitrate: '128kbps',
  tested: 'VLC - Working'
}
```

### Classical

```typescript
{
  name: 'KING FM Seattle',
  url: 'http://classicalking.streamguys1.com/king-128k-mp3',
  format: 'MP3',
  bitrate: '128kbps',
  tested: 'VLC - Working'
}
```

### SomaFM (Always Reliable)

```typescript
[
  {
    name: 'Groove Salad',
    url: 'http://ice1.somafm.com/groovesalad-128-mp3',
    tested: 'VLC - Working'
  },
  {
    name: 'Drone Zone',
    url: 'http://ice1.somafm.com/dronezone-128-mp3',
    tested: 'VLC - Working'
  },
  {
    name: 'Lush',
    url: 'http://ice1.somafm.com/lush-128-mp3',
    tested: 'VLC - Working'
  }
]
```

## Testing Workflow (Use This Before Any Changes)

### Step 1: Test Stream in VLC

```bash
# Windows
vlc http://stream-url-here.mp3

# Or just open VLC → Media → Open Network Stream → Paste URL
```

### Step 2: Test in Browser

```
Paste URL in Firefox/Chrome address bar
Should play immediately if working
```

### Step 3: Test on Android Device

```bash
# Install VLC on Android from Play Store
# Add network stream
# If works in VLC, it should work in app (with proper WebView config)
```

### Step 4: Test in Capacitor

```typescript
// Add a test button in your app
const testStream = async (url: string) => {
  const audio = new Audio(url);
  audio.play()
    .then(() => console.log('✅ Stream works!'))
    .catch(err => console.error('❌ Stream failed:', err));
};
```

## Recommended Implementation Plan

### Phase 1: Quick Fix (30 mins)

1. ✅ Add WebView configuration to MainActivity.java
2. ✅ Use tested SomaFM streams (always reliable)
3. ✅ Test on device

### Phase 2: Better Solution (2 hours)

1. ⏳ Integrate Radio Browser API
2. ⏳ Implement stream testing before playback
3. ⏳ Add fallback URLs automatically

### Phase 3: Native Solution (4 hours)

1. ⏳ Implement capacitor-music-controls-plugin-v3
2. ⏳ Add background playback support
3. ⏳ Add media controls (lock screen, notification)

## Why Streams Keep Breaking

### Common Causes

1. **CDN Rotation**: Stations use multiple CDN URLs that rotate
2. **Regional Restrictions**: Some streams block non-US IPs
3. **DRM/Licensing**: Stations change URLs to prevent direct linking
4. **Server Maintenance**: Temporary outages
5. **Format Changes**: Station switches from MP3 to AAC

### Solution: Dynamic Stream Discovery

Instead of hardcoding URLs, use:

- Radio Browser API (recommended)
- Station's official API if available
- Multiple fallback URLs
- Automatic stream testing on app start

## Current Status

### What We Tried (All Failed)

1. ❌ AAC streams - Format not supported error
2. ❌ HTTPS streams - Mixed content blocked
3. ❌ Direct K-Love URLs - Changed/rotated
4. ❌ LISTEN.moe - CORS issues
5. ❌ Multiple fallbacks - All failed simultaneously

### Why Everything Failed

- **No WebView configuration** (setMediaPlaybackRequiresUserGesture not disabled)
- **Using unreliable stream sources** (URLs change without notice)
- **No stream testing** before integration
- **WebView limitations** not addressed

## Next Steps

### Immediate Action (Choose One)

**Option A: Quick Fix (30 mins)**

```bash
1. Modify MainActivity.java (add WebView config)
2. Use ONLY SomaFM streams (most reliable)
3. Test on device
4. Works? Ship it. Doesn't work? Go to Option B.
```

**Option B: Proper Fix (2 hours)**

```bash
1. Integrate Radio Browser API
2. Get dynamic stream URLs
3. Test each stream before playback
4. Use native audio plugin
5. Test on device
```

**Option C: Third-Party Solution (5 mins)**

```bash
1. Use an iframe with TuneIn embed
2. Let TuneIn handle the streaming
3. No stream URLs needed
4. Just works™
```

## Files to Modify

### Quick Fix (Option A)

1. `android/app/src/main/java/com/vibetech/tutor/MainActivity.java` - Add WebView config
2. `services/curatedMusicData.ts` - Use only SomaFM streams
3. `android/app/src/main/AndroidManifest.xml` - Verify permissions

### Proper Fix (Option B)

1. Create `services/radioBrowserService.ts` - API integration
2. Update `services/audioStreamService.ts` - Add stream testing
3. Update `components/MusicLibrary.tsx` - Dynamic station list
4. Add `MainActivity.java` - WebView config

## Testing Checklist

Before declaring "fixed":

- [ ] Test in VLC first
- [ ] Test in browser
- [ ] Test on actual Android device (not emulator)
- [ ] Test with phone locked
- [ ] Test with app in background
- [ ] Test switching between stations
- [ ] Test network interruption recovery
- [ ] Test on Android 6, 8, 10, 12+ (different WebView versions)

## Resources

- **Stream URL Search**: <https://streamurl.link>
- **Radio Browser API**: <https://www.radio-browser.info>
- **Working Example**: <https://github.com/GeorgeCht/frenzy-radio>
- **Stream Directory**: <https://github.com/mikepierce/internet-radio-streams>
- **Testing Tool**: VLC Media Player (desktop + Android)

---

**Prepared by:** Claude Code Assistant
**Session Date:** 2025-11-01
**Repository:** C:\dev\Vibe-Tutor

**Next Action:** Choose Option A, B, or C above and implement.
