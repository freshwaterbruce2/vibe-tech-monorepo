# Vibe-Tutor - Project Context

**Type**: Mobile Application (Capacitor 7 + React 19)
**Agent**: mobile-expert
**Status**: Production (v1.5.4+)
**Token Count**: ~650 tokens

---

## Overview

AI-powered homework manager for students with offline support.

**Key Features**:

- Assignment tracking with reminders
- AI homework help (Claude 4.5 + DeepSeek R1 fallback)
- Camera integration (take photos of homework)
- Offline mode (PWA capabilities)
- Android native app (Capacitor)

---

## Tech Stack

**Frontend**: React 19, TypeScript 5.9+, Vite 7
**UI**: shadcn/ui, Tailwind CSS 3.4.18 (NOT v4 - WebView incompatible)
**Mobile**: Capacitor 7 (Android WebView)
**State**: Zustand, TanStack Query
**Backend**: Express Proxy (port 3001) with OpenRouter
**Database**: SQLite (via @capacitor-community/sqlite)
**AI**: OpenRouter (Claude 4.5 primary, DeepSeek R1 fallback)

---

## Directory Structure

```
apps/vibe-tutor/
├── src/
│   ├── components/        # React components
│   │   ├── assignments/   # Assignment cards, forms
│   │   ├── ai-chat/       # AI homework helper
│   │   └── camera/        # Photo capture
│   ├── services/          # API clients
│   │   ├── assistantClient.ts  # AI API client
│   │   └── storage.ts          # Local storage
│   ├── hooks/             # React hooks
│   └── types/             # TypeScript types
├── render-backend/        # Express proxy (OpenRouter)
│   └── server.mjs         # Backend server
├── android/               # Capacitor Android project
│   └── app/
│       ├── build.gradle   # versionCode (increment before builds!)
│       └── src/main/      # Android assets
└── capacitor.config.ts    # Capacitor configuration
```

---

## Common Workflows

### 1. USB Debugging Setup

```powershell
# ALWAYS use adb reverse for reliable localhost access
adb reverse tcp:3001 tcp:3001

# Start backend
cd apps/vibe-tutor/render-backend
node server.mjs

# Run on device (USB connected)
pnpm nx android:deploy vibe-tutor
```

### 2. AI Homework Help

```typescript
// assistantClient.ts handles session tokens automatically
import { AssistantClient } from '@/services/assistantClient';

const client = new AssistantClient();
const response = await client.sendMessage('Help me solve this math problem');
```

### 3. Camera Integration

```typescript
import { Camera } from '@capacitor/camera';

const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.Uri,
});
```

### 4. Capacitor HTTP (NEVER use fetch directly!)

```typescript
// CORRECT - Use CapacitorHttp explicitly
import { CapacitorHttp } from '@capacitor/core';

const response = await CapacitorHttp.request({
  url: 'http://localhost:3001/api/chat',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  data: { message: 'Hello' },
});
```

---

## Database Schema

**Path**: Local SQLite via `@capacitor-community/sqlite`

**Tables**:

- `assignments` - Homework assignments
- `subjects` - School subjects
- `reminders` - Due date notifications
- `chat_history` - AI conversations
- `settings` - User preferences

---

## Critical Android Rules

### 1. NEVER use Tailwind CSS from CDN

**Reason**: Android WebView incompatible with Tailwind v4
**Solution**: Use Tailwind CSS 3.4.18 via npm

```json
{
  "dependencies": {
    "tailwindcss": "3.4.18" // NOT v4!
  }
}
```

### 2. ALWAYS increment versionCode before builds

**Reason**: Android caches WebView assets aggressively
**Solution**: Edit `android/app/build.gradle`

```gradle
versionCode 105  // Increment this!
versionName "1.5.4"
```

### 3. ALWAYS use CapacitorHttp explicitly

**Reason**: fetch() auto-patching is unreliable
**Solution**: Import CapacitorHttp and use request() method

### 4. NEVER test on emulator only

**Reason**: Emulator doesn't catch real device issues
**Solution**: Test on real Android device via USB

---

## Common Issues

### Issue: "Network request failed" on Android

**Solution**: Use adb reverse + CapacitorHttp

```powershell
adb reverse tcp:3001 tcp:3001
```

### Issue: UI not updating after build

**Solution**: Increment versionCode in build.gradle

```gradle
versionCode 106  // Force cache clear
```

### Issue: Camera not working

**Solution**: Add permissions to AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

---

## Build & Deployment

### Development (Browser)

```bash
pnpm nx dev vibe-tutor        # Test in browser first
```

### Android Build

```bash
# 1. Build React app
pnpm nx build vibe-tutor

# 2. Sync to Android
pnpm nx android:sync vibe-tutor

# 3. Build APK
pnpm nx android:build vibe-tutor

# Full pipeline (recommended)
pnpm nx android:deploy vibe-tutor
```

### Backend Server

```bash
cd apps/vibe-tutor/render-backend
node server.mjs  # Runs on port 3001
```

---

## Anti-Duplication Checklist

Before implementing features:

1. Check `src/components/` for existing UI
2. Check `src/services/assistantClient.ts` for AI patterns
3. Check `packages/vibetech-shared/` for shared utilities
4. Query learning DB:

   ```sql
   SELECT * FROM code_patterns WHERE file_path LIKE 'apps/vibe-tutor%';
   ```

---

## Integration Points

**OpenRouter Proxy**: `apps/vibe-tutor/render-backend/` (port 3001)
**Shared UI**: `packages/vibetech-shared/ui/`
**Shared Hooks**: `packages/vibetech-shared/hooks/`

---

## Performance Targets

- **App Launch**: <3 seconds (on device)
- **AI Response**: <5 seconds (Claude 4.5), <8 seconds (DeepSeek R1 fallback)
- **Photo Capture**: <2 seconds (camera to display)
- **Offline Sync**: <10 seconds (when back online)

---

## Backend Auto-Detection

The backend automatically detects OpenRouter vs DeepSeek availability:

```javascript
// server.mjs - Automatic fallback
try {
  response = await openrouter('anthropic/claude-sonnet-4-5', message);
} catch (error) {
  console.warn('Claude failed, falling back to DeepSeek');
  response = await openrouter('deepseek/deepseek-r1', message);
}
```
