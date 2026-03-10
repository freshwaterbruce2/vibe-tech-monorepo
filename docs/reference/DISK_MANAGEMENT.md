# Disk Space Management Guide

## Current Status (as of cleanup)

- **C:\ Drive:** 459.9GB / 474.96GB used (~15GB free)
- **D:\ Drive:** 47.07GB / 931.39GB used (~884GB free)

## Quick Cleanup Commands

### Emergency Cleanup (frees ~10-15GB)

```powershell
# Run the quick cleanup script
C:\dev\tools\scripts\Quick-Cleanup.ps1

# Or run with auto-confirm
C:\dev\tools\scripts\Quick-Cleanup.ps1 -Auto
```

### Check Disk Usage

```powershell
# Quick metrics
metrics  # (alias for Get-DevMetrics-Fast.ps1)
```

## What Gets Cleaned

1. **node_modules folders** - Can be reinstalled with `pnpm install`
2. **Build artifacts** - dist, build, .next, .turbo, out folders
3. **Package manager caches** - pnpm store and npm cache
4. **Coverage reports** - Test coverage data

## Maintenance Schedule

### Daily

- Run `metrics` to monitor disk space
- If free space < 10GB, run cleanup

### Weekly

- Run `Quick-Cleanup.ps1` before weekends
- Clean up Downloads folder
- Empty Recycle Bin

### Monthly

- Review and delete old projects
- Consider moving inactive projects to D:\
- Clean Windows temp files: `cleanmgr`

## Moving Projects to D:\ Drive

For projects you're not actively working on:

```powershell
# Move a project to D:\
Move-Item -Path "C:\dev\apps\old-project" -Destination "D:\archived-projects\old-project"

# Create a symbolic link if needed
New-Item -ItemType SymbolicLink -Path "C:\dev\apps\old-project" -Target "D:\archived-projects\old-project"
```

## Space-Saving Tips

1. **Use pnpm** - It uses hard links, saving significant space vs npm
2. **Share dependencies** - Use workspace:* protocol in monorepo
3. **Clean regularly** - Set up a weekly Task Scheduler job
4. **Use .gitignore** - Never commit node_modules or build folders
5. **Archive old projects** - ZIP and move to D:\ or external storage

## When Working on Projects

```bash
# Before starting work on a project
cd C:\dev\apps\my-project
pnpm install  # Reinstalls dependencies

# After finishing work (optional)
rm -rf node_modules  # PowerShell: Remove-Item node_modules -Recurse -Force
```

## Monitoring Tools Created

- `C:\dev\tools\scripts\Get-DevMetrics-Fast.ps1` - Quick disk usage check
- `C:\dev\tools\scripts\Quick-Cleanup.ps1` - Automated cleanup script
- `C:\dev\tools\scripts\Emergency-Cleanup.ps1` - Emergency space recovery
- `C:\dev\tools\scripts\Analyze-DiskSpace.ps1` - Detailed space analysis

## Red Flags to Watch For

- C:\ drive > 95% full - Run cleanup immediately
- Free space < 5GB - Critical, may affect system performance
- node_modules > 1GB - Consider cleanup if not actively used
- Multiple .next folders - Next.js cache can grow large

## Recovery Plan if Disk Full

1. Run `Emergency-Cleanup.ps1 -Execute`
2. Clear Windows temp: `del /q /s %temp%\*`
3. Empty Recycle Bin
4. Move large files to D:\
5. As last resort: Disk Cleanup utility (cleanmgr)

---

Remember: node_modules and build folders are **always safe to delete** - they can be regenerated!
