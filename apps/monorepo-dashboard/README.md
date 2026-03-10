# Monorepo Health Dashboard

A comprehensive dashboard for monitoring the health, dependencies, configs, and workflows of the VibeTech monorepo.

## Features

- **Overview Tab** - Project structure, database connections, service status
- **Coverage Tab** - Test coverage metrics and trends
- **Bundles Tab** - Bundle size analysis and trends
- **Security Tab** - Vulnerability scanning (npm audit)
- **Dependencies Tab** - Live npm registry data, outdated packages with one-click updates
- **Configs Tab** - Config drift detection (tsconfig, eslint, prettier)
- **Nx-Cloud Tab** - Build performance and cache statistics
- **Workflow Tab** - Automated audit → propose → execute pipeline
- **Planning Tab** - Session metrics and productivity tracking

## Quick Start

```powershell
# From monorepo root
cd apps/monorepo-dashboard

# Start both frontend and backend
pnpm dev:all

# Or start separately:
pnpm dev        # Frontend on http://localhost:5173
pnpm dev:server # Backend on http://localhost:5177
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend dev server (port 5173) |
| `pnpm dev:server` | Start backend API server (port 5177) |
| `pnpm dev:all` | Start both concurrently |
| `pnpm build` | Build for production |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run tests |
| `pnpm test:ui` | Run tests with Vitest UI |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm validate` | Run typecheck + tests + build |

## Architecture

```
monorepo-dashboard/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # Shared UI components
│   ├── hooks/              # React Query hooks for data fetching
│   ├── services/           # API client services
│   └── monorepo-health/    # Main dashboard components
├── server/                 # Backend (Express + TypeScript)
│   ├── services/           # Data fetching services
│   └── index.ts            # API endpoints
└── tests/                  # Test files
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/workspace` | GET | Workspace projects |
| `/api/services` | GET | Service status |
| `/api/databases` | GET | Database health |
| `/api/dependencies/check` | GET | Outdated dependencies |
| `/api/dependencies/vulnerabilities` | GET | Security vulnerabilities |
| `/api/configs/drift` | GET | Config drift detection |
| `/api/workflow/audit` | POST | Run workspace audit |
| `/api/workflow/propose` | POST | Generate action proposals |
| `/api/workflow/execute` | POST | Execute selected actions |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Radix UI, Recharts
- **Backend**: Express 5, TypeScript, better-sqlite3
- **Testing**: Vitest, React Testing Library
- **Data**: TanStack React Query

## Status

- ✅ Phase 1: Dependency tracking (npm registry)
- ✅ Phase 2: Config drift detection
- ✅ Phase 3: Executable workflows
- ✅ Phase 4: Polish & testing
