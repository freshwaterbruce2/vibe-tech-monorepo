# GEMINI.md - Shipping PWA

## Project Type
Progressive Web App for shipment tracking

## Location
`C:\dev\apps\shipping-pwa\`

## Tech Stack
- **Framework**: Next.js 14 / Vite
- **Language**: TypeScript
- **PWA**: next-pwa / vite-plugin-pwa
- **Storage**: IndexedDB (Dexie.js)
- **Styling**: Tailwind CSS

## Key Commands
```bash
pnpm dev              # Dev (SW disabled)
pnpm build            # Production build
pnpm preview          # Preview with SW
pnpm test             # Run tests
```

## Architecture
```
src/
├── app/              # Next.js pages
├── components/       # React components
├── lib/
│   ├── db.ts         # IndexedDB client
│   ├── sync.ts       # Background sync
│   └── push.ts       # Push notifications
├── sw/               # Service worker
└── public/
    ├── manifest.json # Web App Manifest
    └── icons/        # PWA icons
```

## Critical Patterns

### IndexedDB with Dexie
```typescript
import Dexie, { Table } from 'dexie';

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

### Offline-First Pattern
```typescript
export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Load from IndexedDB first (instant)
    db.shipments.toArray().then(setShipments);

    // Sync with server if online
    if (isOnline) syncWithServer();
  }, [isOnline]);
}
```

### Background Sync
```typescript
// Register sync when offline action queued
if ('sync' in ServiceWorkerRegistration.prototype) {
  const reg = await navigator.serviceWorker.ready;
  await reg.sync.register('sync-shipments');
}
```

## Web App Manifest
```json
{
  "name": "Shipping Tracker",
  "short_name": "Shipping",
  "display": "standalone",
  "start_url": "/",
  "icons": [...]
}
```

## Quality Checklist
- [ ] Lighthouse PWA score > 90
- [ ] Offline mode works
- [ ] Installable
- [ ] Background sync works
- [ ] Push notifications work

## Related Skills
- PWA patterns
- React patterns
- Service worker patterns
- IndexedDB operations
