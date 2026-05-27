# Backend Consolidation Strategy (ARCH-3.1)

## 1. Executive Summary

The VibeTech Monorepo currently has backend services spread across two primary locations:
- **`backend/`** — Shared/infrastructure backend services
- **`apps/*/backend/` or `apps/*/server/`** — App-specific backend services

This document defines the consolidation strategy for ARCH-3.1, cataloging all services, analyzing boundaries, and recommending a migration path.

---

## 2. Service Catalog

### 2.1 Shared Backend Services (`backend/`)

| Service | Path | Port | Type | Status |
|---------|------|------|------|--------|
| Main Server | `backend/server.js` | 3000 | Express monolith | Active |
| OpenRouter Proxy | `backend/openrouter-proxy/` | 3001 | Express proxy | Active |
| IPC Bridge | `backend/ipc-bridge/` | 5004 | WebSocket bridge | Active |
| DAP Proxy | `backend/dap-proxy/` | 5003 | DAP proxy | Active |
| LSP Proxy | `backend/lsp-proxy/` | 5002 | LSP proxy | Active |
| Prompt Engineer | `backend/prompt-engineer/` | 9001 | Express API | Active |
| Symptom Tracker API | `backend/symptom-tracker-api/` | — | REST API | Active |
| Workflow Engine | `backend/workflow-engine/` | 5003 | Event engine | Active |
| Middleware | `backend/middleware/` | — | Shared middleware | Library |
| Config | `backend/config/` | — | Shared config | Library |

### 2.2 App-Specific Backend Services

| App | Backend Path | Type | Port |
|-----|-------------|------|------|
| `vibe-booking` | `apps/vibe-booking/backend/` | Express | — |
| `vibe-booking-v2` | `apps/vibe-booking-v2/server/` | Hono | — |
| `vibe-justice` | `apps/vibe-justice/backend/` (Python FastAPI) | FastAPI | — |
| `vibe-tech-lovable` | `apps/vibe-tech-lovable/backend/` | Express | — |
| `vibe-invoice` | `apps/vibe-invoice/server/` | Fastify | — |
| `vibe-reminder` | `apps/vibe-reminder/server/` | Hono | — |
| `vibe-reminder-v2` | `apps/vibe-reminder-v2/server/` | Hono | — |
| `vibe-dental` | `apps/vibe-dental/server/` | Hono | — |
| `vibe-discharge` | `apps/vibe-discharge/server/` | Hono | — |
| `vibe-portal` | `apps/vibe-portal/server/` | Hono | — |
| `vibe-reflection` | `apps/vibe-reflection/server/` | Hono/Express | — |
| `prior-auth-pro` | `apps/prior-auth-pro/server/` | Hono | — |
| `proposal-review-saas` | `apps/proposal-review-saas/server/` | Hono | — |
| `serenity-flow` | `apps/serenity-flow/server/` | Hono | — |
| `test-factory-app` | `apps/test-factory-app/server/` | Hono | — |
| `vibe-dental` | `apps/vibe-dental/server/` | Hono | — |
| `_-factory-runtime-smoke` | `apps/_-factory-runtime-smoke/server/` | Hono | — |

---

## 3. Service Boundary Analysis

### 3.1 Infrastructure Services (Keep in `backend/`)
These services are shared cross-application infrastructure and should remain in `backend/`:

- **OpenRouter Proxy** — Centralized AI provider routing; shared by all apps
- **IPC Bridge** — NOVA ↔ VCS WebSocket bridge; tight coupling to desktop architecture
- **DAP/LSP Proxies** — Protocol adapters for Vibe Code Studio
- **Middleware** — Shared auth, rate-limiting, logging middleware
- **Config** — Shared environment validation

### 3.2 App Backend Services (Colocate with App)
App-specific backends should remain colocated with their frontend:
- Factory-generated apps (`vibe-booking-v2`, `vibe-invoice`, etc.) — Hono servers are intentionally colocated
- `vibe-justice` Python backend — FastAPI service with PyInstaller bundling

### 3.3 Consolidation Candidates
These backend services in `backend/` show overlap and could be merged:
- `backend/prompt-engineer/` → Move into `apps/prompt-engineer/` as it serves only that app
- `backend/symptom-tracker-api/` → Move into `apps/` namespace if there's a frontend pairing
- `backend/workflow-engine/` → Candidate for elevation to a standalone microservice or Nx app

---

## 4. Consolidation Approach

### 4.1 Recommended Architecture

```
backend/                    ← Keep: True shared infrastructure only
├── openrouter-proxy/       ← Keep: Cross-app AI routing
├── ipc-bridge/             ← Keep: NOVA/VCS protocol bridge
├── dap-proxy/              ← Keep: Debug adapter
├── lsp-proxy/              ← Keep: Language server
├── middleware/             ← Keep: Shared Express/Hono middleware
└── config/                 ← Keep: Env/config utilities

apps/prompt-engineer/       ← Move: prompt-engineer backend
apps/symptom-tracker/       ← Move: symptom-tracker-api
apps/*/server/              ← Keep: App-specific Hono servers
```

### 4.2 Framework Standardization
For new app backends, standardize on **Hono** (already the dominant choice for factory-generated apps):
- Lightweight, edge-compatible
- TypeScript-native
- Compatible with Cloudflare Workers, Node, Bun

### 4.3 Shared Middleware Migration
Move shared backend utilities from `backend/middleware/` and `backend/config/` into `@vibetech/core/service` (per ARCH-2.1 consolidation plan) to enable import via workspace packages.

---

## 5. Migration Plan

### Phase 1: Inventory & Stabilize (1 day)
- [x] Catalog all backend services (this document)
- [ ] Verify all services start without errors
- [ ] Document API surface for each service

### Phase 2: Dependency Injection (2 days)
- [ ] Move `backend/middleware/` exports into `@vibetech/core/service`
- [ ] Move `backend/config/` exports into `@vibetech/core/config`
- [ ] Update imports in all services

### Phase 3: Service Relocation (3 days)
- [ ] Move `prompt-engineer` backend into `apps/prompt-engineer/`
- [ ] Move `symptom-tracker-api` into appropriate app or new `apps/symptom-tracker/`
- [ ] Update Nx project.json targets and workspace registration

### Phase 4: Cleanup (1 day)
- [ ] Remove stale backend directories
- [ ] Update `WORKSPACE.json`
- [ ] Run `pnpm run workspace:health`

---

## 6. API Standards (for ARCH-3.2)

All backend services should conform to:

```typescript
// Standard response envelope
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    total?: number;
    timestamp: string;
  };
}
```

- **HTTP Methods**: REST conventions (GET/POST/PUT/PATCH/DELETE)
- **Error Codes**: Use HTTP standard codes + app-specific error codes
- **Auth**: Bearer JWT for protected endpoints
- **CORS**: Centralized via `@vibetech/core/service` middleware
- **Rate Limiting**: Applied at OpenRouter Proxy and per-service where needed
- **OpenAPI**: All services should expose `/openapi.json` schema endpoint

---

## 7. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Service downtime during migration | HIGH | Blue-green migration; keep old services running during transition |
| Import breakage from middleware move | MEDIUM | Use re-export shims in old locations during transition |
| Port conflicts after service moves | LOW | Document all service ports in WORKSPACE.json |
| Python FastAPI isolation | LOW | Python backend stays isolated; no Node consolidation needed |

---

*Generated: 2026-05-27 | Status: COMPLETED | Task: ARCH-3.1*
