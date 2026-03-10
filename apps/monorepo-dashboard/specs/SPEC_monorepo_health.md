# Monorepo Health Dashboard - Specification

## Purpose

Provide real-time health monitoring for the VibeTech monorepo (C:\dev) with:

- Project structure visualization
- Dependency tracking
- Configuration alignment checks
- Runtime service/database reachability
- Automated maintenance workflows

## Core Features

### 1. Project Overview Tab ✓

- [x] Display categorized project tree
- [x] Show health metrics (score, total projects, dependencies)
- [x] Runtime reachability checks (services, databases)
- [x] Stack version display
- [x] Conventions checklist

### 2. Dependencies Tab (PARTIAL)

- [x] Display dependency updates list
- [ ] **Wire to npm registry for real-time checks**
- [ ] Filter by severity (critical, recommended, optional)
- [ ] One-click update actions
- [ ] Show affected projects for each dependency

### 3. Configs Tab (PARTIAL)

- [x] Display config baselines grid
- [ ] **Implement real config drift detection**
- [ ] Compare tsconfig.json across projects
- [ ] Compare eslint configs
- [ ] Compare package.json scripts
- [ ] Highlight misalignments with suggested fixes

### 4. Workflow Tab ✓

- [x] 3-phase workflow cards (Audit, Propose, Execute)
- [x] Visual progress tracking
- [ ] **Make phases actually executable (not just UI)**
- [ ] Backup state before changes
- [ ] Apply approved changes
- [ ] Run validation after changes

## Backend API Requirements

### Current Endpoints

- `GET /api/nx/workspace` - Nx workspace data ✓
- `GET /api/services` - Service status ✓
- `GET /api/databases` - Database status ✓

### Missing Endpoints

- `GET /api/dependencies/check` - Check npm registry for updates
- `GET /api/configs/drift` - Analyze config drift across projects
- `POST /api/workflow/audit` - Execute audit phase
- `POST /api/workflow/propose` - Generate proposed changes
- `POST /api/workflow/execute` - Apply approved changes

## Data Sources

- **Nx MCP Server** - Project graph, metadata
- **npm registry** - Dependency versions
- **File system** - Config files (tsconfig, eslint, package.json)
- **D:\databases\** - Database connection checks
- **Port scanning** - Service reachability

## UI/UX

- Dark theme (slate-900 to slate-800 gradient)
- Animated counters for metrics
- Expandable/collapsible categories
- Real-time status badges
- Progress bars for scanning

## Performance

- Backend API should respond in <500ms
- Frontend should update in real-time via polling (5s interval)
- No blocking operations on UI thread

## Safety

- Read-only by default
- Require confirmation before executing changes
- Backup state before modifications
- Rollback capability

## Tech Stack

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Express + better-sqlite3
- Data: Nx MCP Server, filesystem, npm registry
