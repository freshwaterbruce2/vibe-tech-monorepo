# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibe-Tutor is a Progressive Web App (PWA) and native Android app for high school students with ADHD and autism support. It combines AI-powered homework management, tutoring, gamification, **sensory settings**, **focus timer**, and **progress visualization** with offline-first architecture.

**Location:** `C:\dev\apps\vibe-tutor` (part of the C:\dev monorepo)

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind CSS 3, Capacitor 7.4.3, OpenRouter (Claude 4.5) + DeepSeek AI

**Package Manager:** pnpm (for faster installs and disk space efficiency)

**Neurodivergent Features:** Sensory controls (animation/sound/haptic), OpenDyslexic font, Pomodoro focus timer, emoji-limited AI responses, visual progress tracking

## Monorepo Context

This project is part of the C:\dev Nx monorepo. See the workspace-level CLAUDE.md at `C:\dev\CLAUDE.md` for monorepo workflow, git conventions, and shared tooling.

**Nx Integration:**

- Project tag: `scope:mobile`, `type:pwa`, `platform:android`, `language:typescript`
- Use Nx commands for better caching and affected detection
- All targets defined in `project.json`

## Development Commands

### Nx Commands (Recommended)

```bash
# Nx commands provide better caching and monorepo integration
pnpm nx dev vibe-tutor              # Start Vite dev server
pnpm nx build vibe-tutor            # Production build (cached)
pnpm nx android:sync vibe-tutor     # Sync web assets to Android
pnpm nx android:build vibe-tutor    # Build APK
pnpm nx android:deploy vibe-tutor   # Full build + install

# Check what's affected by your changes
pnpm nx affected:build              # Build only affected projects
```

### Bundle Analysis

After building, analyze the bundle size with the interactive visualizer:

```bash
# Build the project (generates bundle-analysis.html)
pnpm run build

# Open the analysis report
open dist/bundle-analysis.html   # macOS
start dist\bundle-analysis.html  # Windows (PowerShell)

# Or view in browser: file:///C:/dev/apps/vibe-tutor/dist/bundle-analysis.html
```

**Bundle Analysis Features:**

- **Treemap visualization**: Hierarchical view of all modules
- **Gzip sizes**: Actual sizes after compression (what users download)
- **Brotli sizes**: Alternative compression for modern browsers
- **Module breakdown**: Identify large dependencies and optimization opportunities

**Key Metrics (Current Build):**

- Total gzipped: ~92 KB (audio chunk) + ~82 KB (main chunk) = ~174 KB total
- Largest chunks:
  - `audio.js` (335 KB ungzipped, 92 KB gzipped) - howler + music-metadata-browser
  - `index.js` (279 KB ungzipped, 82 KB gzipped) - App.tsx and core logic
  - `WorksheetView.js` (145 KB ungzipped, 30 KB gzipped) - Worksheet features
  - `BrainGamesHub.js` (119 KB ungzipped, 23 KB gzipped) - Game components

**Optimization Tips:**

- Chunks are already code-split by feature (see manual chunk configuration in vite.config.ts)
- Audio libraries (howler, music-metadata-browser) are isolated in separate chunk
- UI components (lucide-react) are in dedicated chunk
- Capacitor APIs bundled together for Android efficiency

### Direct Commands (Alternative)

