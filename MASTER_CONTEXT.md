# MASTER CONTEXT — THE SINGLE SOURCE OF TRUTH

> **Owner:** Bruce Freshwater
> Last Updated: 2026-02-19
> **AI Partner:** Claude Sonnet 4.6 (The Architect)
> **Secondary AI:** Gemini 3.0 Pro (The Operator)

---

## 🔴 CRITICAL RULES (NON-NEGOTIABLE)

| Rule                          | Why                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **NO npm/yarn**               | pnpm only. Lockfile is sacred.                                                                              |
| **D:\ for data**              | All databases, logs, backups on D:\ drive                                                                   |
| **C:\dev for code**           | Source only, no runtime data.                                                                               |
| **Backup before destructive** | `Compress-Archive -Path .\src -DestinationPath .\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip` |
| **PowerShell 7+**             | Use `;` not `&&` for chaining.                                                                              |
| **Git exists**                | GitHub remote configured. Local `.git` is intentional for GitHub sync only.                            |

---

## 📊 MONOREPO ARCHITECTURE

**Location:** `C:\dev\` (pnpm workspace + Nx)
**pnpm version:** 10.28.2
**Node:** 22.x | **TypeScript:** 5.9 | **React:** 19 | **NX:** 22.4.5


### Apps (28 total — post Feb 17 herd trim)

| App | Status | Priority | Description |
|-----|--------|----------|-------------|
| **vtde** | Beta | 🔴 High | Vibe-Tech Desktop Environment (Tauri 2.0) — terminal, windows, memory, healing |
| **nova-agent** | Production | 🔴 High | Desktop Context Aware Guide (Tauri 2.0) |
| **vibe-code-studio** | Production | 🔴 High | AI-Powered IDE (Electron + Monaco) |
| **vibe-tutor** | Production | 🔴 High | AI Tutor (React Native/Expo) — Play Store ready |
| **nova-mobile-app** | Beta | 🔴 High | Nova Mobile Client (React Navigation + Zustand) — 12/12 tests |
| **mcp-codeberg** | Production | 🔴 High | GitHub Git MCP server |
| **mcp-skills-server** | Production | 🔴 High | Skills library MCP server |
| **memory-mcp** | Development | 🔴 High | Memory system MCP server |
| **vibe-shop** | Production | 🟡 Medium | E-commerce (Next.js + Neon Postgres) |
| **clawdbot-desktop** | Development | 🟡 Medium | Desktop automation (Electron, @nut-tree-fork) |
| **avge-dashboard** | Development | 🟡 Medium | Autonomous Video Generation Engine (Vite + React) |
| **vibe-justice** | Maintenance | 🟡 Medium | Legal document analysis (Claude API) |
| **prompt-engineer** | Maintenance | 🟡 Medium | Prompt Management System |
| **mcp-gateway** | Development | 🟡 Medium | MCP gateway server |
| **agent-sdk-workspace** | Development | 🟡 Medium | Anthropic Agent SDK — code-reviewer + quality-gate agents |
| **invoice-automation-saas** | Development | 🟢 Low | Invoice processing (Next.js + Stripe) |
| **shipping-pwa** | Development | 🟢 Low | Logistics PWA |
| **VibeBlox** | Development | 🟢 Low | Gamified token economy (Hono + SQLite) |
| **business-booking-platform** | Development | 🟢 Low | Booking/scheduling platform |
| **symptom-tracker** | Maintenance | 🟢 Low | Health tracking |
| **monorepo-dashboard** | Maintenance | 🟢 Low | Workspace visualization |
| **desktop-commander-v3** | Maintenance | 🟢 Low | Desktop automation MCP (deprioritized) |
| **crypto-enhanced** | Storage | 🟢 Low | Trading bot — parked, storage mode |
| **ai-youtube-pipeline** | Development | 🟢 Low | YouTube content pipeline |
| **vibe-tech-lovable** | Production | 🟢 Low | Vibe Tech landing page |
| **nova-mobile-app** | Beta | 🔴 High | Already listed above |

> ✅ **Cleanup queue:** Clear (Last checked 2026-02-22)

### Packages (26 total)

| Package | Status | Priority | Purpose |
|---------|--------|----------|---------|
| **memory** | Development | 🔴 Critical | Memory consolidation + recall (56/56 tests ✅) |
| **nova-core** | Production | 🔴 High | Core Nova agent logic |
| **nova-database** | Production | 🔴 High | Nova database layer |
| **nova-types** | Production | 🔴 High | Shared Nova types |
| **db-learning** | Production | 🔴 Critical | Learning system database |
| **shared-ipc** | Production | 🔴 High | IPC message schemas (Zod) |
| **backend** | Production | 🔴 High | Shared backend utilities |
| **feature-flags** | Development | 🔴 High | Feature Flag System |
| **testing-utils** | Production | 🔴 High | Testing utilities |
| **mcp-core** | Development | 🟡 Medium | MCP core utilities |
| **mcp-testing** | Development | 🟡 Medium | MCP testing utilities |
| **openclaw-bridge** | Development | 🟡 Medium | OpenClaw integration bridge |
| **openrouter-client** | Production | 🟡 Medium | OpenRouter API client |
| **service-common** | Production | 🟡 Medium | Common service patterns |
| **shared-config** | Production | 🟡 Medium | Shared configuration |
| **shared-utils** | Production | 🟡 Medium | Shared utilities |
| **shared-logic** | Production | 🟡 Medium | Shared business logic |
| **ui** | Production | 🟡 Medium | Shared UI components |
| **vibetech-hooks** | Production | 🟡 Medium | Shared React hooks |
| **vibetech-shared** | Production | 🟡 Medium | Shared Vibe utilities |
| **vibetech-types** | Production | 🟡 Medium | Shared TypeScript types |
| **logger** | Production | 🟡 Medium | Logging library |
| **db-app** | Production | 🟡 Medium | App database utilities |
| **vibe-python-shared** | Production | 🟡 Medium | Python shared utilities |
| **shared-ipc** | Production | 🔴 High | Already listed above |
| **shared-config** | Production | 🟡 Medium | Already listed above |


---

## 🤖 AGENT INFRASTRUCTURE

### Expert Agents (12) — in `C:\dev\.claude\agents\`

| Agent | Specialty |
|-------|-----------|
| crypto-expert | Trading, Kraken API, WebSocket V2 |
| webapp-expert | React, TypeScript, Vite |
| desktop-expert | Tauri, Electron, IPC |
| mobile-expert | Capacitor, PWA, Expo |
| backend-expert | Node, Python, REST |
| database-expert | SQLite, migrations |
| frontend-expert | React 19, shadcn/ui |
| api-expert | OpenRouter, DeepSeek |
| learning-expert | Pattern recognition |
| qa-expert | Vitest, pytest, Playwright |
| ui-ux-expert | Design systems, a11y |
| data-expert | ChromaDB, RAG |

### Sub-Agents (20+) — `C:\dev\.claude\sub-agents\`
### Agent System — `C:\dev\.agent\` (new system alongside .claude)
### Skills Library — 206 skills at `C:\Users\fresh_zxae3v6\.claude\skills\`

---

## 🔧 MCP SERVERS (Active in .mcp.json)

| Server | Purpose |
|--------|---------|
| desktop-commander | File ops, processes, system |
| nx-mcp | Monorepo orchestration |
| skills | Skill library (206 skills) |
| codeberg | GitHub Git operations |
| filesystem | File operations |
| sqlite | Main database |
| sqlite-trading | Trading database |
| notebooklm | Notebook management |
| youtube | Transcript extraction |
| serena (plugin) | Code analysis, LSP |

---

## 📁 STORAGE POLICY

```
C:\dev\                     # Source code ONLY
C:\dev\_backups\            # Manual zip backups

