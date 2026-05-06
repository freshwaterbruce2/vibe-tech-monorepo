# Memory Sync System

Automatic synchronization system for Vibe-Tech monorepo projects to centralized memory bank on D:\ drive.

## Overview

This system watches your active projects and automatically mirrors changes to `D:\memory_bank`, maintaining a git history of all modifications. It follows your MANDATORY rule for data storage on D:\ drive.

## Quick Start

```powershell
# Test configuration
.\scripts\Test-MemorySync.ps1

# Start memory sync (interactive)
.\scripts\Start-MemorySync.ps1

# Start in background
.\scripts\Start-MemorySync.ps1 -Silent

# Add to Windows startup
.\scripts\Start-MemorySync.ps1 -RunOnStartup -Silent
```

## Monitored Projects

1. **crypto-enhanced** - Python Kraken trading system
2. **vibe-tech-lovable** - Portfolio website
3. **shipping-pwa** - Shipping workflow PWA
4. **business-booking-platform** - Hotel booking system
5. **vibe-tutor** - Electron + Capacitor tutor app for students
6. **memory-bank** - Memory management system

## Synchronized Content

### Source Code

- Python files (*.py)
- TypeScript/JavaScript (*.ts, *.tsx, *.js)
- Configuration files (*.json, *.yaml, *.config.*)
- Documentation (*.md)

### Prompts & Commands

- `.claude\commands\` → `D:\memory_bank\prompts\commands\`
- `.claude\agents\` → `D:\memory_bank\prompts\agents\`
- `CLAUDE.md` → `D:\memory_bank\prompts\CLAUDE.md`

### Excluded (Never Synced)

- node_modules/
- .venv/
- **pycache**/
- dist/, build/
- *.log files
- .env files
- Database files (*.db)

## Features

✅ **Smart Change Detection** - Only syncs when files actually change (SHA256 hashing)
✅ **Auto-commit** - Commits to git every 10 changes
✅ **Parallel Processing** - 4 workers for fast syncing
✅ **Non-destructive** - Never deletes files from memory bank
✅ **Size Limits** - Skips files larger than 50MB
✅ **Git History** - Full version control in memory bank

## File Structure

```
D:\memory_bank\
├── projects\
│   ├── crypto-enhanced\
│   ├── vibe-tech-lovable\
│   ├── shipping-pwa\
│   ├── business-booking-platform\
│   ├── vibe-tutor\
│   └── memory-bank\
├── prompts\
│   ├── commands\
│   ├── agents\
│   └── CLAUDE.md
└── .hash_cache.json
```

## Logs

View sync activity:

```powershell
# Last 20 log entries
Get-Content D:\logs\memory_sync.log -Tail 20

# Follow log in real-time
Get-Content D:\logs\memory_sync.log -Wait
```

## Git Operations

```powershell
# View memory bank history
cd D:\memory_bank
git log --oneline -10

# Check what changed
git diff HEAD~1

# Revert if needed
git reset --hard HEAD~1
```

## Configuration

Edit `C:\dev\memory_sync.yaml` to:

- Add/remove projects
- Change auto-commit threshold
- Modify include/exclude patterns
- Adjust performance settings

## Troubleshooting

### Python packages missing

```powershell
python -m pip install watchdog pyyaml gitpython
```

### Memory sync not starting

```powershell
# Check configuration
.\Test-MemorySync.ps1

# Run with verbose output
python C:\dev\memory_watcher.py
```

### High CPU usage

Edit `memory_sync.yaml`:

```yaml
performance:
  throttle_ms: 500  # Increase from 100
  batch_size: 50    # Decrease from 100
```

### Git conflicts

```powershell
cd D:\memory_bank
git status
git reset --hard HEAD  # Discard local changes
```

## Stop/Restart

To stop the background process:

```powershell
# Find process
Get-Process python | Where {$_.CommandLine -like "*memory_watcher*"}

# Kill it
Stop-Process -Name python -Force

# Restart
.\Start-MemorySync.ps1 -Silent
```

## Windows Startup

The system can run automatically on Windows startup:

```powershell
# Enable startup
.\Start-MemorySync.ps1 -RunOnStartup -Silent

# Disable startup (remove file)
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\MemorySync.bat"
```

## Performance Stats

- Initial sync: ~2-5 minutes (depends on project size)
- Change detection: <100ms per file
- Auto-commit: ~1-2 seconds
- Memory usage: ~50-100MB
- CPU usage: <1% idle, 5-10% during sync

## Safety Features

1. **Non-destructive** - Never deletes source files
2. **Size limits** - Won't sync files >50MB
3. **Hash verification** - Ensures file integrity
4. **Git backup** - Full history for rollback
5. **Exclude sensitive** - .env files never synced

## Created Files

- `C:\dev\scripts\Start-MemorySync.ps1` - Launcher script
- `C:\dev\scripts\Test-MemorySync.ps1` - Test script
- `C:\dev\scripts\python\memory_watcher.py` - Python watcher
- Memory-sync configuration should stay under `scripts\` or `D:\`, not as
  generated files in the repo root.
- `D:\memory_bank\` - Centralized memory storage
- `D:\logs\memory_sync.log` - Activity log

---

*Memory Sync System v1.0 - Following MANDATORY D:\ drive storage rule*
