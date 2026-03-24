---
name: monorepo-skill
description: System-wide monorepo operations - Nx, workspace management, cross-project dependencies
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
category: infrastructure
priority: high
---

# Monorepo System-Wide Skill

> **ALWAYS ACTIVE** - Core patterns for the entire workspace

## Workspace Structure

```
C:\dev\                          # Monorepo root
├── apps/                        # Applications (30+)
│   ├── crypto-enhanced/         # Python trading
│   ├── vibe-code-studio/        # Electron desktop
│   ├── nova-agent/              # Tauri desktop
│   ├── nova-mobile-app/         # React Native
│   ├── invoice-automation-saas/ # Next.js SaaS
│   └── ...
├── packages/                    # Shared packages
│   ├── ui/                      # Shared UI components
│   ├── shared-utils/            # Utilities
│   ├── shared-config/           # Configs
│   └── nova-types/              # Shared types
├── backend/                     # Backend services
│   ├── openrouter-proxy/        # API proxy
│   ├── ipc-bridge/              # IPC service
│   └── ...
├── docs/                        # Documentation
│   └── ai/                      # AI instructions
├── .claude/                     # Claude Code config
│   ├── commands/                # Slash commands
│   ├── hooks/                   # Lifecycle hooks
│   ├── agents/                  # Agent definitions
│   └── skills/                  # Community skills
├── D:\databases\                # SQLite databases
├── D:\logs\                     # Application logs
├── D:\learning-system\          # Training data
└── nx.json                      # Nx configuration
```

## Package Manager

```bash
# ALWAYS use pnpm (NOT npm)
pnpm install           # Install dependencies
pnpm add <pkg>         # Add to current project
pnpm add -w <pkg>      # Add to workspace root
pnpm -F <project> <cmd> # Run in specific project
```

## Nx Commands

```bash
# Affected (only changed projects)
pnpm nx affected:build
pnpm nx affected:test
pnpm nx affected:lint

# Specific project
pnpm nx build <project>
pnpm nx test <project>
pnpm nx serve <project>

# Graph visualization
pnpm nx graph

# Run across all projects
pnpm nx run-many -t build
pnpm nx run-many -t test --parallel=5

# Cache operations
pnpm nx reset          # Clear cache
```

## Cross-Project Dependencies

### Importing Shared Packages

```typescript
// In apps/nova-agent/src/...
import { Button } from '@monorepo/ui';
import { formatDate } from '@monorepo/shared-utils';
import type { User } from '@monorepo/nova-types';
```

### Package.json Dependencies

```json
{
  "dependencies": {
    "@monorepo/ui": "workspace:*",
    "@monorepo/shared-utils": "workspace:*"
  }
}
```

### TypeScript Path Mapping

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@monorepo/ui": ["packages/ui/src/index.ts"],
      "@monorepo/shared-utils": ["packages/shared-utils/src/index.ts"]
    }
  }
}
```

## Project Detection

Projects are detected from file paths:

- `apps/{name}/...` → app project
- `packages/{name}/...` → shared package
- `backend/{name}/...` → backend service

## Standard Project Structure

### TypeScript App/Package

```
{app-or-package}/
├── src/
│   ├── index.ts          # Entry point
│   └── ...
├── package.json
├── project.json          # Nx config
├── tsconfig.json
├── CLAUDE.md             # AI instructions
└── AI.md                 # Extended AI notes
```

### Python App

```
{python-app}/
├── src/
│   └── ...
├── tests/
├── requirements.txt
├── pyproject.toml
├── project.json          # Nx config
└── CLAUDE.md
```

## Quality Commands

```bash
# Full quality check (all projects)
pnpm nx run-many -t lint,typecheck,test

# Single project quality
pnpm nx run <project>:lint
pnpm nx run <project>:typecheck
pnpm nx run <project>:test

# Affected only (CI-optimized)
pnpm nx affected -t lint,typecheck,test
```

## File Conventions

| File            | Purpose                                 |
| --------------- | --------------------------------------- |
| `CLAUDE.md`     | Claude Code instructions (thin pointer) |
| `AI.md`         | Extended AI notes                       |
| `GEMINI.md`     | GeminiCli instructions                  |
| `project.json`  | Nx project config                       |
| `tsconfig.json` | TypeScript config                       |

## Environment Variables

| Variable       | Location      | Purpose             |
| -------------- | ------------- | ------------------- |
| `DATABASE_URL` | `.env`        | Database connection |
| `API_KEY`      | `.env`        | API credentials     |
| Secrets        | NEVER in code | Use env vars        |

## Branch Strategy

```
main              # Production
├── feature/*     # New features
├── fix/*         # Bug fixes
└── refactor/*    # Code improvements
```

## Common Operations

### Add New App

```bash
pnpm nx g @nx/react:app my-new-app
# or
pnpm nx g @nx/next:app my-next-app
```

### Add New Package

```bash
pnpm nx g @nx/js:lib my-shared-lib
```

### Update Dependencies

```bash
pnpm update -r           # Update all
pnpm nx migrate latest   # Nx updates
```

## Quality Checklist (Before ANY Commit)

- [ ] `pnpm nx affected:lint` passes
- [ ] `pnpm nx affected:typecheck` passes
- [ ] `pnpm nx affected:test` passes
- [ ] No secrets in code
- [ ] CLAUDE.md updated if needed
- [ ] Dependencies properly declared

## Performance Tips

### Build Caching

Nx caches build outputs. Don't clear cache unless necessary.

### Parallel Execution

```bash
pnpm nx run-many -t build --parallel=5
```

### Affected Commands

Always prefer `affected:*` commands in CI.

## Emergency Commands

```bash
# Reset everything
pnpm nx reset
rm -rf node_modules
pnpm install

# Check what will be affected
pnpm nx print-affected --type=app

# Skip cache (debug)
pnpm nx build <project> --skip-nx-cache
```

## Community Skills to Use

- `typescript-expert` - Type issues
- `systematic-debugging` - Cross-project bugs
- `clean-code` - Code quality
- `verification-before-completion` - Quality gates
