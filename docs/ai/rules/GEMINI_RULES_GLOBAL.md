# Gemini Anti-Gravity IDE - Global Rules & Context

**Canonical Source of Truth for all AI Agents, Editors, and Developers.**

> **Last Updated:** 2026-01-22
> **System:** Win32
> **Repository Root:** `C:\dev`

---

## 🎯 PILLAR 1: TECH STACK & ARCHITECTURE (Hard Constraints)

### Primary Tech Stack

- **Package Manager**: `pnpm` (REQUIRED - never use npm or yarn)
- **Build System**: Nx monorepo orchestration
- **Frontend Framework**: React + TypeScript + Vite
- **UI Library**: Tailwind CSS + shadcn/ui
- **State/Async**: TanStack Query
- **Backend/Services**: Node.js / Python 3.11+
- **Desktop Apps**: Tauri / Electron
- **Mobile Apps**: Capacitor (via Nx targets)

### Directory Structure (IMMUTABLE)

```
C:\dev\                          # Code, configs, source files
├── apps/                        # Application entry points (Web, Desktop, Mobile)
├── packages/                    # Shared libraries
├── projects/                    # Active projects & experiments
├── backend/                     # Backend services
├── scripts/                     # PowerShell automation
└── tests/                       # Test suites

D:\databases\                    # SQLite databases, large files (REQUIRED)
├── learning/                    # Learning system databases
├── crypto-enhanced/            # Trading data
├── vibe-code-studio/           # IDE data
├── ml_models/                  # Machine learning models
└── logs/                       # Application logs
```

### Path & Data Policy (NON-NEGOTIABLE)

1.  **Code lives in `C:\dev`**.
2.  **Data lives in `D:\`**.
    - **Databases**: `D:\databases\<project>`
    - **Logs**: `D:\logs\<project>`
    - **Large Artifacts**: `D:\data` or `D:\learning-system`
3.  **NEVER** create large databases, logs, or model files inside `C:\dev`.

---

## 🎨 PILLAR 2: CODING STYLE & CONVENTIONS

### General Standards

- **File Size**: Target 500 lines +/- 100 per source file.
- **Async-First**: ALWAYS use `async/await`. NEVER use blocking callbacks.
- **Strict Types**: TypeScript strict mode is mandatory. No explicit `any` without comments.
- **Imports**: Use `@/` alias for `src/` imports. Avoid deep relative paths (`../../`).

### Anti-Gravity Rules (Agent Behavior)

1.  **Uncertainty Protocol**: If unsure, **search the web** immediately. ALWAYS include the current date (e.g., "January 2026") in queries to avoid outdated info.
2.  **Agent/Skill Usage**:
    - **USE** specialized agents/skills if they improve output quality or safety.
    - **AVOID** them if they cause friction or errors; revert to standard tools.

### Domain-Specific Rules

#### 🌐 Web Apps (React)

- Prefer functional components.
- Keep components small and focused.
- Use `pnpm nx dev <project>` and `pnpm nx build <project>`.

#### 🖥️ Desktop (Tauri/Electron)

- Keep bundles small.
- Follow project-specific `AI.md` if present in the app folder.

#### 📱 Mobile

- Test device constraints; don't rely solely on browser behavior.
- Use Nx targets for Capacitor/Android builds.

#### 💹 Crypto / Trading (CRITICAL SAFETY)

- **NEVER** place live trades without explicit human confirmation.
- **NEVER** run multiple bot instances simultaneously.
- **NEVER** commit API keys or secrets. Use environment variables.
- All trading state/DB must reside in `D:\databases\...`.

#### 🛢️ Backend & Data

- **SQLite**: Must be on `D:\databases`. Use WAL mode.
- **Queries**: Always use parameterized queries.
- **Migrations**: Explicit migrations required.

---

## 🔄 PILLAR 3: WORKFLOW

### Development Cycle

1.  **Analyze**: Understand the requirements and file structure.
2.  **Plan**: Check `AI.md` (this file) and `.gemini/CONTEXT.md` (active memory).
3.  **Implement**: Write code with tests (TDD preferred).
4.  **Verify**: Run `pnpm nx run-many -t test` or `pnpm run quality`.

### Common Commands

- **Install**: `pnpm install`
- **Dev Server**: `pnpm nx dev <project>` or `pnpm parallel:dev`
- **Test**: `pnpm test` / `pnpm test:unit`
- **Quality**: `pnpm run quality` (Linting + Formatting)
- **Graph**: `pnpm graph`

---

## 📋 PILLAR 4: DOCUMENTATION SYSTEM

We use a **Single Source of Truth** system to avoid fragmentation.

1.  **`C:\dev\AI.md` (This File)**: The "Constitution". Static, high-level rules, architecture, and paths.
2.  **`.gemini/CONTEXT.md`**: The "Memory". Dynamic, session-specific context, active debugging notes, and pending tasks.
3.  **Project-Specific overrides**: Only allowed in `apps/<name>/AI.md` if absolutely necessary for unique constraints.

> **Agents & Editors**: Always read this file first to ground yourself in the project's reality.