```bash
# Installation
pnpm install             # Install all dependencies

# Web Development
pnpm run dev             # Start Vite dev server (localhost:5173)
pnpm run build           # Production build
pnpm run preview         # Preview production build
pnpm start               # Start backend proxy server (port 3001)

# Android Development
pnpm run android:full-build    # Build web → sync → build APK
pnpm run android:deploy        # Full build → uninstall → install
pnpm run android:sync          # Copy web assets to android/
pnpm run android:build         # Build APK only (cd android && gradlew.bat assembleDebug)
pnpm run android:build:clean   # Clean build APK
pnpm run android:open          # Open Android Studio
pnpm run android:install       # Install APK on connected device
pnpm run android:uninstall     # Uninstall app from device
pnpm run android:logs          # View Capacitor logs via adb
pnpm run android:doctor        # Check Capacitor environment

# ⚠️ CRITICAL: MANDATORY BUILD PROCESS (ALWAYS FOLLOW THIS!)
# Changes won't apply without these steps!

# BEFORE EVERY BUILD:
# 1. Increment versionCode in android/app/build.gradle (REQUIRED!)
# 2. Delete ALL build caches:
Remove-Item -Recurse -Force dist, android\app\build, android\build, android\.gradle, .capacitor

# THEN BUILD:
pnpm run build                    # 1. Build web assets (creates dist/)
pnpm exec cap sync android        # 2. Copy to Android assets
cd android && .\gradlew.bat clean assembleDebug && cd ..  # 3. Build APK with clean
adb uninstall com.vibetech.tutor  # 4. MUST uninstall old version
adb install android\app\build\outputs\apk\debug\app-debug.apk  # 5. Install new

# WHY: versionCode tells Android it's a new app. Without incrementing it, Android uses cached old code!
# See BUILD_PROCESS_FIX_2025-11-11.md for full explanation.

# Play Store Release Build (AAB)
# FIRST TIME ONLY: Generate signing keystore
cd android
.\generate-keystore.ps1 -StorePassword "YOUR_STRONG_PASSWORD"  # Run once, backup keystore!
cd ..

# EVERY RELEASE: Build signed AAB
pnpm run build                         # 1. Build web assets
pnpm exec cap sync android             # 2. Sync to Android
cd android && .\gradlew.bat bundleRelease && cd ..  # 3. Build signed AAB

# AAB output: android/app/build/outputs/bundle/release/app-release.aab
# Upload this to Play Console
```

## ⚠️ CRITICAL: Regression Prevention Protocol

**When user requests "clean build" or "fresh install":**

### DO NOT assume features are missing! Follow this verification checklist

1. **Verify components exist:**

   ```bash
   # Check critical components
   Test-Path components\MusicLibrary.tsx
   Test-Path components\ParentDashboard.tsx
   Test-Path components\WorksheetView.tsx
   Test-Path components\SubjectCards.tsx
   Test-Path components\BrainGames.tsx
   ```

2. **Check App.tsx imports:**

   ```bash
   Select-String -Path App.tsx -Pattern "MusicLibrary|ParentDashboard|WorksheetView|BrainGames|SubjectCards"
   ```

3. **Verify file existence:**

   ```powershell
   Get-ChildItem components -Recurse -Filter "*.tsx" | Measure-Object
   ```

4. **Verify dependencies:**

   ```bash
   cat package.json
   ```

### Understanding "Clean Build"

**"Clean build" DOES NOT MEAN features are missing!**

It means:

- Remove old build artifacts (android/app/build/, dist/, .gradle/, etc.)
- Clean compilation from existing source code
- Fresh APK installation (uninstall old → install new)

### What to Clean

- ✓ Build directories: `android/app/build/`, `android/build/`, `android/.gradle/`
- ✓ Web dist: `dist/`
- ✓ Capacitor cache: `.capacitor/`
- ✓ Old APKs: `*.apk` files
- ✓ Test artifacts: `playwright-report/`, `test-results/`, `test_screenshots/`
- ✗ **DO NOT DELETE**: Source code (`components/`, `services/`, `App.tsx`)

### Only Report Regression If

- Component files are actually missing from filesystem
- Imports in App.tsx reference non-existent files
- package.json is missing critical dependencies

**See `REGRESSION_PREVENTION_2025-11-11.md` for detailed incident report.**

## Architecture Overview

### Project Structure

**Unusual Layout:** App.tsx and components are in the project root, NOT in src/

```
apps/vibe-tutor/
├── App.tsx              ← Main application (in root, not src/)
├── components/          ← 60+ UI components
├── services/            ← 40+ service modules
│   ├── dataStore.ts     ← NEW: Unified data access layer (single source of truth)
│   ├── databaseService.ts  ← SQLite database management
│   └── migrationService.ts ← localStorage → SQLite migration
├── types.ts             ← TypeScript interfaces
├── constants.ts         ← App constants
├── src/                 ← Minimal: config.ts, index.css, worker.js
├── android/             ← Native Android project
├── dist/                ← Build output (gitignored)
└── server.mjs           ← Backend proxy for DeepSeek API

D:\databases/            ← SQLite databases (per workspace-level CLAUDE.md)
└── vibe-tutor.db        ← Student data (homework, achievements, sessions)
```

### Core Application (App.tsx)

