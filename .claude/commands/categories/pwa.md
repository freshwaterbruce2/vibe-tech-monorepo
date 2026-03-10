---
name: pwa-skill
description: Progressive Web App development - service workers, offline, installable, push notifications
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
category: app-type
---

# Progressive Web App Development Skill

> **For ALL PWAs** in the monorepo: Offline-first, installable web apps

## Applies To

| Project | Type |
|---------|------|
| `apps/shipping-pwa` | Shipping tracker PWA |
| Any webapp with PWA features | Offline/installable |

## Tech Stack

- **Framework**: Next.js 14 / Vite + React
- **PWA**: next-pwa or vite-plugin-pwa
- **Service Worker**: Workbox
- **Storage**: IndexedDB (via Dexie.js or idb)
- **Sync**: Background Sync API
- **Push**: Web Push API

## Standard Commands

```bash
pnpm dev           # Development (SW disabled)
pnpm build         # Production build
pnpm preview       # Preview with SW enabled
pnpm test          # Run tests
```

## Architecture Pattern

```
apps/{pwa}/
├── src/
│   ├── app/                # Next.js App Router
│   ├── components/
│   ├── lib/
│   │   ├── db.ts           # IndexedDB client
│   │   ├── sync.ts         # Background sync
│   │   └── push.ts         # Push notifications
│   └── sw/                 # Service worker code
│       └── index.ts
├── public/
│   ├── manifest.json       # Web App Manifest
│   └── icons/              # App icons
└── next.config.js          # PWA config
```

## Critical Patterns

### Web App Manifest
```json
// public/manifest.json
{
  "name": "Shipping PWA",
  "short_name": "Shipping",
  "description": "Track your shipments offline",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Service Worker Registration
```typescript
// lib/sw-register.ts
export async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', reg.scope);
    } catch (err) {
      console.error('SW registration failed:', err);
    }
  }
}
```

### IndexedDB with Dexie
```typescript
// lib/db.ts
import Dexie, { Table } from 'dexie';

interface Shipment {
  id: string;
  trackingNumber: string;
  status: string;
  lastUpdated: Date;
  synced: boolean;
}

class ShippingDB extends Dexie {
  shipments!: Table<Shipment>;

  constructor() {
    super('ShippingDB');
    this.version(1).stores({
      shipments: 'id, trackingNumber, synced'
    });
  }
}

export const db = new ShippingDB();
```

### Offline-First Data Pattern
```typescript
// hooks/useShipments.ts
export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Load from IndexedDB first (instant)
    db.shipments.toArray().then(setShipments);

    // Then sync with server if online
    if (isOnline) {
      syncWithServer();
    }
  }, [isOnline]);

  async function syncWithServer() {
    const serverData = await fetch('/api/shipments').then(r => r.json());
    await db.shipments.bulkPut(serverData);
    setShipments(serverData);
  }

  return { shipments, isOnline };
}
```

### Background Sync
```typescript
// lib/sync.ts
export async function queueSync(action: SyncAction) {
  // Store action in IndexedDB
  await db.syncQueue.add(action);

  // Register for background sync
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-shipments');
  }
}

// In service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-shipments') {
    event.waitUntil(processSyncQueue());
  }
});
```

### Push Notifications
```typescript
// lib/push.ts
export async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  // Send subscription to server
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(sub)
  });
}
```

## Quality Checklist

- [ ] Manifest valid: Check in DevTools > Application
- [ ] SW registered and active
- [ ] App installable (shows install prompt)
- [ ] Offline mode works
- [ ] Data syncs when back online
- [ ] Push notifications work
- [ ] Lighthouse PWA score > 90

## Testing PWA Features

```bash
# Lighthouse audit
npx lighthouse http://localhost:3000 --view

# Test offline in DevTools
# Network tab > Offline checkbox
```

## Common Issues

### SW Not Updating
```typescript
// Force update in development
self.skipWaiting();
```

### Cache Conflicts
```bash
# Clear all caches
# DevTools > Application > Clear storage
```

## Community Skills to Use

- `webapp-skill` - Base web patterns
- `performance-profiling` - Core Web Vitals
- `testing-patterns` - Test coverage
