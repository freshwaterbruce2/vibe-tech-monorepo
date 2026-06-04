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
❌ Running Vite production builds without forcing `NODE_ENV=production` (leads to fatal `f.jsxDEV` runtime crashes due to React mismatch)
❌ Saving PowerShell scripts in UTF-8 format with non-ASCII/Unicode/Emoji characters (leads to silent script truncation or syntax parse errors on default Windows ANSI code pages)
❌ Spawning nested build runners (like calling `pnpm` nested inside a sub-process shell) which can strip environment variables and path structures causing ENOENT
✅ `pnpm nx build <project>` from the repo root
✅ Run `pnpm install` first
✅ `npx nx reset` if cache problems
✅ Prepend `cross-env NODE_ENV=production` to all production build scripts in `package.json`
✅ Save PowerShell scripts as pure ASCII and execute tools from the primary terminal context

## Version Control

❌ Committing node_modules
❌ Large binary files in repo
✅ GitHub: github.com/freshwaterbruce2/vibe-tech-monorepo
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
❌ Dot property access on index-signatured objects or Record types under strict tsconfig (causes TS4111 noPropertyAccessFromIndexSignature errors)
❌ Assigning `undefined` to optional properties (causes TS2379 exactOptionalPropertyTypes mismatch unless `| undefined` is explicitly declared)
✅ Use @vibetech/* or @dev/* workspace imports
✅ Environment variables for secrets
✅ Use bracket notation (e.g., `object['property']`) for record indexing or declare optional fields explicitly in custom interfaces
✅ Declare optional properties with `| undefined` (e.g. `prop?: Type | undefined`) to comply with strict typechecks

## Output & Commits

❌ Emoji-decorated or unicode headers in diagnostic scripts (results in broken/replacement characters on CP-1252/CP-850 Windows terminals, logs, and Telegraf fallbacks)
❌ Conventional commit messages with subjects containing uppercase characters (e.g., `feat: Add API` or `fix: ASCII-safe`) or headers exceeding 100 characters
✅ Use clean, ASCII-safe borders (e.g., `=== Title ===`) and status labels (e.g., `[OK]`, `[WARN]`, `[ERROR]`, `[INFO]`) in command outputs
✅ Keep commit subjects strictly lowercase (e.g. `feat: add api`, `fix: ascii-safe`) and headers under 100 characters
