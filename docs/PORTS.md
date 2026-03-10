# Port Registry

> **Last Updated**: 2026-02-13
>
> Central registry of port assignments across the Vibe monorepo. Check here before assigning new ports.

## Active Services

| Port  | Service                     | Location                                  | Notes                            |
| ----- | --------------------------- | ----------------------------------------- | -------------------------------- |
| 3000  | Nova Agent (Tauri server)   | `apps/nova-agent/src/server.ts`           | Desktop AI assistant             |
| 3001  | Shipping PWA Worker         | `apps/shipping-pwa/worker/index.ts`       | Also used for mobile ADB reverse |
| 3003  | VibeBlox Backend            | `apps/VibeBlox/server/`                   | Hono server                      |
| 3090  | AVGE Dashboard Backend      | `apps/avge-dashboard/server/src/index.ts` | Configurable via PORT env        |
| 3100  | Feature Flags Server        | `packages/feature-flags/`                 | Self-hosted feature flags        |
| 4200  | Vibe Desktop (PTY)          | `apps/vibe-desktop/`                      | Terminal PTY server              |
| 5002  | LSP Proxy                   | `backend/lsp-proxy/src/index.js`          | Language Server Protocol         |
| 5003  | DAP Proxy / Workflow Engine | `backend/dap-proxy/src/index.js`          | ⚠️ Port collision risk           |
| 5004  | IPC Bridge                  | `backend/ipc-bridge/src/server.ts`        | WebSocket bridge                 |
| 5173  | Vite Dev (default)          | Multiple apps                             | Vite default dev port            |
| 5176  | Feature Flags Dashboard     | `packages/feature-flags/dashboard/`       | Vite dev server                  |
| 5177  | Monorepo Dashboard          | `apps/monorepo-dashboard/server/`         | Dev server                       |
| 18789 | ClawdBot Desktop HTTP       | `apps/clawdbot-desktop/electron/main.ts`  | Desktop automation               |
| 18790 | ClawdBot Desktop WS         | `apps/clawdbot-desktop/electron/main.ts`  | WebSocket                        |

## Backend Server (Express)

| Port | Service             | Notes                          |
| ---- | ------------------- | ------------------------------ |
| 3001 | Main Backend (dev)  | `backend/server.js`            |
| 3001 | Main Backend (prod) | `backend/server-production.js` |

## Collision Warnings

> [!WARNING]
> **Port 5003**: Both `dap-proxy` and `workflow-engine` claim port 5003. Verify they don't run simultaneously.

> [!WARNING]
> **Port 3001**: Both `shipping-pwa` worker and the main backend use 3001. Use env overrides to differentiate.

## Reserved Ranges

| Range     | Purpose                   |
| --------- | ------------------------- |
| 3000–3099 | App servers               |
| 3100–3199 | Infrastructure services   |
| 4200–4299 | Terminal/PTY services     |
| 5000–5099 | Backend proxies & bridges |
| 5173–5199 | Vite dev servers          |
| 8000–8099 | Camera/media services     |
| 18000+    | Desktop automation        |
