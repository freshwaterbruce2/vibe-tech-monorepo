# VibeTech Monorepo - Global Context

**Last Updated**: 2026-01-15
**Token Count**: ~380 tokens

---

## Monorepo Structure

```
C:\dev (vibetech.git)
├── apps/           # 27 applications (web, desktop, mobile)
├── packages/       # Shared libraries (@nova/*, @vibetech/ui)
├── backend/        # Root-level API servers (openrouter-proxy, vibe-tech-backend)
└── docs/           # Documentation
```

**Project Categories**:

- **Desktop** (7): nova-agent, vibe-code-studio, vibe-justice, desktop-commander-v3
- **Mobile** (3): vibe-tutor, vibe-subscription-guard, nova-mobile-app
- **Web** (12): iconforge, business-booking-platform, digital-content-builder, shipping-pwa
- **Backend** (5): openrouter-proxy, ipc-bridge, search-service, memory-bank, vibe-tech-backend

---

## Storage Policy

**CRITICAL**: C:\ for code, D:\ for data

- **Code**: `C:\dev\` (GitHub: vibetech.git)
- **Databases**: `D:\databases\` (SQLite, PostgreSQL)
- **Logs**: `D:\logs\`
- **Learning System**: `D:\learning-system\` (59,014+ executions)
- **Learning Database**: `D:\databases\nova_shared.db` (55 MB)
- **Version Control (D:\)**: `D:\repositories\vibetech\` (local snapshots, no GitHub corruption)

---

## Core Technology Stack

**Frontend**: React 19, TypeScript 5.9+, Vite 7, Tailwind CSS 3.4.18, shadcn/ui
**Backend**: Node.js 22 LTS, Express/Fastify, Python 3.11+, FastAPI
**Desktop**: Tauri 2.x (preferred), Electron 30+
**Mobile**: Capacitor 7, Android WebView
**Databases**: SQLite (primary), PostgreSQL (production), ChromaDB (vectors)
**Testing**: Vitest 2, pytest, Playwright
**AI**: OpenRouter (Claude 4.5, DeepSeek R1), multi-model support
**Package Manager**: pnpm 9.15.0
**Build System**: Nx 21.6+ with caching

---

## Agent System

**12 Specialized Agents**:

- **Platform** (6): crypto, desktop, mobile, webapp, backend, database
- **Cross-Cutting** (6): frontend, api, learning, qa, ui-ux, data

**Token Budget**: <2% of 200k window per agent invocation
**Context Loading**: Tiered (Level 1: 500 tokens, Level 2: 2000 tokens, Level 3: 10000 tokens)
**Anti-Duplication**: PRIMARY DIRECTIVE for all agents

---

## Learning System Integration

**Database**: `D:\databases\nova_shared.db`
**Executions**: 59,014 tool usage records
**Tables**: agent_executions, success_patterns, failure_patterns, code_patterns
**Pattern Recognition**: Automated via hooks + pattern_analyzer.py
**RAG Queries**: Top 5 patterns by confidence score (≥0.8)

---

## Critical Rules

1. **ALWAYS store data on D:\ drive** (databases, logs, learning data)
2. **ALWAYS search before creating** (anti-duplication)
3. **ALWAYS use pnpm** (NOT npm or yarn)
4. **ALWAYS follow storage policy** (C:\ code, D:\ data)
5. **ALWAYS query learning DB** before implementing new patterns
6. **ALWAYS suggest D:\ snapshots** before risky changes (`.claude/rules/d-drive-version-control.md`)
