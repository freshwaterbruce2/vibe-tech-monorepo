# Anti-Patterns (What NOT To Do)

## Package Management

❌ `npm install` - Breaks pnpm lockfile
❌ `yarn add` - Wrong package manager
❌ Mixing npm and pnpm commands in same session
✅ Always use `pnpm`

## File Organization

❌ Files over 500 lines - Split early
❌ Writing data/logs to C:\dev - Use D:\
❌ Relative paths in documentation
✅ Data/logs → D:\
✅ Absolute paths in docs

## Build System

❌ `pnpm build` from repo root (ambiguous)
❌ Skipping `pnpm install` after git pull
❌ Ignoring NX cache issues
✅ `cd apps/[name] && pnpm build`
✅ Run `pnpm install` first
✅ `npx nx reset` if cache problems

## Version Control

❌ Codeberg references (we use GitHub)
❌ Committing node_modules
❌ Large binary files in repo
✅ GitHub: github.com/freshwaterbruce2/Monorepo
✅ Use .gitignore properly

## AI Agent Behavior

❌ Starting work without reading WORKSPACE.json
❌ Ignoring D:\learning-system\sessions\CURRENT.md
❌ Destructive changes without backup
❌ Creating duplicate functionality
✅ Read context files on session start
✅ Backup before refactors: `Compress-Archive -Path .\src -DestinationPath .\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip`

## Code Patterns

❌ `any` type in TypeScript (use proper types)
❌ Console.log in production code
❌ Hardcoded API keys/secrets
❌ Importing from node_modules directly in monorepo packages
✅ Use @vibetech/*or @dev/* workspace imports
✅ Environment variables for secrets
