# Vibe-Tutor Performance Baselines

**Last Updated:** 2026-01-06
**Status:** ACTIVE
**Target:** Production-ready performance metrics for web and mobile

---

## Overview

This document establishes performance baselines for vibe-tutor across web (PWA) and Android (Capacitor) platforms. Use these targets to validate optimization efforts and detect regressions during development.

---

## 1. Lighthouse Scores (Desktop - Target)

### Baseline Targets (2026)

| Metric | Target | Status |
|--------|--------|--------|
| Performance | >90 | Baseline |
| Accessibility | >95 | Baseline |
| Best Practices | >95 | Baseline |
| SEO | >90 | Baseline |
| **Average** | **>92.5** | **Target** |

### How to Measure

```bash
# Build production version
pnpm nx build vibe-tutor

# Open in browser preview
pnpm nx preview vibe-tutor

# Run Lighthouse in Chrome
# 1. Open Chrome DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Click "Analyze page load"
# 4. Select "Desktop" mode
# 5. Wait for report
```

### Interpretation

- **Performance >90**: App loads and renders quickly (Core Web Vitals passing)
- **Accessibility >95**: Keyboard navigation, screen readers, ARIA labels working
- **Best Practices >95**: Security, browser compatibility, deprecation warnings
- **SEO >90**: Meta tags, structured data, mobile-friendly

### Current Baseline (To Be Measured)

```
Performance:     [PENDING FIRST RUN]
Accessibility:   [PENDING FIRST RUN]
Best Practices:  [PENDING FIRST RUN]
SEO:             [PENDING FIRST RUN]
Average Score:   [PENDING FIRST RUN]
```

---

## 2. Bundle Size Targets

### Baseline Targets

| Bundle | Target | Rationale |
|--------|--------|-----------|
| main.js | <200KB | App code only |
| vendor.js | <300KB | React 19, React Router 7, React Query 5 |
| CSS | <50KB | Tailwind CSS v3 optimized |
| **Total** | **<500KB** | **React 19 optimized** |

### Analysis Tools

#### Option A: pnpm nx build (Recommended)

```bash
# Build and analyze
pnpm nx build vibe-tutor

# View bundle analysis (automatically generated)
# File: dist/bundle-analysis.html
# Open in browser to see visual breakdown

# Or use Nx built-in analysis
pnpm nx run vibe-tutor:build --analyze
```

#### Option B: Manual Analysis with esbuild

```bash
# Build with size analysis
pnpm --filter vibe-tutor build

# Check dist sizes
Get-ChildItem dist -Recurse -Include *.js,*.css | `
  ForEach-Object { Write-Host "$($_.Name): $([math]::Round($_.Length/1024, 2)) KB" }
```

#### Option C: Webpack Bundle Analyzer

```bash
# Install locally if needed
pnpm add -D webpack-bundle-analyzer --filter vibe-tutor

# Add to vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
    })
  ]
})
```

### Current Baseline (To Be Measured)

```
Build: (date)    [PENDING FIRST RUN]
main.js:         [PENDING FIRST RUN]
vendor.js:       [PENDING FIRST RUN]
CSS:             [PENDING FIRST RUN]
Total:           [PENDING FIRST RUN]
```

### Optimization Techniques

**If exceeding targets:**

1. **Code splitting**: Lazy load routes and heavy components

   ```typescript
   const ChatInterface = lazy(() => import('./pages/ChatInterface'));
   const ContextGuide = lazy(() => import('./pages/ContextGuide'));
   ```

2. **Tree shaking**: Remove unused React/lodash/utils

   ```bash
   pnpm nx build vibe-tutor --analyze
   ```

3. **Compression**: Enable gzip/brotli in production

   ```javascript
   // vite.config.ts
   compression({
     algorithm: 'brotli',
     threshold: 10240,
   })
   ```

4. **Remove heavy deps**: Replace with lighter alternatives
   - ❌ moment.js → ✅ date-fns
   - ❌ lodash → ✅ lodash-es (tree-shakeable)

---

## 3. Runtime Metrics

### Baseline Targets

| Metric | Target | How Measured |
|--------|--------|--------------|
| Load Time | <2.5s | navigationTiming API |
| Memory Usage | <100MB | Chrome DevTools Memory tab |
| FPS (Interactive) | >55 | performanceOptimization.ts logs |
| Network Requests | <30 | Network tab (waterfall chart) |

### performanceOptimization.ts Integration

The app includes built-in performance tracking:

```typescript
// src/services/performanceOptimization.ts
class PerformanceMonitor {
  logMetrics(): void {
    // Automatically logs to console on app start
    // Example output:
    // [Performance] Load Time: 2.3s
    // [Performance] Memory: 87MB
    // [Performance] FPS: 58
  }
}
```

### How to Measure

#### Load Time (2.5s target)

```javascript
// Method 1: Browser console
performance.getEntriesByType('navigation')[0].loadEventEnd -
performance.getEntriesByType('navigation')[0].fetchStart
// Result in milliseconds

