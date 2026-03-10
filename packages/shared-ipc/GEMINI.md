---
type: ai-entrypoint
scope: project
audience:
  - gemini
status: production-ready
lastReviewed: 2026-02-09
---

# GEMINI.md - @vibetech/shared-ipc

## Purpose
IPC message schemas and contracts for communication between NOVA Agent, Vibe Code Studio, and the IPC Bridge. Provides Zod-validated type-safe message definitions.

## Location
`C:\dev\packages\shared-ipc\`

## Tech Stack
- **Language**: TypeScript (ESM)
- **Validation**: Zod v4
- **Runtime**: Node.js

## Key Commands
```bash
pnpm build      # tsc → dist/
pnpm test       # vitest
pnpm typecheck  # tsc --noEmit
pnpm clean      # rimraf dist
```

## Architecture
```
src/
├── index.ts             # Package exports
├── base-schemas.ts      # Core Zod schemas (shared types)
├── message-schemas.ts   # IPC message type definitions
├── payload-schemas.ts   # Message payload contracts
├── schemas.ts           # Combined schema registry (17KB)
├── validators.ts        # Runtime validation helpers
├── helpers.ts           # Utility functions
├── registry.ts          # Message type registry
├── queue.ts             # Message queue implementation
└── offline-handler.ts   # Offline message buffering
```

## Critical Patterns
- **Zod schemas** define the contract — both `ipc-bridge` and consumer apps import these
- **Offline handler** buffers messages when WebSocket connection drops
- **Queue** provides ordered message delivery with retry semantics
- Package is consumed by: `ipc-bridge`, `vibe-code-studio`, `nova-agent`

## Exports
```typescript
// Main entry: dist/index.js
export { /* schemas, types, validators, helpers */ } from './schemas';
```

## Canonical References
- AI notes: AI.md
- Workspace rules: ../../docs/ai/WORKSPACE.md
