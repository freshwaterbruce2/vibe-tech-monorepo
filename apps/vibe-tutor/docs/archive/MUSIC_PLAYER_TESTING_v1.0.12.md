# Music Player Testing Guide - v1.0.12

Quick reference for testing the music player fixes in version 1.0.12.

## Prerequisites

1. **Device Setup**:
   - Android device connected via USB
   - USB debugging enabled
   - APK v1.0.12 installed (versionCode 13)

2. **Debugging Setup**:
   - Open **chrome://inspect** on computer
   - Click "inspect" on com.vibetech.tutor WebView
   - Keep console open to view `[DownloadQueue]` logs

## Test 1: Radio Streaming (5 stations)

**Expected Result:** All 5 stations stream without errors

### Procedure

1. Launch Vibe-Tutor app
2. Navigate to "Music Library" tab
3. Scroll to "Radio Stations" section
4. Test each station individually:

| Station | Genre | Expected Behavior | Notes |
|---------|-------|-------------------|-------|
| LISTEN.moe - Anime (JPOP) | J-Pop/Anime | Streams anime music | ✅ Previously working |
| LISTEN.moe - KPOP | K-Pop | Streams Korean pop | ✅ Previously working |
| R/a/dio - Anime Radio | Anime/Japanese | Streams anime radio | ✅ Previously working |
| **Moody Radio - Praise & Worship** | **Christian** | **Streams worship music** | **🆕 NEW - K-LOVE alternative** |
| **SomaFM - Groove Salad** | **Ambient/Chill** | **Streams ambient music** | **🔧 FIXED - Now HTTPS** |

### Test Steps per Station

1. Tap station card
2. **Wait 2-3 seconds** for stream to buffer
3. **Listen for audio** (should start playing)
4. Check console for errors:

   ```
   ✅ GOOD: [AudioStream] Stream loaded successfully
   ❌ BAD:  [AudioStream] Audio playback error: MEDIA_ERR_NETWORK
   ```

5. Tap stop button
6. Move to next station

### Pass Criteria

- ✅ Audio plays within 3 seconds
- ✅ No error messages in console
- ✅ Stop button works correctly

### Fail Criteria

- ❌ "Stream not available" error
- ❌ Audio indicator shows playing but silence
- ❌ Connection errors in console

---

## Test 2: Download Queue (Sequential Processing)

**Expected Result:** All 5 tracks download successfully without deletion

### Procedure

1. Scroll to "Curated Music Library" section
2. **Queue 5 tracks rapidly** (tap Download button for each):
   - **Track 1**: "Floating Cities" (Lo-fi)
   - **Track 2**: "Merry Go" (Lo-fi)
   - **Track 3**: "Cipher" (Lo-fi)
   - **Track 4**: "Gymnopedie No 1" (Classical)
   - **Track 5**: "Canon in D" (Classical)

3. **Watch console logs** - Should see:

   ```
   [DownloadQueue] ===== ADD TO QUEUE =====
   [DownloadQueue] Track: Floating Cities
   [DownloadQueue] ✅ Track added successfully
   [DownloadQueue] New queue length: 1

   [DownloadQueue] ===== ADD TO QUEUE =====
   [DownloadQueue] Track: Merry Go
   [DownloadQueue] ✅ Track added successfully
   [DownloadQueue] New queue length: 2

   [DownloadQueue] 🚀 STARTING QUEUE PROCESSING
   [DownloadQueue] Queue length: 5

   [DownloadQueue] ===== DOWNLOAD 1 =====
   [DownloadQueue] Track: Floating Cities
   [DownloadQueue] 📥 Starting download: Floating Cities
   [DownloadQueue] ✅ DOWNLOAD SUCCESS
   [DownloadQueue] - Size: 3.20 MB
   [DownloadQueue] - Duration: 8.45s

   [DownloadQueue] ⏳ Waiting 500ms before next download (4 remaining)...

   [DownloadQueue] ===== DOWNLOAD 2 =====
   ...
   ```

4. **Monitor progress**:
   - Each track shows progress bar (0% → 100%)
   - Downloads happen **one at a time** (sequential)
   - 500ms delay between each download

5. **Verify completion**:
   - Scroll to "Your Music" section
   - Should see all 5 tracks listed
   - Each track shows "Downloaded" status

### Pass Criteria

- ✅ All 5 tracks appear in queue logs
- ✅ Downloads process sequentially (not parallel)
- ✅ All 5 downloads show "✅ DOWNLOAD SUCCESS"
- ✅ No deletion required between downloads
- ✅ All tracks visible in "Your Music" list

### Fail Criteria