// Method 2: Automated (Chrome DevTools)
// 1. Open DevTools (F12)
// 2. Go to Network tab
// 3. Reload page
// 4. Check "DOMContentLoaded" and "Load" times
// 5. Should both be <2.5s
```

#### Memory Usage (<100MB)

```bash
# Method 1: Chrome DevTools Memory Profiler
# 1. Open DevTools (F12)
# 2. Go to Memory tab
# 3. Click "Take heap snapshot"
# 4. Check total heap size
# 5. Should be <100MB

# Method 2: Android/Capacitor
# Monitor heap via Android Studio:
# 1. Connect device via adb
# 2. Open Logcat
# 3. grep "Memory" or use Android Profiler
adb logcat | grep -i "heap\|memory"
```

#### FPS Measurement (>55 target)

```bash
# Method 1: Chrome DevTools Performance tab
# 1. Open DevTools (F12)
# 2. Go to Performance tab
# 3. Click record
# 4. Interact with app (scroll, switch pages)
# 5. Stop recording
# 6. Look at FPS metric (should average >55)

# Method 2: Console logs
# The app logs FPS to console via performanceOptimization.ts
# Check console during interactions
console.log('[Performance] FPS: 58')
```

#### Network Requests (<30 total)

```bash
# Method 1: Chrome Network tab
# 1. Open DevTools (F12)
# 2. Go to Network tab
# 3. Reload page
# 4. Count all requests
# 5. Should be <30 (including assets, API calls, fonts)

# Method 2: Programmatic check
fetch('about:blank')
  .then(() => {
    const entries = performance.getEntriesByType('resource');
    console.log(`Total requests: ${entries.length}`);
  })
```

### Current Baseline (To Be Measured)

```
Measurement Date: [PENDING FIRST RUN]
Load Time:        [PENDING FIRST RUN]
Memory Usage:     [PENDING FIRST RUN]
FPS (average):    [PENDING FIRST RUN]
Network Requests: [PENDING FIRST RUN]

Device: Windows 11 | Chrome [VERSION]
Network: WiFi 5GHz | Throttling: None
```

---

## 4. Web Vitals (Core Web Vitals 2024)

### Baseline Targets

| Metric | Target | Status |
|--------|--------|--------|
| **LCP** (Largest Contentful Paint) | <2.5s | Baseline |
| **FID** (First Input Delay) | <100ms | Baseline |
| **CLS** (Cumulative Layout Shift) | <0.1 | Baseline |
| **TTFB** (Time to First Byte) | <600ms | Optional |

### How to Measure

#### LCP (Largest Contentful Paint) <2.5s

```javascript
// Measure when largest element is painted
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
});

observer.observe({ entryTypes: ['largest-contentful-paint'] });
```

**In Chrome DevTools:**

- Lighthouse tab → Largest Contentful Paint metric
- Should be <2.5s on desktop, <4s on mobile

#### FID (First Input Delay) <100ms

```javascript
// Measure input responsiveness
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach(entry => {
    console.log('FID:', entry.processingDuration);
  });
});

observer.observe({ entryTypes: ['first-input'] });
```

**In Chrome DevTools:**

- Lighthouse tab → First Input Delay metric
- Click buttons/links and watch time to response
- Should be <100ms

#### CLS (Cumulative Layout Shift) <0.1

```javascript
// Measure unplanned layout shifts
let clsValue = 0;
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      clsValue += entry.value;
      console.log('CLS Update:', clsValue);
    }
  }
});