- **Single-file routing**: View state machine (dashboard | tutor | friend | achievements | parent | music | sensory | focus)
- **Lazy loading**: All major views lazy-loaded with Suspense boundaries
- **Inlined AI tutor**: `tutorService` embedded directly in App.tsx to avoid file proliferation
- **LocalStorage-first**: All state (homework, achievements, rewards, playlists, sensory prefs, focus sessions) persists client-side
- **Separate AI contexts**: Independent message histories for AI Tutor vs AI Buddy

### Services Architecture

**AI Integration (services/)**

- `secureClient.ts` - **Backend proxy pattern**: No API keys in client code, session token auth
- `homeworkParserService.ts` - Voice-to-homework parsing using DeepSeek structured outputs
- `buddyService.ts` - AI companion chat with emotional support personality
- `tutorService.ts` - AI Tutor logic (DeepSeek V3.2)
- `usageMonitor.ts` - Rate limiting for API calls
- `learningAnalytics.ts` - Session tracking and AI call tracing (logs to D: drive)

**Feature Services**

- `achievementService.ts` - Event-driven achievement system with localStorage persistence
- `breakdownService.ts` - Task decomposition using AI
- `musicService.ts` - Playlist management (Spotify/YouTube embeds)
- `downloadService.ts` - Local music downloads using Capacitor FileTransfer
- `audioPlayerService.ts` - Native audio playback
- `reportGeneratorService.ts` - AI progress report generation
- `learningAnalytics.ts` - Usage tracking and D: drive logging
- `uiService.ts` - Haptic feedback utilities

### Backend Proxy (server.mjs)

- **Purpose**: Secure API key storage, prevents client-side exposure
- **Dual-Model Architecture**:
  - **Primary**: OpenRouter (Claude 4.5 Sonnet) for high-quality tutoring
  - **Fallback**: DeepSeek R1 (free tier) for reliability
- **Session auth**: Token-based authentication with expiry and rate limiting
- **CORS handling**: Enables mobile/web cross-origin requests
- **Endpoints**:
  - `/api/session/init` - Create session token
  - `/api/openrouter/chat` - Claude/DeepSeek proxy (Smart Fallback)
  - `/api/chat` - Legacy DeepSeek endpoint

### Component Organization

**Core Components (components/)**

- `HomeworkDashboard.tsx` - Main dashboard with voice input, task grid, and WeekProgress chart
- `ChatWindow.tsx` - Shared chat UI for AI Tutor and AI Buddy with emoji limiting
- `ParentDashboard.tsx` - PIN-locked parental controls (progress, rewards, data export)
- `AchievementCenter.tsx` - Gamification badges and progress tracking
- `MusicLibrary.tsx` - Music player with native audio, retry logic, storage management
- `SensorySettings.tsx` - **NEW** Accessibility controls (animation/sound/font/color)
- `FocusTimer.tsx` - **NEW** Pomodoro timer (25min) with points system
- `WeekProgress.tsx` - **NEW** 7-day bar chart (focus minutes + tasks completed)
- `Sidebar.tsx` - Navigation with VibeTechLogo + sensory/focus buttons
- `ErrorBoundary.tsx` - Granular error handling
- `OfflineIndicator.tsx` - Network status monitoring

**UI Components**

- `AchievementPopup.tsx` - Toast notification for unlocked achievements
- `AddHomeworkModal.tsx` - Voice/text homework input with AI parsing
- `BreakdownModal.tsx` - AI-powered task decomposition
- `NotificationPanel.tsx` - Notification center
- `SecurePinLock.tsx` - PIN authentication for parent dashboard

### Database Architecture ⚠️ MIGRATION IN PROGRESS

**Status:** Transitioning from localStorage to SQLite for single source of truth

**Current State:**

- **App.tsx + 23 components:** Still using localStorage directly
- **SQLite Database:** `D:\databases\vibe-tutor.db` (schema ready, migration pending)
- **MCP Integration:** `sqlite-vibe-tutor` MCP server configured (see `.mcp.json`)

**Target Architecture (dataStore.ts):**

- Platform detection: Android/Windows → SQLite, Web → localStorage
- One-time migration: localStorage → SQLite on first Android/Windows run
- Unified API: `await dataStore.getHomeworkItems()` (abstracts storage layer)

**Data Schema (SQLite):**

```sql
homework_items        -- Tasks with due dates
user_progress         -- Subject-level progress tracking
achievements          -- Unlocked badges and progress
learning_sessions     -- Focus timer sessions, study time
rewards               -- Parent-configured rewards + claimed history
music_playlists       -- User playlists
user_settings         -- Key-value store (student_points, etc.)
user_preferences      -- Sensory settings, UI preferences
```

