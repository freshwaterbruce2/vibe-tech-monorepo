# Shipping PWA - Project Guide

**Project Path:** `C:\dev\apps\shipping-pwa`  
**Type:** Progressive Web App (PWA) + Mobile (Capacitor)  
**Platform:** Web, Android, iOS  
**Status:** Production Ready

---

## 🎯 Project Overview

Progressive Web App for shipping and logistics management. Features offline support, real-time tracking, mobile deployment via Capacitor, and comprehensive testing infrastructure. Built with React, TypeScript, and modern PWA capabilities.

### Key Features

- Progressive Web App (PWA)
- Native mobile apps (Android/iOS via Capacitor)
- Offline functionality
- Real-time tracking
- Push notifications
- QR code scanning
- Route optimization
- Analytics dashboard
- Multi-language support

---

## 📁 Project Structure

```
shipping-pwa/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── hooks/           # Custom hooks
│   ├── store/           # State management
│   ├── workers/         # Service workers
│   └── utils/           # Utilities
├── public/              # Static assets
├── android/             # Android native project
├── tests/               # Test files
├── scripts/             # Build scripts
├── docs/                # Documentation
├── capacitor.config.ts  # Capacitor config
├── workbox-config.js    # PWA config
└── package.json
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd C:\dev\apps\shipping-pwa

# Install dependencies
pnpm install

# Copy environment template
Copy-Item .env.example .env
code .env

# Initialize database
pnpm db:init

# Start development server
pnpm dev
```

### Required Environment Variables

```bash
# .env file
VITE_API_URL=https://api.yourapp.com
VITE_GOOGLE_MAPS_API_KEY=your_key_here
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_SENTRY_DSN=your_sentry_dsn

# App configuration
VITE_APP_NAME=ShippingPWA
VITE_APP_VERSION=1.0.0
```

### Development

```powershell
# Web development
pnpm dev

# Mobile development (Android)
pnpm cap:sync
pnpm cap:run android

# iOS (Mac only)
pnpm cap:run ios

# Access at: http://localhost:5173
```

---

## 📱 Mobile Development (Capacitor)

### Setup Capacitor

```powershell
# Install Capacitor CLI (if not installed)
npm install -g @capacitor/cli

# Sync web assets to mobile
pnpm cap:sync

# Add platforms (first time)
npx cap add android
npx cap add ios
```

### Android Development

```powershell
# Sync changes
pnpm cap:sync android

# Open in Android Studio
pnpm cap:open android

# Build APK
cd android
.\gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Build Commands

```powershell
# Build for web
pnpm build

# Build for Android
pnpm build:android

# Build for iOS
pnpm build:ios

# Build all platforms
pnpm build:all
```

---

## 🌐 PWA Features

### Service Worker

**File:** `public/sw.js`

```javascript
// Cache configuration
const CACHE_NAME = 'shipping-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/assets/main.js',
  '/assets/main.css'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### Workbox Configuration

**File:** `workbox-config.js`

```javascript
module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,json}'
  ],
  swDest: 'dist/sw.js',
  runtimeCaching: [{
    urlPattern: /^https:\/\/api\./,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 300
      }
    }
  }]
};
```

### Manifest

**File:** `public/manifest.json`

```json
{
  "name": "Shipping PWA",
  "short_name": "ShipPWA",
  "description": "Shipping and logistics management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4CAF50",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 📊 Database & State Management

### Local Storage Strategy

```typescript
// src/services/storage.ts
export class StorageService {
  async saveOffline(data: ShipmentData) {
    // Save to IndexedDB for offline access
    const db = await this.openDB();
    await db.put('shipments', data);
  }

  async syncWhenOnline() {
    if (navigator.onLine) {
      const pending = await this.getPending();
      for (const item of pending) {
        await api.sync(item);
      }
    }
  }
}
```

### State Management

```typescript
// src/store/shipmentStore.ts
import { create } from 'zustand';

interface ShipmentStore {
  shipments: Shipment[];
  addShipment: (shipment: Shipment) => void;
  updateShipment: (id: string, data: Partial<Shipment>) => void;
}

export const useShipmentStore = create<ShipmentStore>((set) => ({
  shipments: [],
  addShipment: (shipment) => 
    set((state) => ({ 
      shipments: [...state.shipments, shipment] 
    })),
  updateShipment: (id, data) =>
    set((state) => ({
      shipments: state.shipments.map(s => 
        s.id === id ? { ...s, ...data } : s
      )
    }))
}));
```

---

## 🧪 Testing

### Test Infrastructure

**File:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
```