observer.observe({ type: 'layout-shift', buffered: true });
```

**In Chrome DevTools:**

- Lighthouse tab → Cumulative Layout Shift metric
- Watch page load for unexpected layout jumps
- Should be <0.1 (no visible shifts)

### Monitoring in Production

Use web-vitals library (already in dependencies):

```typescript
// src/services/webVitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function initWebVitals() {
  getCLS(console.log);  // Cumulative Layout Shift
  getFID(console.log);  // First Input Delay
  getFCP(console.log);  // First Contentful Paint
  getLCP(console.log);  // Largest Contentful Paint
  getTTFB(console.log); // Time to First Byte
}
```

### Current Baseline (To Be Measured)

```
Measurement Date: [PENDING FIRST RUN]
LCP:              [PENDING FIRST RUN]
FID:              [PENDING FIRST RUN]
CLS:              [PENDING FIRST RUN]
TTFB:             [PENDING FIRST RUN]

Device: Desktop | Network: WiFi 5GHz | Browser: Chrome Latest
```

---

## 5. Android Performance (Capacitor)

### Baseline Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Cold Start Time | <3 seconds | Time from app launch to interactive |
| Memory Stability | No growth over 30min | Avoid memory leaks |
| Battery Drain | <10% per hour | Active use with WiFi |
| SQLite Queries | <50ms per query | Database performance |

### Cold Start Time (<3 seconds)

**How to Measure:**

```bash
# 1. Uninstall app from device
adb uninstall com.vibetech.vibe-tutor

# 2. Build and install fresh APK
pnpm nx android:deploy vibe-tutor

# 3. Force stop and measure
adb shell am force-stop com.vibetech.vibe-tutor

# 4. Use logcat to measure start time
adb logcat -c
adb logcat | grep -E "Displayed com.vibetech|ActivityTaskManager"

# 5. Tap app icon and note time to "Displayed"
# Example output:
# Displayed com.vibetech.vibe-tutor/.MainActivity: +2.850s (total +3.200s)
```

**In Android Studio:**

```
Profiler → Startup Profiler (when attaching to process)
- Shows method trace
- Identifies slow functions
- Target: 3 seconds total
```

### Memory Stability (No growth over 30 min)

**How to Measure:**

```bash
# 1. Connect device and open Android Studio
# 2. View → Tool Windows → Profiler
# 3. Select device and app
# 4. Watch Memory graph over 30 minutes
# 5. Graph should be flat, not climbing

# Alternative: logcat monitoring
adb logcat | grep -E "Memory|NATIVE_HEAP|JAVA_HEAP"

# Expected pattern (every minute):
# [MM:SS] Heap: 45MB (stable)
# [MM:SS] Heap: 46MB (stable)
# Should NOT climb to 100MB+
```

**Signs of Memory Leak:**

- Memory graph steadily climbing during normal use
- App slowdown after 30 minutes
- Increased garbage collection frequency

**Fix Memory Leaks:**

```typescript
// ✅ Correct: Cleanup on unmount
useEffect(() => {
  const subscription = observable.subscribe(handler);

  // Cleanup
  return () => subscription.unsubscribe();
}, []);

// ❌ Wrong: No cleanup
useEffect(() => {
  observable.subscribe(handler);  // Memory leak!
}, []);
```

### Battery Drain (<10% per hour active use)

**How to Measure:**

```bash
# 1. Charge device to 100%
# 2. Enable WiFi (test with WiFi first, cellular second)
# 3. Start app and measure battery drop
# 4. Leave running for 1 hour of active use
# 5. Expected: Drop to 90% or better

# Manual tracking:
# Time 00:00 - 100% battery
# Time 01:00 - Should be 90% or higher
```

**In Android Studio Battery Profiler:**

```
Profiler → Battery (shows energy usage)
- CPU usage
- GPS/Location
- Network activity
- Display brightness
Target: Low background activity
```

**Typical Battery Consumption (per hour active use):**

- CPU active (homework editing): 5-8%
- WiFi on, screen on: 2-3%
- Idle background: 0.5-1%
- **Total: <10%** (includes screen)

### SQLite Query Performance (<50ms per query)

**How to Measure:**

```typescript
// src/services/homework/database.ts
import { CapacitorSQLite, SQLiteDBConnection } from '@capacitor-community/sqlite';

async function measureQueryPerformance() {
  const start = performance.now();
  const result = await db.query('SELECT * FROM homework WHERE due_date >= ?', [today]);
  const duration = performance.now() - start;

  console.log(`Query time: ${duration.toFixed(2)}ms`);
  // Should be <50ms for typical queries
}
```

**Android Logcat Monitoring:**

```bash
# Run test and monitor
adb logcat | grep -E "SQLite|DB_QUERY|Query time"