**Legacy localStorage Keys (Pre-Migration):**

```typescript
homeworkItems           // HomeworkItem[] → homework_items table
studentPoints          // number → user_settings.student_points
parentRewards          // Reward[] → rewards table
claimedRewards         // ClaimedReward[] → rewards.claimed = 1
achievements           // Achievement[] → achievements table
musicPlaylists         // MusicPlaylist[] → music_playlists table
sensory-prefs          // SensoryPreferences → user_preferences
focusSessions          // FocusSession[] → learning_sessions table
vibetutor_session      // Session token (sessionStorage, unchanged)
vibetutor_expiry       // Token expiry timestamp (sessionStorage, unchanged)
```

**See `DATABASE_ARCHITECTURE_FIX.md` for complete migration plan.**

## Critical Technical Patterns

### 1. Secure API Key Management

**Never expose DeepSeek API key in client code**

```typescript
// ❌ WRONG - Exposes API key in client bundle
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

// ✅ CORRECT - Use backend proxy
import { createChatCompletion } from './services/secureClient';
const response = await createChatCompletion(messages, options);
```

### 2. Capacitor HTTP (Mobile Only)

**Always use CapacitorHttp for network requests on Android**

```typescript
import { CapacitorHttp } from '@capacitor/core';

// ✅ Works reliably on Android
const response = await CapacitorHttp.request({
  url: API_CONFIG.baseURL + endpoint,
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  data: requestBody,
  connectTimeout: 30000,
  readTimeout: 30000
});
const result = response.data; // Already parsed JSON
```

**Why:** Capacitor 7's fetch() patching is unreliable. Explicit `CapacitorHttp` ensures native networking.

### 3. Tailwind CSS Version Lock

**Use Tailwind CSS v3.4.15 (not v4, not CDN)**

```bash
# ✅ CORRECT - Installed via pnpm with PostCSS
pnpm add -D tailwindcss@3.4.15 postcss autoprefixer

# ❌ WRONG - CDN breaks on Android WebView
<script src="https://cdn.tailwindcss.com"></script>
```

**Why:** Tailwind v4 uses CSS features (`@property`, `color-mix()`) requiring Chrome 111+. Many Android devices use older WebView versions (74+).

### 4. Version Management

**Increment versionCode on every Android build**

```gradle
// android/app/build.gradle
defaultConfig {
    versionCode 6      // ← Increment to force cache clear
    versionName "1.0.5"
}
```

### 5. AI Prompt Architecture (Neurodivergent Support)

AI prompts optimized for ADHD/autism (see `constants.ts`):

- Bullet points over paragraphs (working memory support)
- 2-3 sentence chunks (cognitive load management)
- One question at a time (executive function support)
- Limited emojis (sensory awareness)
- Direct language (no idioms/sarcasm)

## PWA + Capacitor Dual Deployment

This app runs as both a **Progressive Web App** (installable in browsers) and a **native Android app** (via Capacitor).

### PWA Features

- Service worker for offline caching
- `manifest.json` for installation
- Responsive design with glassmorphism UI
- Network status detection (`OfflineIndicator`)

### Capacitor Native Features

- File system access (music downloads)
- Haptic feedback
- Native HTTP (bypasses CORS)
- Wake lock (focus timer)

### Build Pipeline

```bash
# Web → Android workflow
pnpm run build                   # 1. Build web assets (dist/)
pnpm exec cap sync android       # 2. Copy dist/ → android/app/src/main/assets/public/
cd android && ./gradlew.bat assembleDebug  # 3. Build APK

# Shortcut (does all above + install)
pnpm run android:deploy
```

## Development Guidelines

### Adding New Features

1. **Components**: Add to `components/` (lazy load if new view)
2. **Services**: Add to `services/` for business logic
3. **Types**: Update `types.ts` with TypeScript interfaces
4. **State**: Use localStorage for persistence
5. **Achievements**: Add events to `achievementService.ts` if applicable
6. **AI Context**: Use `secureClient.ts` for DeepSeek API calls

### AI Service Integration

- All DeepSeek calls must go through `secureClient.ts` (backend proxy)
- Use structured outputs for parsing (homework voice input)
- Handle errors gracefully with fallback messages (see `tutorService` in App.tsx)
- Separate chat contexts for different personalities (tutor/buddy)

