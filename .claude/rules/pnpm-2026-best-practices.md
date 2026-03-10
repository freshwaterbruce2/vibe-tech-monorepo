# pnpm 2026 Best Practices for Windows 11 Monorepo

Last Updated: 2026-02-03
Priority: MANDATORY
Status: ACTIVE
Configuration: Isolated mode

---

## Overview

This monorepo uses **pnpm 10.28.1** with **isolated mode** for project-specific operations.

**Key Principle:** Use `--filter <project>` for all single-project operations to avoid full monorepo installs.

---

## Configuration

### `.npmrc` Settings (2026)

```ini
# Project isolation (KEY SETTING)
node-linker=isolated

# Workspace protocol
save-workspace-protocol=true

# Prevent recursive installs (KEY SETTING)
recursive-install=false

# Store location (D:\ data drive)
store-dir=D:\pnpm-store

# Resolution mode (highest compatible)
resolution-mode=highest

# Public hoist for Nx compatibility
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
public-hoist-pattern[]=*typescript*
public-hoist-pattern[]=@nx/*
public-hoist-pattern[]=nx
```

**File Location:** `C:\dev\.npmrc`

---

## CRITICAL: Use --filter for Single Projects

### ✅ CORRECT (Isolated Operation)

```powershell
# Install deps for ONE project only
pnpm install --filter vibe-tutor

# Add package to ONE project only
pnpm add react-query --filter vibe-tutor

# Update ONE project only
pnpm update --filter nova-agent

# Run command in ONE project only
pnpm --filter crypto-enhanced test
```

### ❌ WRONG (Full Monorepo Install)

```powershell
# Don't do this from project directory
cd apps/vibe-tutor
pnpm install  # ❌ Installs entire monorepo!
```

---

## Common Operations

### Install Dependencies

```powershell
# Single project
pnpm install --filter <project>

# All projects (rare - use sparingly)
pnpm install --recursive
```

### Add/Remove Packages

```powershell
# Add to specific project
pnpm add <package> --filter <project>
pnpm add -D <package> --filter <project>

# Remove from specific project
pnpm remove <package> --filter <project>
```

### Update Packages

```powershell
# Update one package in project
pnpm update <package> --filter <project>

# Update all in project
pnpm update --filter <project>

# Check outdated
pnpm outdated --filter <project>
```

### Run Scripts

```powershell
# Run in specific project
pnpm --filter <project> dev
pnpm --filter <project> build
pnpm --filter <project> test
```

---

## Nx Integration

Nx commands automatically handle dependencies:

```powershell
# Preferred for most operations
pnpm nx dev vibe-tutor
pnpm nx build nova-agent
pnpm nx test crypto-enhanced

# Run affected projects only
pnpm nx affected:build
pnpm nx affected:test
```

**Benefit:** Nx understands project dependencies and runs only what's needed.

---

## PowerShell Helper Functions

Added to your profile (`$PROFILE`):

```powershell
# Reload profile to use
. $PROFILE

# Then use shortcuts
pi <project>              # Install
pa <package> <project>    # Add package
pd <project>              # Dev server
pb <project>              # Build
pu <project> <package>    # Update package
pl <project>              # List deps
```

---

## Package Manager Coexistence

| Tool | Purpose | Status |
|------|---------|--------|
| **pnpm** | Monorepo development (primary) | ✅ Active |
| **npm** | Global packages, legacy tools | ✅ Available |
| **npx** | Execute packages (Antigravity IDE) | ✅ Works |

**Antigravity IDE:** Uses npx - fully compatible, no changes needed.

---

## Performance Improvements

### Before (Hoisted Mode)
- Install time: ~5-10 minutes (full monorepo)
- Disk usage: High (duplicates)
- Scope: Entire workspace

### After (Isolated Mode)
- Install time: ~30-60 seconds (single project)
- Disk usage: Optimized (dedupe + isolation)
- Scope: Only affected project

**Speed improvement: ~10x faster**

---

## Windows 11 Specific Settings

```ini
# Use copy instead of hardlinks (NTFS compatibility)
package-import-method=copy

# Store on D:\ drive (per paths policy)
store-dir=D:\pnpm-store
```

**Why D:\:** Separates code (C:\dev) from package cache (D:\)

---

## Project List

### Apps (apps/*)
- vibe-tutor
- nova-agent
- crypto-enhanced
- vibe-code-studio
- desktop-commander-v3
- vibe-tech-lovable
- business-booking-platform
- shipping-pwa
- iconforge

### Packages (packages/*)
- shared-components
- ui-components
- feature-flags

### Backend (backend/*)
- vibe-tech-backend
- openrouter-proxy

---

## Troubleshooting

### Issue: "Full monorepo installs on single project"

**Cause:** Missing `--filter` flag

**Solution:**
```powershell
# Use --filter
pnpm install --filter <project>
```

### Issue: "Command not found after install"

**Cause:** Binary not in PATH

**Solution:**
```powershell
# Use pnpm exec
pnpm --filter <project> exec <command>

# Or add to scripts in package.json
```

### Issue: "Workspace dependency not found"

**Cause:** Workspace protocol not enabled

**Solution:** Already configured in `.npmrc`:
```ini
save-workspace-protocol=true
prefer-workspace-packages=true
```

---

## Migration from Old Setup

If you have existing node_modules from hoisted mode:

```powershell
# Remove old node_modules
Remove-Item -Recurse -Force C:\dev\node_modules
Remove-Item -Recurse -Force C:\dev\apps\*\node_modules
Remove-Item -Recurse -Force C:\dev\packages\*\node_modules

# Fresh install with new config
pnpm install --filter <project>
```

**Backup first:** D:\ snapshot created at `20260203-160640`

---

## Best Practices

### 1. Always Use --filter for Single Projects

```powershell
# ✅ Good
pnpm install --filter vibe-tutor

# ❌ Bad
cd apps/vibe-tutor && pnpm install
```

### 2. Use Nx for Build/Test Operations

```powershell
# ✅ Preferred
pnpm nx build vibe-tutor

# ✅ Also OK
pnpm --filter vibe-tutor build
```

### 3. Update Dependencies Regularly

```powershell
# Check outdated per project
pnpm outdated --filter <project>

# Update specific package
pnpm update <package> --filter <project>
```

### 4. Use Workspace References

In `package.json`:
```json
{
  "dependencies": {
    "@monorepo/shared-components": "workspace:*"
  }
}
```

**Benefit:** Always uses latest workspace version.

---

## Related Documentation

- **Setup Guide:** `PNPM_2026_SETUP_COMPLETE.md`
- **Quick Reference:** `PNPM_QUICK_REFERENCE.md`
- **Project Commands:** `PROJECT_SPECIFIC_COMMANDS.md`
- **Paths Policy:** `.claude/rules/paths-policy.md`
- **CI/CD Integration:** `.claude/rules/ci-cd-nx.md`

---

## Sources (2026 Research)

Based on:
1. pnpm official docs (2026)
2. Windows 11 monorepo best practices
3. Nx + pnpm integration guide
4. npm/pnpm coexistence patterns
5. Antigravity IDE MCP compatibility

---

**Key Takeaway:** Always use `--filter <project>` for isolated operations! 🎯