# Example output:
# [DB_QUERY] Query time: 12.34ms ✅ (under 50ms)
# [DB_QUERY] Query time: 105.67ms ❌ (over 50ms - optimize)
```

**Optimization Tips:**

```sql
-- ❌ Slow query (full table scan)
SELECT * FROM homework WHERE title LIKE '%algebra%';

-- ✅ Optimized (indexed search)
SELECT * FROM homework WHERE grade = 'A' AND due_date >= ?;

-- ✅ Add index on frequently searched columns
CREATE INDEX idx_grade ON homework(grade);
CREATE INDEX idx_due_date ON homework(due_date);
```

### Current Baseline (To Be Measured)

```
Device: Pixel 7 | OS: Android 14 | Build: (date)
Network: WiFi 5GHz | Screen: 100% brightness

Cold Start Time:       [PENDING FIRST RUN]
Memory After 30min:    [PENDING FIRST RUN]
Battery Drain (1hr):   [PENDING FIRST RUN]
SQLite Query Time:     [PENDING FIRST RUN]
```

---

## 6. How to Measure (Complete Guide)

### Quick Reference: All Measurements

| Measurement | Command | Duration | Tool |
|-------------|---------|----------|------|
| Lighthouse | DevTools → Lighthouse tab | 5 min | Chrome |
| Bundle Size | `pnpm nx build vibe-tutor` | 2 min | Terminal |
| Load Time | DevTools → Network tab | 1 min | Chrome |
| Memory | DevTools → Memory tab | 2 min | Chrome |
| FPS | DevTools → Performance tab | 5 min | Chrome |
| Web Vitals | Browser console or Lighthouse | 5 min | Chrome |
| Cold Start | `adb logcat` | 5 min | Android Studio |
| Memory (Android) | Android Studio Profiler | 35 min | Android Studio |
| Battery | Settings → Battery | 65 min | Device |
| SQLite | Chrome DevTools Console | 2 min | Chrome |

### Full Testing Workflow

#### Desktop Testing (15 minutes)

```bash
# 1. Build production version
pnpm nx build vibe-tutor
# ✅ Check Bundle Size

# 2. Preview
pnpm nx preview vibe-tutor

# 3. Chrome DevTools (F12)
# ✅ Lighthouse (full audit) - 5 min
# ✅ Network tab (load time, request count)
# ✅ Memory tab (heap snapshot)
# ✅ Performance tab (FPS during interactions)
# ✅ Console (web-vitals metrics)
```

#### Android Testing (1+ hours)

```bash
# 1. Build and deploy
pnpm nx android:deploy vibe-tutor

# 2. Uninstall and reinstall for cold start test
adb uninstall com.vibetech.vibe-tutor
pnpm nx android:deploy vibe-tutor
# ✅ Measure cold start time

# 3. Memory monitoring (30 minutes)
adb logcat | grep Memory
# ✅ Monitor for stability

# 4. Battery test (60 minutes)
# ✅ Monitor battery drain percentage

# 5. Query performance
adb logcat | grep "Query time"
# ✅ Verify <50ms queries
```

### Creating Performance Reports

```markdown
## Performance Report - 2026-01-06

### Desktop (PWA)
- Lighthouse Performance: 92/100
- Bundle Size Total: 487KB
- Load Time: 2.1s
- Memory: 82MB
- Average FPS: 58
- Network Requests: 28

### Android (Capacitor)
- Cold Start: 2.8s
- Memory Stable: ✅
- Battery (1hr): 92% remaining
- SQLite Query: 18ms avg

### Status: PASS (All targets met)
```

---

## 7. Comparison Table (Before/After Optimization)

### Example Optimization Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lighthouse Performance | 78 | 92 | +18% |
| Bundle Size (main.js) | 285KB | 178KB | -37% |
| Load Time | 3.8s | 2.1s | -45% |
| Memory Usage | 142MB | 87MB | -39% |
| FPS (interactive) | 48 | 58 | +21% |
| LCP | 3.2s | 2.1s | -34% |
| Android Cold Start | 4.2s | 2.8s | -33% |

### Tracking Changes

Create a JSON file to track optimization iterations:

```json
{
  "baselines": [
    {
      "date": "2026-01-06",
      "version": "1.0.5",
      "desktop": {
        "lighthouse_performance": "[PENDING]",
        "bundle_size_kb": "[PENDING]",
        "load_time_s": "[PENDING]"
      },
      "android": {
        "cold_start_s": "[PENDING]",
        "memory_mb": "[PENDING]",
        "battery_percent_per_hour": "[PENDING]"
      }
    }
  ]
}
```

Location: `apps/vibe-tutor/docs/performance-measurements.json`

---

## 8. Automated Performance Monitoring

### GitHub Actions Workflow

Add to `.github/workflows/performance.yml`:

```yaml
name: Performance Baseline Check

