---
type: ai-entrypoint
scope: project
audience:
  - gemini
status: needs-modernization
lastReviewed: 2026-02-09
---

# GEMINI.md - Backend

## Project Type
Monolith backend server providing REST APIs and SQLite database for the Vibe ecosystem.

## Location
`C:\dev\backend\`

## Tech Stack
- **Runtime**: Node.js (CommonJS — ⚠️ legacy, rest of monorepo uses ESM)
- **Framework**: Express 4
- **Database**: SQLite3 (`D:\databases\`)
- **Security**: Helmet, express-rate-limit, express-validator
- **Logging**: Winston + Morgan
- **Dev**: Nodemon

## Key Commands
```bash
pnpm dev       # nodemon server.js
pnpm start     # node server-production.js
pnpm test      # vitest run
pnpm lint      # eslint .
pnpm typecheck # tsc --noEmit
```

## Architecture
```
backend/
├── server.js              # Dev server (11KB, CJS)
├── server-production.js   # Production server (13KB, CJS)
├── config/                # Configuration
├── middleware/             # Express middleware
├── ipc-bridge/            # WebSocket bridge (separate ESM package)
├── openrouter-proxy/      # LLM proxy service
├── nova-sqlite-mcp/       # MCP server for Nova Agent DB access
├── lsp-proxy/             # Language Server Protocol proxy
├── dap-proxy/             # Debug Adapter Protocol proxy
├── prompt-engineer/       # Prompt management tools
├── workflow-engine/       # Task automation engine
├── symptom-tracker-api/   # VibeBlox symptom tracking
└── llm-finetuning/        # Model fine-tuning scripts
```

## ⚠️ Technical Debt
- **CJS**: Uses `require()` while monorepo standard is ESM (`"type": "module"`)
- **No real build**: `"build": "echo \"No build step required\""` — no TypeScript compilation
- **Dual servers**: `server.js` (dev) and `server-production.js` (prod) are separate monoliths
- **Sub-packages**: `ipc-bridge`, `openrouter-proxy`, etc. are independent ESM packages living under `backend/` — they do NOT share the CJS pattern

## Critical Sub-Packages
| Package | Port | Purpose |
|---|---|---|
| `ipc-bridge` | 5004 | WebSocket message routing |
| `openrouter-proxy` | — | LLM API proxy |
| `nova-sqlite-mcp` | — | MCP server for DB access |

## Canonical References
- AI notes: AI.md
- Workspace rules: ../docs/ai/WORKSPACE.md
