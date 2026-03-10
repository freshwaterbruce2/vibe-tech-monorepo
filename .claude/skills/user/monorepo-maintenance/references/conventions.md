# Conventions

Core patterns for the @vibetech/workspace monorepo.

## File Organization

- **Code storage**: `C:\dev` (monorepo root)
- **Data/logs storage**: `D:\` (never in code directories)
- **External projects**: `C:\Users\fresh_zxae3v6`

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Directories | kebab-case | `nova-agent`, `vibe-code-studio` |
| React components | PascalCase | `UserProfile.tsx`, `DataTable.tsx` |
| Utilities/hooks | camelCase | `useAuth.ts`, `formatDate.ts` |
| Constants | SCREAMING_SNAKE | `API_BASE_URL`, `MAX_RETRIES` |

## File Limits

**360 lines max per file** - non-negotiable. If a file approaches this limit during maintenance, flag for refactoring split.

## Package Management

- **Manager**: pnpm (never npm or yarn)
- **Workspace protocol**: `workspace:*` for internal dependencies
- **Lock file**: `pnpm-lock.yaml` must be committed
- **Node version**: Specified in `.nvmrc` or `package.json` engines

## Monorepo Structure

```
C:\dev\
├── apps/                    # Deployable applications (26)
├── backend/                 # Backend services & proxies
├── packages/                # Shared libraries (24)
├── plugins/                 # Nx plugins (nx-toolkit)
├── tools/                   # Build tools, scripts
├── nx.json                  # Nx configuration
├── pnpm-workspace.yaml      # Workspace definition
├── WORKSPACE.json           # Current project status
└── tsconfig.base.json       # Base TypeScript config
```

## Version Control

- **Platform**: GitHub (Git exists at `C:\dev\.git`)
- **Sync**: GitHub only. No GitLab.
- **Shell commands**: Never include git commands in automated workflows or skill scripts.

## Nx Patterns

- Use `nx affected` commands for incremental builds
- Define targets in `project.json`, not `package.json` scripts
- Use shared target defaults in `nx.json`
- Tag projects for constraint enforcement

## TypeScript

- Strict mode enabled
- Path aliases defined in `tsconfig.base.json`
- Per-app configs extend base
- ES2022+ target for modern features

## Shell

- PowerShell 7+ only
- Chain commands with `;` (not `&&`)
- All paths use backslashes or `os.path.join`