### Run Tests

```powershell
# All tests
pnpm test

# E2E tests
pnpm test:e2e

# Unit tests
pnpm test:unit

# Visual tests
pnpm test:visual

# With UI
pnpm test:e2e:ui

# Generate report
pnpm test:report
```

### Test Examples

```typescript
// tests/shipment-tracking.spec.ts
import { test, expect } from '@playwright/test';

test('should track shipment', async ({ page }) => {
  await page.goto('/');
  
  // Enter tracking number
  await page.fill('[data-testid="tracking-input"]', 'SHIP123');
  await page.click('[data-testid="track-button"]');
  
  // Verify results
  await expect(page.locator('[data-testid="status"]'))
    .toHaveText('In Transit');
});
```

---

## 🚀 Deployment

### Netlify

```powershell
# Install CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod

# Or use Git integration
# Push to main branch → auto-deploy
```

**Config:** `netlify.toml`

```toml
[build]
  command = "pnpm build"
  publish = "dist"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Railway

```powershell
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Google Play Store (Android)

```powershell
# Generate signed APK
cd android
.\gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab

# Upload to Google Play Console
# https://play.google.com/console
```

---

## 📱 Push Notifications

### Setup Firebase

```typescript
// src/services/notifications.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: 'your-project',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id'
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const token = await getToken(messaging);
    await saveTokenToServer(token);
  }
}
```

### Handle Notifications

```typescript
// src/workers/notification-handler.ts
self.addEventListener('push', event => {
  const data = event.data.json();
  
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    tag: data.tag,
    data: data.payload
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

---

## 🔧 Troubleshooting

### PWA Not Installing

```powershell
# Check service worker registration
# Open DevTools → Application → Service Workers

# Verify manifest
# DevTools → Application → Manifest

# Check HTTPS (required for PWA)
# Use ngrok for local testing
ngrok http 5173

# Rebuild service worker
pnpm build
```

### Android Build Issues

```powershell
# Sync Gradle
cd android
.\gradlew --refresh-dependencies

# Clean build
.\gradlew clean
.\gradlew assembleDebug

# Check SDK versions
# Open android/build.gradle
# Verify compileSdkVersion, targetSdkVersion
```

### Capacitor Sync Issues

```powershell
# Remove and re-add platform
npx cap remove android
npx cap add android

# Force sync
npx cap sync android --force

# Check capacitor config
code capacitor.config.ts
```

---

## 📚 Important Documentation

### Project Docs

- `README.md` - Overview
- `PRODUCTION_READY_SUMMARY.md` - Production status
- `DEPLOYMENT_GUIDE.md` - Deployment guide
- `STATUS.md` - Current status
- `USER_GUIDE.md` - User documentation

### Technical Docs

- `PRODUCTION-CHECKLIST.md` - Pre-deployment checklist
- `PRODUCTION_TEST_SUITE_DOCUMENTATION.md` - Testing
- `PLAYWRIGHT_TEST_IMPROVEMENTS.md` - Test improvements
- `PWA_FIXES_APPLIED.md` - PWA improvements

### Development Docs

- `DEVELOPMENT_PROGRESS.md` - Progress tracking
- `DEVELOPER_GUIDE.md` - Developer onboarding
- `Product Context.md` - Product details
- `Tech Context.md` - Technical context

---

## 🔄 Maintenance

### Daily

```powershell
# Check error logs
# Sentry dashboard

# Monitor uptime
# Check analytics
```

### Weekly

```powershell
# Update dependencies
pnpm update

# Run tests
pnpm test

# Check bundle size
pnpm build --analyze
```

### Monthly

```powershell
# Security audit
pnpm audit

# Performance audit
pnpm lighthouse

# Clean cache
pnpm clean
```

---

## 🎯 Key Features

### Offline Support

- Service worker caching
- IndexedDB storage
- Background sync
- Offline queue

### Real-time Updates

- WebSocket connections
- Live tracking
- Push notifications
- Auto-refresh

### Mobile Optimizations

- Touch gestures
- Native camera
- GPS tracking
- Biometric auth

### Performance

- Code splitting
- Lazy loading
- Image optimization
- CDN integration

---

**Last Updated:** January 2, 2026  
**Platforms:** Web, Android, iOS  
**Status:** Production Ready

