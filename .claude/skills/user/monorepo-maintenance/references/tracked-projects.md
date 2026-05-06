# Tracked Projects

All projects monitored during weekly maintenance. Last audited: 2026-05-04.

## Monorepo Apps (`C:\dev\apps\`) — 26 total

### AI & Agents

| Project             | Path                       | Type             | Notes                              |
| ------------------- | -------------------------- | ---------------- | ---------------------------------- |
| nova-agent          | `apps/nova-agent`          | Tauri + Electron | Multi-agent AI, RAG, orchestration |
| ai-youtube-pipeline | `apps/ai-youtube-pipeline` | Python           | Video pipeline                     |
| prompt-engineer     | `apps/prompt-engineer`     | Vite + React     | Prompt crafting UI                 |

### Desktop Apps

| Project          | Path                    | Type             | Notes                                        |
| ---------------- | ----------------------- | ---------------- | -------------------------------------------- |
| vibe-code-studio | `apps/vibe-code-studio` | Tauri 2          | AI code editor                               |
| vtde             | `apps/vtde`             | Tauri            | Vibe Tech Desktop Environment (active focus) |
| clawdbot-desktop | `apps/clawdbot-desktop` | Electron         | Discord bot desktop UI                       |
| vibe-justice     | `apps/vibe-justice`     | Tauri 2 + Python | No root package.json; frontend/backend split |
| command-center   | `apps/vibetech-command-center` | Electron 33 | electron-vite/electron-builder dashboard     |

### Web Apps

| Project                   | Path                             | Type                        | Notes                       |
| ------------------------- | -------------------------------- | --------------------------- | --------------------------- |
| vibe-tech-lovable         | `apps/vibe-tech-lovable`         | Vite + React                | Company homepage            |
| business-booking-platform | `apps/business-booking-platform` | Vite + React                | Booking SaaS                |
| invoice-automation-saas   | `apps/invoice-automation-saas`   | Vite + React                | Invoice SaaS                |
| vibetech-command-center   | `apps/vibetech-command-center`   | Electron 33 + React         | Control Plane (replaces retired monorepo-dashboard) |
| shipping-pwa              | `apps/shipping-pwa`              | Vite + React (PWA)          | Shipping calculator         |
| avge-dashboard            | `apps/avge-dashboard`            | Vite + React                | Dashboard app               |
| symptom-tracker           | `apps/symptom-tracker`           | Vite + React                | Health symptom tracking     |
| vibe-shop                 | `apps/vibe-shop`                 | Next.js 16.1.6              | Approved no-Next exception  |
| gravity-claw              | `apps/gravity-claw`              | Local-only WIP              | pnpm-workspace excluded     |
| VibeBlox                  | `apps/VibeBlox`                  | Vite + React                | Block-based builder         |
| vibe-tutor                | `apps/vibe-tutor`                | Electron 35.7 + Capacitor 8 | Not React Native or Expo    |

### Mobile Apps

| Project         | Path                   | Type                | Notes                             |
| --------------- | ---------------------- | ------------------- | --------------------------------- |
| nova-mobile-app | `apps/nova-mobile-app` | Expo 54 + React Native 0.81 | Actual React Native mobile app |

### MCP Servers

| Project              | Path                        | Type       | Notes                        |
| -------------------- | --------------------------- | ---------- | ---------------------------- |
| desktop-commander-v3 | `apps/desktop-commander-v3` | MCP Server | Desktop automation           |
| mcp-codeberg         | `apps/mcp-codeberg`         | MCP Server | GitHub integration           |
| mcp-gateway          | `apps/mcp-gateway`          | MCP Server | Gateway/router               |
| mcp-skills-server    | `apps/mcp-skills-server`    | MCP Server | DEPRECATED                   |
| memory-mcp           | `apps/memory-mcp`           | MCP Server | Memory system (active focus) |

### Trading

| Project         | Path                   | Type   | Notes              |
| --------------- | ---------------------- | ------ | ------------------ |
| crypto-enhanced | `apps/crypto-enhanced` | Python | Managed via root scripts/Nx targets |

### Backend

| Project              | Path                        | Type    | Notes       |
| -------------------- | --------------------------- | ------- | ----------- |
| vibe-booking-backend | `apps/vibe-booking-backend` | Node.js | Booking API |

## Shared Libraries (`C:\dev\packages\`) — 24 total

| Library            | Path                          | Used By              |
| ------------------ | ----------------------------- | -------------------- |
| backend            | `packages/backend`            | Backend services     |
| db-app             | `packages/db-app`             | Apps with local DB   |
| db-learning        | `packages/db-learning`        | Learning/RAG systems |
| feature-flags      | `packages/feature-flags`      | All apps             |
| logger             | `packages/logger`             | All apps             |
| mcp-core           | `packages/mcp-core`           | MCP servers          |
| mcp-testing        | `packages/mcp-testing`        | MCP server tests     |
| memory             | `packages/memory`             | Memory system        |
| nova-core          | `packages/nova-core`          | No package manifest; do not treat as workspace package |
| nova-database      | `packages/nova-database`      | Nova apps            |
| nova-types         | `packages/nova-types`         | Nova apps            |
| openclaw-bridge    | `packages/openclaw-bridge`    | ClawdBot             |
| openrouter-client  | `packages/openrouter-client`  | AI-powered apps      |
| service-common     | `packages/service-common`     | Backend services     |
| shared-config      | `packages/shared-config`      | All apps             |
| shared-ipc         | `packages/shared-ipc`         | Electron/Tauri apps  |
| shared-logic       | `packages/shared-logic`       | Multiple apps        |
| shared-utils       | `packages/shared-utils`       | All apps             |
| testing-utils      | `packages/testing-utils`      | All test suites      |
| ui                 | `packages/ui`                 | All frontend apps    |
| vibe-python-shared | `packages/vibe-python-shared` | Python apps          |
| vibetech-hooks     | `packages/vibetech-hooks`     | React apps           |
| vibetech-shared    | `packages/vibetech-shared`    | All apps             |
| vibetech-types     | `packages/vibetech-types`     | All apps             |

## Backend Services (`C:\dev\backend\`)

| Service             | Path                          | Purpose                |
| ------------------- | ----------------------------- | ---------------------- |
| dap-proxy           | `backend/dap-proxy`           | Debug adapter proxy    |
| ipc-bridge          | `backend/ipc-bridge`          | IPC communication      |
| llm-finetuning      | `backend/llm-finetuning`      | Model fine-tuning      |
| lsp-proxy           | `backend/lsp-proxy`           | Language server proxy  |
| nova-sqlite-mcp     | `backend/nova-sqlite-mcp`     | SQLite MCP server      |
| openrouter-proxy    | `backend/openrouter-proxy`    | OpenRouter API proxy   |
| prompt-engineer     | `backend/prompt-engineer`     | Prompt engineering API |
| symptom-tracker-api | `backend/symptom-tracker-api` | Health API             |
| workflow-engine     | `backend/workflow-engine`     | Task automation        |

## Plugins (`C:\dev\plugins\`)

| Plugin     | Path                 | Purpose                        |
| ---------- | -------------------- | ------------------------------ |
| nx-toolkit | `plugins/nx-toolkit` | Custom Nx generators/executors |

## External Projects (`C:\Users\fresh_zxae3v6\`)

| Project                | Path | Type | Notes |
| ---------------------- | ---- | ---- | ----- |
| (run scan to populate) |      |      |       |