D:\databases\               # SQLite DBs (WAL mode)
  ├── crypto-enhanced\      # Trading databases
  ├── shared-memory\        # Agent shared state
  └── backups\              # Database backups
D:\logs\                    # Application logs
D:\backups\                 # Additional backups
D:\learning-system\         # Python learning system
D:\trading_data\            # Trading historical data
D:\trading_logs\            # Trading execution logs
D:\VibeJusticeData\         # Vibe Justice case data
D:\screenshots\             # Screenshots
```

---

## 🎯 CURRENT FOCUS (2026-02-19)

```
vtde-enhancement | memory-system | nova-mobile-app | vibe-tutor-release
```

| Project | Status | Notes |
|---------|--------|-------|
| vtde | Beta 🔴 | Tauri 2.0 DE — terminal, draggable windows, memory, healing dashboard |
| memory (package) | Development 🔴 | 56/56 tests, real embeddings, schema versioning, TTL cache |
| nova-mobile-app | Beta 🔴 | 4-screen nav, HTTP bridge, 12/12 tests |
| vibe-tutor | Production 🔴 | Play Store readiness confirmed |

---

## 🛠️ TOOLS

| Tool | Status | Purpose |
|------|--------|---------|
| ralph | Production | Autonomous maintenance — live mode, 4AM cron, GitHub Actions |
| autofixer | Production | Real-time autofixer agent |
| vibe-finisher | Production | Project completion tool |

---

## 🚨 KNOWN CLEANUP ITEMS

*Queue is currently empty. (Last cleaned 2026-02-22)*

---

## 🔄 HOOKS (Active)

| Hook | Script | Purpose |
|------|--------|---------|
| session-start | `session-start.ps1` | Load context on AI start |
| user-prompt-submit | `user-prompt-submit.ps1` | Pre-process prompts |
| pre-tool-use | `pre-tool-use-stdin.ps1` | Validate tool calls |
| post-tool-use | `post-tool-use-stdin.ps1` | Log tool results |

---

## 🛡️ FINISHER METHODOLOGY

1. **Identify blockers** — What prevents shipping?
2. **Fix the crash** — Stability first, features never.
3. **Backup before refactor** — Always.
4. **Test before done** — No merge without passing tests.
5. **Update DEV_CONTEXT.md** — At session end.

---

## ⚡ QUICK COMMANDS

```powershell
# Backup
Compress-Archive -Path .\src -DestinationPath .\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip

# Run all tests
pnpm nx run-many -t test

# Build specific app
pnpm nx build vtde

# Type check all
pnpm nx run-many -t typecheck

# NX graph
pnpm nx graph
```

---

## 📚 KEY DOCUMENTATION

| File | Purpose |
|------|---------|
| `C:\dev\MASTER_CONTEXT.md` | This file |
| `C:\dev\DEV_CONTEXT.md` | Daily status |
| `C:\dev\WORKSPACE.json` | Authoritative project registry (check this first) |
| `C:\dev\.claude\BOOT_SEQUENCE.md` | AI session protocol |
| `C:\dev\.claude\agents.json` | Agent registry |

---

*This document is THE authority. When in doubt, check WORKSPACE.json for project status.*
