# Vibe-Tutor Release Notes

## Version 1.0.12 - "Harmony" (2025-10-13)

Music player reliability improvements with updated radio streams and enhanced playlist navigation.

### 🎵 Music Player Fixes

**Radio Streaming:**

- Replaced non-working RadioMV stream with **Moody Radio - Praise & Worship** (K-LOVE alternative)
- Updated SomaFM Groove Salad to HTTPS AAC stream for better compatibility
- All 5 radio stations now use verified working URLs (October 2025)
- Improved error handling with specific messages for network and format issues

**Track Selection:**

- Fixed track selection to load full playlist instead of single track
- Clicking any downloaded track now enables next/previous navigation
- Seamless playlist playback across all downloaded music

**Download Queue:**

- Enhanced diagnostic logging for troubleshooting queue issues
- Detailed progress tracking with file size, duration, and success/failure indicators
- Sequential download processing with 500ms delay between tracks

### 📋 Technical Details

- **versionCode**: 13
- **versionName**: "1.0.12"
- **Build Size**: ~5.8 MB (web assets)
- **Radio Stations**: 5 verified working streams
- **Music Categories**: Lo-fi, Anime, Christian Worship, Classical

### 🔧 Files Modified

- `services/curatedMusicData.ts` - Updated radio station URLs
- `services/downloadQueueManager.ts` - Enhanced logging for debugging
- `components/MusicLibrary.tsx` - Fixed playlist navigation in handlePlayTrack()
- `android/app/build.gradle` - Version bump to 1.0.12

---

## Version 1.0.11 - "Soundwave" (2025-10-12)

Complete music player overhaul with simplified HTML5 Audio and verified track catalog.

### 🎵 Music Player Improvements

- Replaced nativeAudioService with simplified HTML5 Audio for better reliability
- Fixed "Fallback audio not initialized" error in radio playback
- Added 20 fresh verified tracks from Incompetech.com (Kevin MacLeod)
- Implemented sequential download queue to prevent conflicts

### 🐞 Bug Fixes

- Fixed async constructor issue causing null audio references
- Implemented singleton FileTransfer listener pattern
- Resolved download conflicts requiring track deletion between downloads

---

## Version 1.0.0 - "Phoenix" (Production Launch)

This is the first official production release of Vibe-Tutor! This release focuses on stability, mobile readiness, and a comprehensive feature set for students and parents.

### ✨ New Features

-   **Parent Dashboard**: A comprehensive, PIN-protected "Parent Zone" has been added.
  -   View high-level statistics on completed assignments and focus sessions.
  -   Get a privacy-conscious, AI-generated summary of student progress.
-   **Progressive Web App (PWA)**: Vibe-Tutor can now be installed directly to an Android phone's home screen for a native app-like experience, including offline access for core features.
-   **Data Management**: Parents can now export all app data for backup and import it from a file. A full app reset option is also available.
-   **AI Task Breakdown**: Students can now use an AI-powered feature to break down any homework assignment into small, manageable steps.
-   **Achievement System**: A new system to reward student progress by unlocking achievements for completing tasks and finishing focus sessions.
-   **Mood Tracker**: A simple, emoji-based mood tracker on the dashboard allows students to check in with their feelings.

### 🚀 Improvements & Optimizations

-   **Performance Boost (Lazy Loading)**: Major components are now lazy-loaded, dramatically improving the app's initial startup time.
-   **Resilient Focus Timer**: The timer logic remains accurate even when the app is running in the background, a critical fix for mobile usability.
-   **Screen Wake Lock**: The device screen is now prevented from sleeping while the Focus Timer is active.
-   **Haptic Feedback**: Key interactions, like completing a task or starting the timer, now provide tactile vibration feedback on supported mobile devices.
-   **Improved Error Handling**: The app now features granular error boundaries, preventing a crash in one component from taking down the entire application.
-   **Offline Support**: An offline indicator now appears when connectivity is lost. AI Task Breakdowns are also cached to be viewable offline after first use.
-   **Mobile Audio Reliability**: The audio chime for the Focus Timer has been optimized to play more reliably on mobile browsers.
-   **Accessibility Enhancements**: Added ARIA labels and roles to improve navigation and usability for users with screen readers.
-   **Graceful Degradation**: The voice input feature now detects if the browser supports it and displays a helpful message if it doesn't.

### 🐞 Bug Fixes

-   **Fixed**: Focus Timer would become inaccurate if the browser tab was inactive.
-   **Fixed**: "Add with Voice" button was present but non-functional on unsupported browsers.
-   **Mitigated**: Audio chimes could be blocked by mobile browsers.
-   **Fixed**: App would crash completely on certain rendering errors.
