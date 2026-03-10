# Dependency Management

## Overview

Dependencies are managed through:

1. **Renovate** - Automated PRs for updates (weekends)
2. **Manual scripts** - For immediate updates or major versions

## Automated Updates (Renovate)

Renovate runs every Sunday at 4 AM and creates PRs for:

- **Grouped updates**: React, TypeScript, NX, Vite, Electron, Testing, Linting
- **Security fixes**: Labeled with `security`, high priority
- **Auto-merge**: Patch-level devDependencies merge automatically

### PR Labels

| Label | Meaning |
|-------|---------|
| `dependencies` | All dependency PRs |
| `security` | Security vulnerability fix |
| `breaking` | Major version update |

## Manual Updates

### Quick Commands

```powershell
# Check what's outdated
pnpm deps:check

# Update all (minor/patch)
pnpm deps:update

# Interactive selection
pnpm deps:update:interactive

# Security audit
pnpm deps:audit

# NX framework updates
pnpm deps:nx-migrate
pnpm deps:nx-run-migrations
```

### Scripts

```powershell
# Full dependency check with audit
.\scripts\deps-check.ps1 -Audit

# Interactive update
.\scripts\deps-check.ps1 -Interactive

# Major version update (with backup)
.\scripts\deps-major-update.ps1 -Package "react"
```

## Update Schedule

| Type | Frequency | Method |
|------|-----------|--------|
| Security | Immediate | Renovate auto-PR |
| Patch/Minor | Weekly | Renovate grouped PR |
| Major | Manual | Review + `deps-major-update.ps1` |
| NX | Monthly | `nx migrate latest` |

## Major Update Checklist

1. ☐ Create backup: `Compress-Archive -Path .\src -DestinationPath .\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip`
2. ☐ Read changelog for breaking changes
3. ☐ Update package: `pnpm update [package] --latest`
4. ☐ Run tests: `pnpm nx affected --target=test`
5. ☐ Fix any breaking changes
6. ☐ Commit with message: `chore(deps): update [package] to vX.X.X`

## Troubleshooting

### pnpm-lock.yaml conflicts

```powershell
# Delete and regenerate
Remove-Item pnpm-lock.yaml
pnpm install
```

### NX cache issues after update

```powershell
npx nx reset
pnpm install
```

### Rollback failed update

```powershell
# Restore from backup
Expand-Archive -Path ".\_backups\[backup-name].zip" -DestinationPath "." -Force
pnpm install
```
