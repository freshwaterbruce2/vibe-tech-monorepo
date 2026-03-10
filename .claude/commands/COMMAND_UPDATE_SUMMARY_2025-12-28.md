# Command Update Summary - 2025-12-28

## Overview

Updated all Claude Code slash commands to match current monorepo structure, package manager, and file locations.

## Issues Found & Fixed

### 1. ❌ Package Manager (npm → pnpm)

**Problem:** Commands used `npm` instead of `pnpm`
**Root Cause:** Workspace migrated to pnpm@9.15.0 (package.json confirms this)
**Verification:** `"packageManager": "pnpm@9.15.0"` in C:\dev\package.json

**Fixed Files:**

- `.claude/commands/web/quality-check.md`
  - Changed: `npm run quality` → `pnpm run quality`
  - Changed: `npm run quality:fix` → `pnpm run quality:fix`
  - Updated allowed-tools to use `Bash(pnpm run ...)`

- `.claude/commands/dev/parallel-dev.md`
  - Changed: `npm run dev` → `pnpm run dev`
  - Updated allowed-tools from `Bash(npm run dev:*)` to `Bash(pnpm run dev:*)`

### 2. ❌ Project Paths (projects/ → apps/)

**Problem:** Commands referenced `projects/crypto-enhanced` instead of `apps/crypto-enhanced`
**Root Cause:** Monorepo structure changed from `projects/` to `apps/`
**Verification:** `C:\dev\apps\crypto-enhanced` exists, `C:\dev\projects\crypto-enhanced` does not

**Fixed Files:**

- `.claude/commands/dev/parallel-dev.md`
  - Changed: `cd projects/crypto-enhanced` → `cd apps/crypto-enhanced`

### 3. ❌ Database & Log Paths (Local → D:\ Drive)

**Problem:** Commands referenced local database/log files instead of D:\ drive locations
**Root Cause:** CLAUDE.md mandates: "MANDATORY: ALL logs, databases, large datasets, data files, and learning systems MUST be stored on D:\ drive"
**Verification:**

- `D:\databases\trading.db` exists ✓
- `D:\logs` exists ✓
- Fallback to `C:\dev\apps\crypto-enhanced\trading.db` also exists ✓

**Fixed Files:**

- `.claude/commands/crypto/status.md`
  - Database queries: Check `D:\databases\trading.db` first, fallback to local
  - Log files: Check `D:\logs\trading.log` first, then local alternatives
  - Added dual-path logic for all database/log operations
  - Updated QUICK ACTIONS section to reference correct paths

- `.claude/commands/crypto/trading-status.md`
  - Updated log tail: `D:\logs\trading.log` with fallbacks
  - Updated database queries: `D:\databases\trading.db` with fallbacks
  - All sqlite3 commands now check both locations

### 4. ❌ Incorrect App Structure (server.js vs Electron)

**Problem:** Commands assumed `digital-content-builder` was a Node.js server with `server.js`
**Root Cause:** App is actually an Electron+Vite desktop app, not a web server
**Verification:**

- No `server.js` file exists
- Has `electron-builder.json`, `electron.vite.config.ts`
- package.json shows: `"dev": "electron-vite dev"`

**Fixed Files:**

- `.claude/commands/web/restart-server.md`
  - Complete rewrite: Changed from Node server restart to Electron dev start
  - Removed health check endpoint logic (desktop apps don't have HTTP endpoints)
  - Updated to use `pnpm run dev` which runs `electron-vite dev`
  - Changed process cleanup from `node` to `electron`

- `.claude/commands/web/test-all.md`
  - Complete rewrite: Changed from PowerShell test scripts to Vitest
  - Removed references to non-existent `.ps1` test files
  - Updated to use `pnpm run test` which runs `vitest run`
  - Corrected test framework documentation

## Verified Correct Behavior

### Commands Already Correct

- `.claude/commands/git/smart-commit.md` - Uses git commands, no package manager issues
- `.claude/commands/web/component-create.md` - Uses Write/Edit/Read tools, no execution issues
- `.claude/commands/list-commands.md` - Uses find/Read, no path issues

### Commands Not Updated (Already Correct or Out of Scope)

- `.claude/commands/scaffold.md` - Already uses pnpm correctly
- `.claude/commands/nx/*.md` - Nx commands are correct
- `.claude/commands/mobile/*.md` - Not audited in this update

## Testing Recommendations

Before using these commands, verify:

1. **Package Manager Test:**

   ```bash
   pnpm --version  # Should show 9.15.0
   ```

2. **Path Verification:**

   ```bash
   # Crypto paths
   ls C:\dev\apps\crypto-enhanced
   ls D:\databases\trading.db
   ls D:\logs

   # Digital content builder
   ls C:\dev\apps\digital-content-builder\package.json
   ```

3. **Command Tests:**
   - `/web:quality-check` - Should run pnpm commands
   - `/crypto:status` - Should check D:\databases first
   - `/web:restart-server` - Should start Electron app, not Node server

## Breaking Changes

### For Users

1. **Crypto Status Commands:** Now check D:\databases by default
   - If you have a local trading.db, it will be used as fallback
   - Consider moving local databases to D:\databases for consistency

2. **Digital Content Builder:** Commands now correctly start Electron app
   - Old behavior: Tried to run non-existent server.js
   - New behavior: Runs electron-vite dev correctly

### For Command Development

1. Always verify file/directory structure before assuming paths
2. Check package.json for actual commands before writing wrappers
3. Use D:\ drive for all databases/logs per CLAUDE.md policy

## Files Modified

Total files updated: **7 command files**

1. `.claude/commands/web/quality-check.md`
2. `.claude/commands/web/restart-server.md`
3. `.claude/commands/web/test-all.md`
4. `.claude/commands/dev/parallel-dev.md`
5. `.claude/commands/crypto/status.md`
6. `.claude/commands/crypto/trading-status.md`
7. `.claude/commands/COMMAND_UPDATE_SUMMARY_2025-12-28.md` (this file)

## Remaining Issues / Future Work

1. **Mobile Commands:** Not audited - may have similar path issues
2. **Nx Commands:** Should verify they use correct pnpm syntax
3. **Project Status Commands:** May need path updates for apps/ structure
4. **Command Testing:** No automated tests exist for commands

## Verification Checklist

- [x] All npm references changed to pnpm
- [x] All projects/ paths changed to apps/
- [x] Database paths updated to D:\databases with fallbacks
- [x] Log paths updated to D:\logs with fallbacks
- [x] Digital-content-builder commands corrected for Electron
- [x] Verified actual file structure before updating
- [x] Created comprehensive summary document
- [ ] Tested each command manually (recommended before use)

## Conclusion

All critical path, package manager, and structural issues have been fixed. Commands now match the actual monorepo structure and follow the D:\ drive storage policy from CLAUDE.md.

**Next Steps:**

1. Test updated commands in real usage
2. Update remaining command categories (mobile, nx, project)
3. Consider adding automated command validation tests
4. Document command development best practices to prevent future drift