on: [pull_request]

jobs:
  performance:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: pnpm install

      - name: Build vibe-tutor
        run: pnpm nx build vibe-tutor

      - name: Check bundle size
        run: |
          # Simple size check
          $size = (Get-Item "dist/index.js" | Measure-Object -Property Length -Sum).Sum / 1024 / 1024
          if ($size -gt 0.5) {
            Write-Error "Bundle size ${size}MB exceeds 500KB limit"
          }
```

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check for performance regressions before commit

echo "Checking bundle size..."
pnpm nx build vibe-tutor
BUNDLE_SIZE=$(stat -c%s "dist/index.js" 2>/dev/null || stat -f%z "dist/index.js")
BUNDLE_KB=$((BUNDLE_SIZE / 1024))

if [ $BUNDLE_KB -gt 200 ]; then
  echo "⚠️ Warning: main.js is ${BUNDLE_KB}KB (target: <200KB)"
fi

exit 0
```

---

## 9. Performance Regression Detection

### Red Flags

**Immediate Investigation Required If:**

1. Lighthouse Performance drops below 85
2. Bundle size increases by >10% (>55KB)
3. Load time exceeds 3.5 seconds
4. Memory usage exceeds 120MB
5. FPS drops below 45 during interactions
6. Android cold start exceeds 4 seconds
7. Memory growth >10MB over 30 minutes
8. SQLite queries exceed 100ms

### Quick Fixes

```bash
# 1. Check what changed
git diff HEAD~1 -- "*.tsx" "*.ts" "package.json"

# 2. Look for common culprits
grep -r "new Array" src/  # Memory issues
grep -r "console.log" src/  # Debug code
grep -r "import \*" src/  # Unused imports

# 3. Measure specific component
pnpm nx build vibe-tutor --analyze

# 4. Profile in Chrome DevTools
# Performance tab → Identify slow functions
```

---

## 10. Reference Documentation

### Official Documentation

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [React 19 Performance Guide](https://react.dev/reference/react/useMemo)
- [Capacitor Performance](https://capacitorjs.com/docs/plugins/network#performance)

### Related Vibe-Tutor Docs

- **Performance Optimization:** `apps/vibe-tutor/src/services/performanceOptimization.ts`
- **Project Configuration:** `apps/vibe-tutor/project.json`
- **Build Configuration:** `apps/vibe-tutor/vite.config.ts`
- **TypeScript Config:** `apps/vibe-tutor/tsconfig.json`

### Tools & Extensions

- Chrome DevTools Lighthouse
- WebPageTest (webpagetest.org)
- Bundle Analyzer (webpack-bundle-analyzer)
- Capacitor Android Studio Profiler

---

## 11. Maintenance & Updates

### Quarterly Review

Every 3 months, re-baseline to ensure targets remain current:

- [ ] Re-run Lighthouse audit (quarterly)
- [ ] Check bundle size (monthly)
- [ ] Monitor Android performance (quarterly)
- [ ] Update targets based on device capabilities
- [ ] Document any changes to baseline criteria

### Version Updates

When updating major dependencies (React, Vite, etc.):

1. Rebuild and measure baselines
2. Document changes in this file
3. Update targets if justified by platform changes
4. Communicate changes to team

---

## 12. Success Checklist

Before marking performance work as complete:

- [ ] All Lighthouse scores measured and documented
- [ ] Bundle sizes verified against targets
- [ ] Load time <2.5s verified on WiFi
- [ ] Memory usage <100MB baseline established
- [ ] FPS >55 confirmed during interactions
- [ ] Web Vitals all passing
- [ ] Android cold start <3 seconds
- [ ] Memory stable over 30-minute session
- [ ] Battery drain <10% per hour
- [ ] SQLite queries <50ms average
- [ ] Performance baseline document updated
- [ ] GitHub Actions workflow created (optional)

---

**Baseline Owner:** Vibe-Tutor Development Team
**Last Measured:** [PENDING FIRST RUN]
**Next Review:** 2026-04-06
**Emergency Contact:** See `apps/vibe-tutor/CLAUDE.md`

---

*Document Status: DRAFT - Awaiting first performance measurements*
