# Commands Reference

## Development

```bash
pnpm run dev                        # Start dev server (port 5173)
pnpm run build                      # Production build
pnpm nx dev <project>               # Start specific project
pnpm nx build <project>             # Build specific project
```

## Quality (run before commits)

```bash
pnpm run quality                    # Full pipeline: lint + typecheck + build
pnpm run quality:fix                # Auto-fix lint issues + typecheck
pnpm run quality:affected           # Only changed projects (faster)
pnpm run lint                       # ESLint only
pnpm run typecheck                  # TypeScript only
```

## Testing

```bash
pnpm run test                       # Playwright E2E tests
pnpm run test:unit                  # Unit tests (Vitest)
pnpm run test:unit:coverage         # Unit tests with coverage
pnpm run test:ui                    # Playwright UI mode
```

## Git

```bash
git add <files> && git commit -m "feat: description"
git push origin main
git log main..HEAD --oneline        # Commits ahead of main
```

## Nx Monorepo

```bash
pnpm nx graph                       # Visualize project dependencies
pnpm nx affected:build              # Build only affected projects
pnpm nx affected:test               # Test only affected projects
pnpm nx reset                       # Clear Nx cache
```

## Port Manager

```powershell
C:\dev\tools\port-manager\port.ps1 check 8091   # Check if port in use
C:\dev\tools\port-manager\port.ps1 kill 8091    # Kill process on port
C:\dev\tools\port-manager\port.ps1 list         # List all registered ports
C:\dev\tools\port-manager\port.ps1 clear vite   # Kill all Vite dev servers
C:\dev\tools\port-manager\port.ps1 find 3000 3099  # Find free port in range
```

Port ranges: `3000-3099` backend, `3100-3199` MCP, `5173-5199` Vite, `8000-8999` specialized.

## Cleanup

```powershell
.\tools\scripts\Quick-Cleanup.ps1          # Weekly cleanup
.\tools\scripts\Emergency-Cleanup.ps1     # Deep cleanup (removes node_modules etc.)
```

## Custom Slash Commands (`.claude/commands/`)

- `/web:quality-check [fix]` — lint + typecheck + build
- `/web:component-create <name>` — generate React component
- `/dev:port-check <port>` — identify process on port
- `/git:smart-commit` — AI-generated commit message
- `/mcp:debug` — diagnose MCP server issues
- `/list-commands` — show all available commands
