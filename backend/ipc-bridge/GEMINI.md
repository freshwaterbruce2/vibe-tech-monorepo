---
type: ai-entrypoint
scope: project
audience:
  - gemini
status: production-ready
lastReviewed: 2026-02-09
---

# GEMINI.md - IPC Bridge

## Purpose
WebSocket bridge server for real-time communication between NOVA Agent and Vibe Code Studio. Routes IPC messages, tracks connected clients, and provides health/metrics endpoints.

## Location
`C:\dev\backend\ipc-bridge\`

## Tech Stack
- **Runtime**: Node.js (ESM)
- **WebSocket**: ws v8
- **Contracts**: `@vibetech/shared-ipc` (workspace)
- **Dev**: ts-node (Node 22+ `--import` loader)

## Key Commands
```bash
pnpm dev         # node --import ts-node/register src/server.ts
pnpm build       # tsc → dist/
pnpm start       # node dist/server.js
pnpm test        # vitest run
pnpm typecheck   # tsc --noEmit
```

## Architecture
```
src/
├── server.ts         # IPCBridgeServer class (WebSocket + HTTP)
├── commandRouter.ts  # Command routing between connected clients
├── health.ts         # /health, /ready, /metrics HTTP endpoints
└── register-ts-node.mjs  # ESM ts-node loader
```

## Critical Patterns
- **Port**: `5004` (default, configurable via `PORT` env)
- **Auth**: Optional `BRIDGE_SECRET` / `IPC_BRIDGE_SECRET` for connection validation
- **Server class**: `IPCBridgeServer` manages WebSocket connections, message routing, stats broadcasting
- **Command routing**: `CommandRouter` matches command requests from one client to results from another
- **Health**: HTTP server serves `/health`, `/ready`, `/metrics` alongside WebSocket
- **Graceful shutdown**: Handles `SIGINT`/`SIGTERM` for clean disconnection

## Dependencies
- `@vibetech/shared-ipc` — message type definitions (workspace link)
- `ws` — WebSocket implementation

## Canonical References
- AI notes: ../../AI.md
- Workspace rules: ../../docs/ai/WORKSPACE.md