### Testing Mobile Builds

```bash
# CRITICAL: ALWAYS uninstall before installing to avoid cache issues
# Full test workflow (REQUIRED PROCESS):
pnpm run build                    # 1. Build web assets
pnpm exec cap sync android        # 2. Sync to Android
cd android && ./gradlew.bat assembleDebug  # 3. Build APK
cd ..
adb uninstall com.vibetech.tutor # 4. MUST remove old version first
adb install android/app/build/outputs/apk/debug/app-debug.apk  # 5. Install new version
# Open chrome://inspect/#devices to debug
```

**⚠️ CRITICAL REQUIREMENT**: Always delete old builds before installing new ones:

- Delete APK from device: `adb uninstall com.vibetech.tutor`
- Delete build artifacts: `rm -rf android/app/build/outputs/apk/*`
- This prevents cache issues and ensures new code runs

**Common Issues:** See [MOBILE-TROUBLESHOOTING.md](./MOBILE-TROUBLESHOOTING.md)

- Duplicate nav buttons → Tailwind v4 incompatibility
- Chat not working → Missing CapacitorHttp
- Stale code → Cache issues (increment versionCode AND uninstall old version)

### UI/UX Design System (Glassmorphism)

**Key CSS Classes** (defined in `index.html`):

```css
.glass-card          /* Semi-transparent surfaces with backdrop-filter blur */
.glass-button        /* Interactive buttons with gradient + shimmer effects */
.neon-text-primary   /* Purple neon text with glow */
.pulse-glow          /* Pulsing glow animation */
.float-animation     /* Subtle floating for logos */
```

**Color Palette**:

- Primary: `#8B5CF6` (electric purple)
- Accent: `#06B6D4` (neon cyan)
- Highlight: `#EC4899` (hot pink)

**Animation Patterns**:

- Entrance: `fadeInUp` with staggered delays
- Hover: Scale transforms + glow intensification
- Loading: Pulse animations

## Notable Implementation Details

### Focus Timer Accuracy

- Uses `targetTime` approach (not interval-based) for background accuracy
- Wake lock prevents screen sleep during sessions
- Audio context unlocking required for mobile browser compatibility

### Voice Input (Web Speech API)

- Integrated in `AddHomeworkModal.tsx`
- Sends natural language to `homeworkParserService.ts` for parsing
- DeepSeek returns structured JSON: `{ subject, title, dueDate }`
- Graceful fallback for unsupported browsers

### Parent Dashboard Security

- PIN-locked access (SHA-256 hashed PIN in localStorage)
- Data export/import (backup/restore entire app state)
- AI-generated progress summaries

### Achievement System

- Event-driven: `checkAndUnlockAchievements(event)` after user actions
- Progress tracking with goals
- Toast notifications via `AchievementPopup.tsx`

## Environment Setup

**Required:**

- Node.js (for npm)
- `.env.local` file with `DEEPSEEK_API_KEY=your_api_key` (backend only)
- **D:\databases\ directory** (SQLite storage per workspace convention)

**Optional (for Android):**

- Android Studio (for APK builds)
- ADB (for device installation)
- Java 17+ (for Gradle)

**MCP Integration:**

- `sqlite-vibe-tutor` MCP server provides Learning Dashboard access
- Queries `D:\databases\vibe-tutor.db` for student activity analytics
- See `.mcp.json` for configuration

**Configuration Files:**

- `capacitor.config.ts` - Capacitor settings, app ID
- `vite.config.ts` - Dev server proxy (`/api` → `localhost:3001`)
- `tailwind.config.js` - Tailwind v3 configuration
- `android/app/build.gradle` - Android version management
- `server.mjs` - Backend proxy server

## Additional Resources

### User Documentation

- **Parent Guide**: [PARENT_GUIDE.md](./PARENT_GUIDE.md) - User documentation
- **Neurodivergent Support**: [NEURODIVERGENT-SUPPORT.md](./NEURODIVERGENT-SUPPORT.md) - ADHD/autism accommodations (original design doc)

### Development Guides

