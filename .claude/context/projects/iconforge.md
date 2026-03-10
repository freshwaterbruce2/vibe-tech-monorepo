# IconForge - Project Context

**Type**: Web Application (React 19 + Vite 7)
**Agent**: webapp-expert
**Status**: Development (Phase 1 MVP)
**Token Count**: ~650 tokens

---

## Overview

AI-powered icon creation platform with real-time collaboration.

**Key Features**:

- Fabric.js canvas editor (vector editing)
- DALL-E 3 AI generation (OpenRouter integration)
- Real-time collaboration (Socket.io + Yjs)
- Export to multiple formats (SVG, PNG, ICO)

---

## Tech Stack

**Frontend**: React 19, TypeScript 5.9+, Vite 7, Tailwind CSS 3.4.18
**UI Components**: shadcn/ui, lucide-react icons
**Canvas**: Fabric.js 6.0+ (vector editing)
**State**: Zustand (global state), TanStack Query (server state)
**Backend**: Fastify 5.0+ (port 3002)
**Real-time**: Socket.io (WebSocket), Yjs (CRDT)
**Database**: SQLite (`D:\databases\database.db` - unified)
**Auth**: Clerk (user authentication)
**AI**: OpenRouter (DALL-E 3 for icon generation)

---

## Directory Structure

```
apps/iconforge/
├── src/
│   ├── components/        # React components
│   │   ├── canvas/        # Fabric.js canvas components
│   │   ├── editor/        # Icon editor UI
│   │   └── shared/        # Shared UI components
│   ├── services/          # API clients, WebSocket
│   ├── stores/            # Zustand stores
│   ├── hooks/             # React hooks
│   └── types/             # TypeScript types
├── server/                # Fastify backend
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── websocket/         # Socket.io handlers
└── database/              # SQLite schema
```

---

## Common Workflows

### 1. Canvas Operations

```typescript
// Add shape to canvas
import { fabric } from 'fabric';

const rect = new fabric.Rect({
  left: 100,
  top: 100,
  fill: 'red',
  width: 50,
  height: 50,
});
canvas.add(rect);
```

### 2. AI Icon Generation

```typescript
// OpenRouter DALL-E 3 integration
const response = await fetch('http://localhost:3002/api/generate-icon', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'minimalist rocket icon, flat design',
    size: '1024x1024',
  }),
});
```

### 3. Real-time Collaboration

```typescript
// Yjs document sync
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider('ws://localhost:3002', 'iconforge', ydoc);
```

---

## Database Schema

**Tables**:

- `users` - User accounts (Clerk integration)
- `projects` - Icon projects
- `icons` - Individual icon metadata
- `collaborators` - Project sharing
- `generations` - AI generation history

**Path**: `D:\databases\database.db` (unified database)

---

## Common Issues

### Issue: Canvas not rendering

**Solution**: Ensure Fabric.js loaded before creating canvas

```typescript
useEffect(() => {
  const canvas = new fabric.Canvas('canvas', {
    width: 800,
    height: 600,
  });
  return () => canvas.dispose();
}, []);
```

### Issue: WebSocket connection fails

**Solution**: Check Fastify server running on port 3002

```bash
pnpm nx dev iconforge-backend
```

### Issue: AI generation timeout

**Solution**: OpenRouter DALL-E 3 can take 30-60 seconds

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 60000); // 60s timeout
```

---

## Anti-Duplication Checklist

Before implementing features:

1. Check `src/components/` for existing UI
2. Check `src/services/` for API clients
3. Check `packages/vibetech-shared/` for shared utilities
4. Query learning DB for proven patterns:

   ```sql
   SELECT * FROM code_patterns WHERE file_path LIKE 'apps/iconforge%';
   ```

---

## Integration Points

**OpenRouter Proxy**: `backend/openrouter-proxy/` (port 3001)
**Shared UI**: `packages/vibetech-shared/ui/`
**Database Utils**: `packages/nova-database/`

---

## Performance Targets

- **Canvas FPS**: 60fps (use requestAnimationFrame)
- **AI Generation**: <60 seconds (DALL-E 3)
- **WebSocket Latency**: <100ms (local network)
- **Export Time**: <2 seconds for SVG, <5 seconds for PNG

---

## Next Steps (MVP)

1. Complete canvas editor (shape tools, layers)
2. Integrate DALL-E 3 icon generation
3. Implement export to SVG/PNG/ICO
4. Add user authentication (Clerk)
5. Deploy to production
