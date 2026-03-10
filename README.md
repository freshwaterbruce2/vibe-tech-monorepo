# Vibe Tech - Multi-Project Monorepo

A high-performance monorepo containing multiple applications, shared libraries, and tooling across web, desktop, mobile, and backend services.

## 🗂️ Path Architecture

This project uses a clear separation between code and data:

- **Code**: `C:\dev` (all source code, version controlled)
- **Data**: `D:\` (databases, logs, datasets, learning systems)
- **See [AI.md](./AI.md), [docs/reference/PATH_CHANGE_RULES.md](./docs/reference/PATH_CHANGE_RULES.md), and [docs/reference/SYSTEM_SURFACES.md](./docs/reference/SYSTEM_SURFACES.md) for details.**

## 📊 Project Status

- **Overall Health**: 98.0/100 ✅ (Grade A+ Production Ready)
- **Last Updated**: February 6, 2026
- **Current Phase**: Active Innovation & Standardization
- **AI-Powered CI**: GitHub Actions + Nx affected pipelines ✨

| Category      | Status         | Score   | Notes                                         |
| ------------- | -------------- | ------- | --------------------------------------------- |
| Architecture  | ✅ Excellent   | 98/100  | Standardized on Nx 22.4.5 and React 19.2.4.   |
| Security      | ✅ Protected   | 98/100  | Vibe Justice Remediation Complete.            |
| Type Safety   | ✅ Enforced    | 100/100 | TypeScript 5.9.3 Strict Mode everywhere.      |
| Code Quality  | ✅ Strong      | 95/100  | Ralph Methodology & "One Tool" Fixers active. |
| Testing       | ✅ Robust      | 90/100  | Playwright E2E & Vitest fully integrated.     |
| Documentation | ✅ Exceptional | 95/100  | Comprehensive KIs and automated docs.         |
| CI/CD         | ✅ AI-Enhanced | 99/100  | Self-Healing CI with automated fixes.         |

## 🚀 Getting Started

This project requires **Node.js 22+** and **pnpm 10.28.2+**.

### 1. Setup

```bash
# Clone the repository
git clone https://github.com/freshwaterbruce2/Monorepo.git vibetech
cd vibetech

# Install dependencies (pnpm is required)
pnpm install
```

### 2. Development

```bash
# Start the development server for the main app
pnpm run dev

# Run a legacy app-specific flow
pnpm run dev:gravity-claw

# Or run a specific Nx project target
pnpm nx run <project>:dev
```

## 🛠️ Available Commands

We use `pnpm nx` as the standard invocation pattern.

| Command                     | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `pnpm run dev`              | Starts the default Nx development target (`vtde:dev`).  |
| `pnpm nx run-many -t build` | Builds all projects.                                    |
| `pnpm run test`             | Runs Nx test targets across projects.                   |
| `pnpm run sync:audit`       | Runs monorepo synchronization policy checks.            |
| `pnpm run workspace:inventory` | Generates a non-blocking Nx-aware workspace review report. |
| `pnpm run workspace:cleanup:dry` | Lists repo-root and generated cleanup candidates without deleting them. |
| `pnpm run databases:health` | Reports database topology, duplicate names, and WAL growth. |
| `pnpm run memory:health` | Checks `memory.db` and its WAL/SHM sidecars. |
| `pnpm run workspace:health` | Runs the safe-stabilization review suite across paths, Nx, databases, and learning state. |
| `pnpm run quality`          | Runs full quality suite (lint, test, build, typecheck). |
| `pnpm run monorepo:health`  | Runs workspace health checks.                           |
| `pnpm run workspace:clean`  | Deep clean of node_modules and caches.                  |

## 📂 Monorepo Structure

```text
vibetech/
├── 📂 apps/                    # Applications (52+ projects)
│   ├── ⚖️ vibe-justice/        # Legal AI Platform (React + Python FastAPI)
│   ├── 💻 vibe-code-studio/    # Desktop IDE (Electron)
│   ├── 📱 vibe-tutor/          # Mobile Learning App (Capacitor)
│   ├── 🐍 crypto-enhanced/     # Crypto Trading System (Python)
│   ├── 🎨 iconforge/           # Icon Management
│   └── [48+ more apps]
├── 📂 packages/                # Shared libraries
│   ├── ⚙️ eslint-config-custom
│   └── 🎨 ui-library
├── 📂 backend/                 # Backend services
├── 📂 tools/                   # Development tools
└── 📄 nx.json                  # Nx workspace config
```

## 💻 Technology Stack

- **Monorepo**: Nx 22.4.5+ with intelligent caching
- **Frontend**: React 19.2.4, TypeScript 5.9.3, Tailwind CSS v4
- **Desktop**: Electron (Vibe Code Studio), Tauri (Nova Agent)
- **Mobile**: Capacitor (Vibe Tutor)
- **Backend**: Node.js 22+, Python 3.11+, FastAPI
- **Testing**: Vitest, Playwright, pytest
- **Package Manager**: pnpm 10.28.2+
- **Version Control**: GitHub (Git)

## 📄 License

This project is licensed under the MIT License.