- ❌ Only 1 track completes
- ❌ "❌ DOWNLOAD FAILED" errors in logs
- ❌ Queue processing stops prematurely
- ❌ Duplicate rejection errors (unless same track added twice)

---

## Test 3: Track Selection & Playlist Navigation

**Expected Result:** Full playlist navigation works from any track

### Procedure

1. In "Your Music" section, verify all 5 downloaded tracks are listed
2. **Tap to play middle track** (Track 3: "Cipher")
   - Track should start playing immediately
   - Playback controls appear (play/pause, next, previous)

3. **Test Next Button**:
   - Tap "Next" button
   - Should play Track 4: "Gymnopedie No 1"
   - Check console:

     ```
     [AudioPlayer] Loading track from playlist: Gymnopedie No 1 (index 3/5)
     ```

4. **Test Next Again**:
   - Tap "Next" button
   - Should play Track 5: "Canon in D"

5. **Test Previous Button**:
   - Tap "Previous" button
   - Should return to Track 4: "Gymnopedie No 1"

6. **Test Track Selection**:
   - While Track 4 is playing, tap Track 1: "Floating Cities"
   - Should load playlist from Track 1 forward
   - Tap "Next" should play Track 2: "Merry Go"

7. **Test Pause/Resume**:
   - Tap pause button
   - Audio should stop
   - Tap play button
   - Audio should resume from same position

### Pass Criteria

- ✅ Clicking any track loads playlist from that position
- ✅ Next button advances through tracks
- ✅ Previous button goes back (or restarts current if >3s played)
- ✅ Pause/resume works correctly
- ✅ Progress bar updates during playback

### Fail Criteria

- ❌ Can only play one track at a time (no next/previous)
- ❌ Next/previous buttons don't work
- ❌ Clicking different track doesn't load playlist
- ❌ Track skips or plays wrong file

---

## Test 4: Storage & Management

**Expected Result:** Accurate storage display and track deletion

### Procedure

1. Check "Storage Used" display
   - Should show approximately: "15-20 MB used"
   - (5 tracks × ~3-5 MB each)

2. **Delete one track**:
   - Tap trash icon on "Canon in D"
   - Confirm deletion
   - Track disappears from list
   - Storage display updates (should decrease by ~5 MB)

3. **Verify playlist updates**:
   - If "Gymnopedie No 1" is playing
   - Tap "Next"
   - Should go to "Floating Cities" (skipping deleted track)

### Pass Criteria

- ✅ Storage display accurate within 10% margin
- ✅ Deleted track removed from list
- ✅ Storage display updates immediately
- ✅ Playlist navigation skips deleted tracks

---

## Reporting Results

### If All Tests Pass

Confirm with user:

```
✅ All 5 radio stations working
✅ 5 tracks downloaded successfully
✅ Full playlist navigation working
✅ Storage management accurate
v1.0.12 STABLE - Ready for production
```

### If Issues Found

**For Radio Streaming Issues:**

- Note which station(s) failed
- Copy exact error message from console
- Include station name and stream URL

**For Download Queue Issues:**

- Copy full `[DownloadQueue]` log output
- Note how many downloads completed (1/5, 2/5, etc.)
- Include any error messages

**For Track Selection Issues:**

- Describe which navigation action failed (next/previous/selection)
- Note current playlist state (which tracks were downloaded)
- Check if audioPlayer.loadPlaylist() was called in logs

## Quick Verification Script

Run this in chrome://inspect console to check system state:

```javascript
// Check localStorage for downloaded tracks
const localTracks = JSON.parse(localStorage.getItem('localTracks') || '[]');
console.log('Downloaded tracks:', localTracks.filter(t => t.downloadStatus === 'completed').length);

// Check download queue status
console.log('Queue status:', downloadQueue.getStatus());

// Check current playback
console.log('Current track:', audioPlayer.getCurrentTrack()?.name);
console.log('Is playing:', audioPlayer.isPlaying());
```

## Version Verification

Confirm you're testing the correct version:

```bash
# Check version in build.gradle
cat android/app/build.gradle | grep versionCode
# Should show: versionCode 13

cat android/app/build.gradle | grep versionName
# Should show: versionName "1.0.12"
```

Or check in app logs:

```
I Capacitor: Deploying Capacitor v7.4.3
I CapacitorApp: App version: 1.0.12 (13)
```

---

## Emergency Rollback

If v1.0.12 has critical issues:

```bash
cd /c/dev/Vibe-Tutor
git checkout v1.0.11  # Rollback to previous stable
pnpm run android:deploy
```

Previous version (v1.0.11) had:

- ✅ Simplified HTML5 Audio working
- ⚠️ RadioMV and SomaFM not working
- ⚠️ No playlist navigation (single track only)
- ⚠️ Download queue less reliable
