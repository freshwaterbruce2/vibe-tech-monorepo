# Music Player Troubleshooting Guide

This guide covers common issues with the Vibe-Tutor music player feature and how to resolve them.

## Radio Streaming Issues

### Problem: Radio station not playing

**Symptoms:**

- Station appears to start but no audio plays
- Error message "Stream not available" or "Network error"
- Audio indicator shows playing but nothing is heard

**Diagnostic Steps:**

1. **Check console logs** (chrome://inspect):

   ```
   [AudioStream] Audio playback error: MEDIA_ERR_SRC_NOT_SUPPORTED
   ```

2. **Test stream URL directly**:
   - Open the stream URL in a browser tab
   - Should prompt to download or play audio file
   - If 404 or connection error, stream is offline

**Common Causes:**

| Issue | Solution |
|-------|----------|
| Stream URL changed/outdated | Update `curatedMusicData.ts` with new URL from station website |
| HTTP instead of HTTPS | Change to HTTPS variant if available (Android WebView prefers HTTPS) |
| Unsupported format (Ogg, FLAC) | Use MP3 or AAC streams for maximum compatibility |
| CORS restrictions | Use stations that allow cross-origin streaming |
| Station temporarily offline | Wait or replace with alternative station |

**Fix Process (v1.0.12 example):**

RadioMV failed because the stream URL was incorrect. We:

1. Searched for alternative Christian radio with public MP3 stream
2. Found Moody Radio Praise & Worship: `https://playerservices.streamtheworld.com/api/livestream-redirect/IM_1.mp3`
3. Updated `curatedMusicData.ts` RADIO_STATIONS array
4. Tested on device - stream works reliably

### Problem: Radio plays on browser but not Android

**Cause:** Android WebView (Capacitor) has stricter requirements than desktop browsers.

**Solutions:**

- Use direct stream URLs, not playlist files (.m3u, .pls)
- Prefer MP3 or AAC formats
- Ensure HTTPS, not HTTP
- Test stream compatibility: `https://hls.somafm.com` works better than `http://ice.somafm.com`

### Problem: "Fallback audio not initialized" error

**Fixed in v1.0.11**

**Root Cause:** `nativeAudioService.ts` called async `init()` in constructor without await, causing `fallbackAudio` to be null when `play()` was called.

**Solution:** Rewrote as `audioStreamService.ts` with synchronous constructor:

```typescript
constructor() {
  this.audio = new Audio();  // Immediate initialization
  this.audio.preload = 'none';
  this.setupListeners();
}
```

## Download Queue Issues

### Problem: Only 1 download completes, others fail or don't start

**Symptoms:**

- First track downloads successfully
- Subsequent tracks appear to queue but never download
- No progress updates after first download

**Diagnostic Steps:**

1. **Enable enhanced logging** (v1.0.12+):

   ```
   [DownloadQueue] ===== ADD TO QUEUE =====
   [DownloadQueue] Track: Canon in D
   [DownloadQueue] Current queue length: 2
   [DownloadQueue] ✅ Track added successfully
   [DownloadQueue] 🚀 STARTING QUEUE PROCESSING
   ```

2. **Check for errors**:

   ```
   [DownloadQueue] ❌ DOWNLOAD FAILED
   [DownloadQueue] - Error: Failed to download file
   ```

**Common Causes:**

| Issue | Solution |
|-------|----------|
| Multiple FileTransfer listeners | Use singleton listener pattern (fixed in v1.0.10) |
| Storage permission denied | Check Android app permissions |
| Network interruption | Ensure stable connection during downloads |
| Invalid download URL | Verify URLs return HTTP 200 with audio content |
| Queue not processing | Check `isProcessing` and `isPaused` flags in logs |

**Fix Process (v1.0.10):**

Original `downloadService.ts` created new listener for each download:

```typescript
// ❌ OLD - Multiple listeners conflict
await FileTransfer.addListener('progress', (progress) => { ... });
```

Fixed with singleton pattern:

```typescript
// ✅ NEW - Single global listener
let globalProgressListener: any = null;

if (globalProgressListener) {
  await globalProgressListener.remove();  // Remove old listener first
}

globalProgressListener = await FileTransfer.addListener('progress', ...);
```

### Problem: Downloads succeed but "must delete before downloading another"

**Fixed in v1.0.10**

**Cause:** Download service didn't clean up FileTransfer listeners, causing conflicts.

**Solution:** `downloadQueueManager.ts` processes downloads sequentially:

```typescript
while (this.queue.length > 0 && !this.isPaused) {
  const download = this.queue.shift();
  await downloadMusicFile(download.track, download.onProgress);
  await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
}
```

## Track Selection / Playback Issues

### Problem: Can't select which downloaded track to play

**Fixed in v1.0.12**

**Symptoms:**

- Clicking a track plays it but next/previous buttons don't work
- Playlist navigation skips tracks or plays wrong track
- Only one track can be played at a time

**Root Cause:** `handlePlayTrack()` only loaded single track instead of full playlist:

```typescript
// ❌ OLD - Only loads single track
await audioPlayer.loadTrack(track);
```

**Solution:** Load full playlist with correct start index:

```typescript
// ✅ NEW - Full playlist navigation
const downloadedTracks = localTracks.filter(t => t.downloadStatus === 'completed');
const trackIndex = downloadedTracks.findIndex(t => t.id === track.id);
audioPlayer.loadPlaylist(downloadedTracks, trackIndex);
```

**Benefits:**

- Click any track to start playing from that position
- Next/Previous buttons work across entire library
- Seamless playlist experience

### Problem: Track plays but progress bar doesn't update

**Check:** Ensure `audioPlayer.onStatusChange()` is subscribed in component:

```typescript
useEffect(() => {
  audioPlayer.onStatusChange(setPlaybackStatus);
}, []);
```

## Storage & File Access Issues

### Problem: "Track file not found" error when playing downloaded track

**Causes:**

- File was deleted outside the app
- Storage permission revoked
- Invalid file path in localStorage

**Solution:**

```typescript
// Graceful error handling in audioPlayerService.ts
if (!track.localPath) {
  throw new Error('Track file not found. Please download it again.');
}
```

Display error to user and allow re-downloading.

## Debugging Checklist

Before reporting a music player bug:

1. **Check chrome://inspect logs** for detailed error messages
2. **Verify stream URLs** by opening in browser tab
3. **Test download URLs** with `curl` or browser download
4. **Check Android permissions**: Storage, Network
5. **Increment versionCode** in build.gradle to clear WebView cache
6. **Test on real device** (emulator has different audio capabilities)

## Version History

- **v1.0.12**: Fixed radio streams, playlist navigation, enhanced logging
- **v1.0.11**: Simplified HTML5 Audio, 20 verified tracks
- **v1.0.10**: Download queue with singleton listener pattern
- **v1.0.9**: Initial music player feature

## Useful Resources

**Radio Stream Directories:**

- SomaFM: <https://somafm.com/> (all stations provide direct MP3 streams)
- Moody Radio: <https://www.moodyradio.org/> (Christian music)
- LISTEN.moe: <https://listen.moe/> (Anime/J-pop)

**Testing Tools:**

- Chrome DevTools Mobile Emulation
- chrome://inspect for Android device debugging
- Capacitor Doctor: `npx cap doctor`

**File Locations:**

- Radio stations: `services/curatedMusicData.ts`
- Download queue: `services/downloadQueueManager.ts`
- Audio streaming: `services/audioStreamService.ts`
- Local playback: `services/audioPlayerService.ts`
- UI component: `components/MusicLibrary.tsx`
