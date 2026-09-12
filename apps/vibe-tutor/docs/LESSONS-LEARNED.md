# Lessons Learned - Vibe Tutor Development

Historical log of major issues, solutions, and time-saving discoveries.

---

## 2026-09-11: Physical Device Release Verification (v1.5.18) & Workflow Hardening Blueprint

### Milestone Summary

- **Accomplishment**: Successfully designed, decomposed, compiled, verified on a physical Samsung A54 (`R5CW60X0PHT`), and packaged a release candidate for **v1.5.18** with rich math rendering (KaTeX) and formatted code cards with copy buttons.
- **Architecture Validation**: Core backend security and client boundaries are rock-solid. Unauthorized or sideloaded APKs cannot drain OpenRouter credits; verified Google Play buyers receive smooth, low-latency AI responses with rigorous monthly/daily token allowances.

### Critical Friction Points Exposed

#### 1. The Play Integrity Wall

- **Symptom**: Sideloaded debug APK (`assembleDebug`) failed AI chat session initialization with no clear on-screen explanation.
- **Root Cause**: Production Cloud Run enforces Google Play Integrity (`PLAY_RECOGNIZED`, Google's production signing certificate, and `LICENSED` account verdict). A sideloaded debug APK will _always_ fail these checks in production Cloud Run.
- **Impact**: Created uncertainty whether the backend was broken or the mobile client was failing.

#### 2. The "Quiet Hours" Ambush

- **Symptom**: At 1:33 AM during late-night testing, AI replies suddenly paused, masking backend recovery.
- **Root Cause**: Client-side parental study rules in `usageMonitor.ts` automatically paused AI replies between 21:00 (9 PM) and 07:00 (7 AM).
- **Impact**: Simulated a false backend outage during nocturnal developer QA sessions.

#### 3. Generic Error Message Masking

- **Symptom**: The chat UI reported: _"The response did not arrive. Your message was not saved as an AI reply; please retry."_
- **Root Cause**: `useChatMessages.ts` caught all errors not explicitly matching `/quiet hours/` or `/503/` and collapsed them into a generic timeout error, masking HTTP `401 Entitlement verification failed`.
- **Impact**: Required CDP / `adb logcat` investigation to diagnose an ordinary entitlement rejection.

### The 5-Point Workflow Blueprint (100% Implemented & Verified)

1. **Developer-Mode Seams in Debug Builds**:
   - In `config.ts`, `isDevBuild` provides automatic dev/debug detection across web, Electron, and native Capacitor.
   - Sideloaded debug builds can connect to local reverse proxy (`http://localhost:3001` via `pnpm run dev:bridge`).
   - `App.tsx` renders a dismissible on-screen status banner clearly displaying local bridge connection status or Cloud Run requirements.
2. **Differentiate Error Messages in the UI**:
   - `secureClient.ts` captures precise HTTP status and rejection reasons during session initialization.
   - `useChatMessages.ts` routes errors into specific, actionable user messages:
     - **401 Rejection**: _"Google Play purchase could not be verified. Please ensure you are signed in to the Play Store account used to purchase Vibe Tutor."_
     - **503 / Capacity**: _"The AI service is temporarily busy. Retrying in a moment..."_
     - **Quiet Hours**: _"Quiet hours active (21:00 - 07:00)."_ (Rendered in calm indigo with a 🌙 icon).
     - **Debug builds**: Appends raw diagnostic codes (`[HTTP 401: license]`).
3. **Developer Bypass for Parental Controls**:
   - Added in-memory & persistent 1-hour bypass (`enableDevBypass`, `disableDevBypass`, `isDevBypassActive`) to `usageMonitor.ts`.
   - Added interactive "Developer Bypass (1 hour)" control card inside `ScreenTimeSettings.tsx` (PIN protected), allowing nocturnal QA without changing device system clocks.
4. **Maintained Device Smoke Test Command (`pnpm run test:device`)**:
   - Created `scripts/device-smoke-test.mjs` automating device preflight checks on Samsung Galaxy A54 (`R5CW60X0PHT`), port forwarding, live math calculation assertion, coding palindrome card assertion, copy button verification, and screenshot capture. Supports `--dry-run` and `--skip-launch`.
5. **Automated Version-Code Allowlist Deployment**:
   - Upgraded `scripts/ship-release.ps1` to bind `android/variables.gradle` `androidVersionCode` with `render-backend/server.mjs` automatically and generate a staged deployment payload in `docs/release-readiness/cloud-run-staged-<versionCode>.json`.

---

## 2025-10-03: Duplicate Buttons + Chat Fix (v1.0.5)

### Issue Summary

Two critical issues on Android:

1. **Duplicate navigation buttons** - Both desktop sidebar (white) and mobile bottom nav (colored) showing simultaneously
2. **Chat completely broken** - Messages wouldn't send or receive responses

### Time to Fix

- **Investigation**: 45 minutes (WebSearch was critical)
- **Implementation**: 30 minutes
- **Testing**: 15 minutes
- **Total**: 90 minutes

### Root Causes Discovered

#### Tailwind CSS v4 CDN Incompatibility

**What We Thought**: Tailwind CDN would work fine for quick prototyping
**Reality**: Tailwind v4 uses modern CSS features (`@property`, `color-mix()`) that Android WebView doesn't support

**Symptoms**:

- Media queries completely ignored (`md:hidden`, `hidden md:flex`)
- Both desktop and mobile layouts rendering simultaneously
- No errors in console - silent failure

**Critical Search Query That Worked**:

```
"Tailwind CSS v4 Android WebView compatibility 2025"
```

**Key Finding**: Tailwind v4 requires Chrome 111+, but many Android devices run older WebView versions (74-103).

#### CapacitorHttp Fetch Patching Unreliable

**What We Thought**: Setting `CapacitorHttp.enabled = true` would automatically patch all `fetch()` calls
**Reality**: Capacitor 7's automatic patching is unreliable - must use explicit imports

**Symptoms**:

- Network requests failing silently
- CORS errors in Android WebView
- Worked in browser, failed on device

**Critical Search Query That Worked**:

```
"CapacitorHttp enabled not patching fetch Android 2025"
```

**Key Finding**: Capacitor docs say patching works, but community reports show it's unreliable. Always use explicit `CapacitorHttp.request()`.

### Solutions Applied

#### Fix 1: Install Tailwind v3 with Build Pipeline

```bash
# Remove CDN from index.html
npm install -D tailwindcss@3.4.15 postcss autoprefixer
npx tailwindcss init -p
```

**Time Saved on Future Issues**: 2-3 hours (won't debug CSS compatibility again)

#### Fix 2: Explicit CapacitorHttp Imports

```typescript
// Before (broken):
const response = await fetch(url, options);

// After (works):
import { CapacitorHttp } from '@capacitor/core';
const response = await CapacitorHttp.request({...});
```

**Time Saved on Future Issues**: 1-2 hours (pattern now documented)

### Web Search Strategies That Worked

1. **Include year in search**: "Tailwind v4 compatibility 2025"
2. **Include specific versions**: "Capacitor 7 fetch patching"
3. **Search Android-specific issues**: "Android WebView CSS media queries"
4. **Use exact error messages**: When errors exist, copy them verbatim

### What Didn't Work

❌ **Trying to fix symptoms instead of root cause**

- Spent 15 minutes adjusting CSS before realizing Tailwind v4 was the issue

❌ **Assuming docs are always correct**

- Capacitor docs say fetch patching works, community says otherwise

❌ **Not testing on real device early**

- Worked in browser, failed on Android - should have tested mobile first

### Prevention Checklist

For future mobile app development:

- [ ] Never use Tailwind CSS from CDN for Capacitor apps
- [ ] Always install Tailwind v3 with proper build pipeline
- [ ] Never rely on automatic fetch() patching
- [ ] Always use explicit `CapacitorHttp.request()`
- [ ] Test on real device, not just emulator
- [ ] Check WebView version compatibility for CSS features
- [ ] Increment versionCode on every build
- [ ] Tag working versions immediately (`git tag v1.0.X`)

### Time-Saving Patterns

#### "If You See X, Check Y First" Rules

| Symptom                  | Check This First     | Typical Fix          |
| ------------------------ | -------------------- | -------------------- |
| Duplicate navs on mobile | Tailwind version     | Install v3           |
| Media queries ignored    | WebView version      | Use compatible CSS   |
| Chat not working         | Network requests     | Use CapacitorHttp    |
| Stale code after build   | versionCode          | Increment version    |
| CORS errors on Android   | fetch() usage        | Use CapacitorHttp    |
| CSS not applying         | Service worker cache | Clear cache, rebuild |

#### Quick Diagnostics

```bash
# Check WebView version
adb shell dumpsys webview | grep "Current WebView"

# Check if Capacitor detected
# In Chrome DevTools console:
console.log(window.Capacitor ? 'Native' : 'Browser');

# Check network requests
# Chrome DevTools → Network tab → Filter by "Fetch/XHR"
```

### Documentation Created

To prevent future occurrences:

1. ✅ MOBILE-TROUBLESHOOTING.md - Quick reference guide
2. ✅ Updated CLAUDE.md - Mobile development section
3. ✅ VERSION.md - Version history with git tags
4. ✅ RELEASE-NOTES-v1.0.5.md - Detailed release notes
5. ✅ LESSONS-LEARNED.md - This file

### Metrics

**Before Documentation**:

- Time to debug similar issue: 2-3 hours
- Confidence in solution: Medium

**After Documentation**:

- Time to debug similar issue: 15-30 minutes (Est.)
- Confidence in solution: High
- Reusable patterns identified: 6+

---

## Future Issues (Template)

### [Date]: [Issue Title]

### Symptoms

- TBD

### Root Cause

- TBD

**Time to Fix**:

- Investigation: X minutes
- Implementation: X minutes
- Total: X minutes

### Solution

```text
Code or commands
```

### Search Queries That Worked

- TBD

### Prevention

- TBD

---

**Maintained By**: Claude Code + User
**Last Updated**: 2025-10-03
**Next Review**: On next major issue