- **Neurodivergent Features**: [NEURODIVERGENT_FEATURES_COMPLETE.md](./NEURODIVERGENT_FEATURES_COMPLETE.md) - Complete 4-week implementation guide
- **Music Player Enhancements**: [MUSIC_PLAYER_ENHANCEMENTS_v1.0.13.md](./MUSIC_PLAYER_ENHANCEMENTS_v1.0.13.md) - Phase 1 reliability improvements
- **UI Design**: [GLASSMORPHISM_GUIDE.md](./GLASSMORPHISM_GUIDE.md) - Design system details
- **Testing**: [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) - QA procedures
- **Troubleshooting**: [MOBILE-TROUBLESHOOTING.md](./MOBILE-TROUBLESHOOTING.md) - Android WebView issues

### Deployment & Operations

- **Kiosk Mode**: [KIOSK_MODE_SETUP.md](./KIOSK_MODE_SETUP.md) - Single-app lockdown for dedicated study devices
- **Version History**: [VERSION.md](./VERSION.md) - Release notes and changelog

### Play Store Submission (NEW)

- **Privacy Policy**: [docs/PRIVACY_POLICY.md](./docs/PRIVACY_POLICY.md) - Published at <https://freshwaterbruce2.github.io/vibetech/privacy-policy/>
- **Data Safety**: [docs/DATA_SAFETY.md](./docs/DATA_SAFETY.md) - Play Console form answers
- **Play Store Checklist**: [docs/PLAY_STORE_CHECKLIST.md](./docs/PLAY_STORE_CHECKLIST.md) - Complete submission guide
- **Store Description**: [docs/PLAY_STORE_DESCRIPTION.md](./docs/PLAY_STORE_DESCRIPTION.md) - Listing copy
- **Store Assets Guide**: [docs/STORE_ASSETS_GUIDE.md](./docs/STORE_ASSETS_GUIDE.md) - Icon, screenshots, graphics
- **Content Rating Guide**: [docs/CONTENT_RATING_GUIDE.md](./docs/CONTENT_RATING_GUIDE.md) - IARC questionnaire answers
- **QA Testing Checklist**: [docs/QA_TESTING_CHECKLIST.md](./docs/QA_TESTING_CHECKLIST.md) - Device testing procedures
- **Families U13 Roadmap**: [docs/FAMILIES_U13_ROADMAP.md](./docs/FAMILIES_U13_ROADMAP.md) - Future under-13 edition plan

## Current Stable Version

**v1.4.0 - "ASD Companion"** (versionCode 25)

- Released: 2024-11-14
- **Status**: READY FOR PLAY STORE SUBMISSION
- **ASD-Friendly Features**: Visual Schedules, First-Then Gate, Token Economy, Conversation Buddy, Parent Controls
- **Neurodivergent Features**: Sensory settings, focus timer, emoji-limited AI, progress visualization
- Key Features:
  - Visual Schedules (morning/evening routines)
  - First-Then Gate (unlock games after routine steps)
  - Token Economy (Roblox-style rewards)
  - Conversation Buddy (AI chat with Roblox-friendly tone)
  - Parent Controls (manage rules, time limits, calm mode)
  - Enhanced Word Hunt (difficulty levels, hints, celebrations)
  - Sensory controls (animation/sound/haptic/font/color)
  - Pomodoro focus timer (25min, 1pt/min)
  - WeekProgress chart (7-day bar chart)
  - Native audio for Android (better background playback)
  - AI responses limited to 2 emojis max
- Build: Signed AAB ready for Google Play Store
- Target Audience: 13-17 (Teens)

### Previous Stable Versions

**v1.0.12 - "Harmony"** (versionCode 13)

- Released: 2025-10-13
- Key Features: Fixed radio streams, full playlist navigation, enhanced download queue logging
- APK: `vibe-tutor-v1.0.12.apk`

### Previous Stable Versions

**v1.0.11 - "Soundwave"** (versionCode 12)

- Simplified HTML5 Audio for radio streaming
- 20 verified music tracks from Incompetech.com
- Sequential download queue implementation

**v1.0.5** (versionCode 6)

- Last stable version before music player feature
- APK: `vibe-tutor-v1.0.5-STABLE.apk`
- Git tag: `v1.0.5`

### Recovery Procedure

If build breaks, restore from backup:

```powershell
# List available backups
Get-ChildItem C:\dev\apps\vibe-tutor\_backups -Filter "*.zip" | Sort-Object LastWriteTime -Descending

# Extract backup to restore (replace with actual backup filename)
Expand-Archive -Path "_backups\Backup_YYYYMMDD_HHMMSS.zip" -DestinationPath ".\src-restored" -Force
```
