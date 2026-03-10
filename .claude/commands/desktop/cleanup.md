# Desktop Cleanup Command

---

name: cleanup
display_name: Desktop Cleanup
category: desktop
description: Automated cleanup of build artifacts, logs, and cache with disk space recovery
priority: medium

---

## Command

```bash
/desktop:cleanup [options]
```

## Options

- **`--mode`** (default: dry-run) - Execution mode: `dry-run`, `execute`
- **`--project`** (default: auto-detect) - Specify project
- **`--targets`** (default: all) - Cleanup targets: `build-artifacts`, `logs`, `cache`, `all`
- **`--max-age`** (default: 7days) - Archive logs older than this (7days, 30days, etc.)
- **`--confirm`** (default: false) - Skip confirmation for large deletions (>1GB)

## Description

Delegates to the **desktop-cleanup-specialist** sub-agent for automated cleanup of stale build artifacts, log archival, and cache management. Always runs dry-run first for safety, showing what would be deleted before actual execution.

## What It Does

1. **Build Artifact Cleanup**
   - Removes stale dist directories (dist-electron-v2 through v7)
   - Cleans Cargo build artifacts (target/release, target/debug)
   - Removes .tsbuildinfo files
   - Cleans .nx cache directories

2. **Log File Management**
   - Archives old logs (>7 days) to D:\logs\archive\
   - Compresses with gzip (90% size reduction)
   - Keeps only last 10 error reports
   - Removes duplicate logs

3. **Cache Cleanup**
   - Clears node_modules/.cache
   - Manages Playwright browser cache (keeps last 2 versions)
   - Removes obsolete .electron-gyp cache

4. **Disk Space Recovery**
   - Reports total space recovered
   - Breakdown by category (artifacts, logs, cache)
   - Generates cleanup report

## Examples

### Basic usage (dry-run, see what would be deleted)

```bash
/desktop:cleanup
```

### Execute cleanup after dry-run approval

```bash
/desktop:cleanup --mode=execute
```

### Cleanup specific targets only

```bash
/desktop:cleanup --targets=build-artifacts --mode=execute
```

### Cleanup with custom log age

```bash
/desktop:cleanup --targets=logs --max-age=30days --mode=execute
```

### Auto-confirm large deletions (use with caution!)

```bash
/desktop:cleanup --mode=execute --confirm
```

## Expected Output (Dry-Run)

```
✓ Desktop Cleanup (Dry-Run)

Would Delete:
  - apps/vibe-code-studio/dist-electron-v2 (245 MB)
  - apps/vibe-code-studio/dist-electron-v3 (238 MB)
  - apps/vibe-code-studio/dist-electron-v4 (241 MB)
  - apps/nova-agent/src-tauri/target/debug (512 MB)

Would Archive:
  - build_log.txt (24 KB → build_log_2026-01-08.log.gz)
  - test_output.txt (8 MB → test_output_2026-01-08.log.gz)

Total Recovery: 1.2 GB

Safe to proceed: ✓
Confirmation required: Yes (>1GB)

Run with --mode=execute to apply changes
```

## Expected Output (Execute)

```
✓ Desktop Cleanup Complete

Deleted:
  - apps/vibe-code-studio/dist-electron-v2 (245 MB)
  - apps/vibe-code-studio/dist-electron-v3 (238 MB)
  - apps/nova-agent/src-tauri/target/debug (512 MB)

Archived:
  - build_log.txt → D:\logs\archive\build_log.gz (24 KB → 2.1 KB)
  - test_output.txt → D:\logs\archive\test_output.gz (8 MB → 980 KB)

Disk Space Recovered: 1.2 GB
  - Build artifacts: 995 MB
  - Logs: 8.5 MB (compressed to 1 MB)
  - Cache: 71 MB

Execution time: 45s
```

## When To Use

- **Weekly maintenance** - Prevent artifact accumulation
- **Low disk space** - Recover gigabytes quickly
- **Build failures** - Clean corrupted cache
- **Before major builds** - Start fresh
- **After multiple iterations** - Remove old attempts

## Safety Mechanisms

### 1. Always Dry-Run First

```bash
# SAFE: Shows what would be deleted
/desktop:cleanup

# DANGEROUS: Only use after reviewing dry-run
/desktop:cleanup --mode=execute
```

### 2. Confirmation for Large Deletions

If >1GB would be deleted, confirmation is required:

```
⚠️ Large deletion detected: 1.2 GB
Delete these files? (yes/no): _
```

Skip confirmation with `--confirm` flag (use with caution!)

### 3. Preserves Active Builds

Never deletes:

- Current `dist-electron/` directory
- Current `dist/` directory
- `node_modules/` (dependencies)
- Source code (`src/`)

### 4. Archives Before Deletion

Logs are **archived** (not deleted):

```
Original: D:\logs\vibe-code-studio\build_log.txt (24 KB)
Archived: D:\logs\archive\build_log_2026-01-08.log.gz (2.1 KB)
```

## Cleanup Targets

### Build Artifacts

```bash
/desktop:cleanup --targets=build-artifacts
```

Removes:

- `dist-electron-*` (old Electron builds)
- `target/debug`, `target/release` (Rust/Cargo)
- `.tsbuildinfo` (TypeScript incremental)
- `.nx/cache` (Nx computation cache)

**Typical Recovery**: 500 MB - 2 GB

### Logs

```bash
/desktop:cleanup --targets=logs --max-age=7days
```

Archives to D:\logs\archive\ and compresses:

- `*.log` files
- `*_error.txt` files
- `test_*.txt` files
- `build_*.txt` files

**Typical Recovery**: 50-200 MB (compressed to 5-20 MB)

### Cache

```bash
/desktop:cleanup --targets=cache
```

Clears:

- `node_modules/.cache`
- Playwright browsers (keeps last 2 versions)
- `.electron-gyp` cache

**Typical Recovery**: 100-500 MB

### All (default)

```bash
/desktop:cleanup --targets=all
```

Runs all cleanup targets above.

**Typical Recovery**: 1-3 GB

## Vibe-Code-Studio Specific Cleanup

**Problem**: 7+ failed build directories accumulated

```
dist-electron/           ← KEEP (current build)
dist-electron-fixed/     ← DELETE (old attempt)
dist-electron-v2/        ← DELETE (failed iteration)
...
dist-electron-v7/        ← DELETE (failed iteration)
```

**Cleanup Result**:

```
Deleted 7 old build directories
Recovered: 1.5 GB disk space
```

## Nova-Agent (Tauri) Specific Cleanup

**Problem**: Cargo cache grows unbounded

```
target/debug/       ← DELETE (rebuild fast)
target/release/     ← KEEP (last 3 builds)
target/incremental/ ← DELETE (rebuild fast)
```

**Cleanup Result**:

```
Deleted debug builds and incremental cache
Recovered: 800 MB disk space
```

## Sub-Agent Details

- **Delegates to**: desktop-cleanup-specialist
- **Model**: Claude Haiku 4 (fast, cheap)
- **Context**: 2k tokens (paths only)
- **Execution time**: 30-120 seconds
- **Cost**: ~$0.005 per run (Haiku pricing)

## Scheduled Cleanup

### Weekly Automation (Recommended)

```yaml
# .github/workflows/cleanup.yml
name: Weekly Cleanup
on:
  schedule:
    - cron: '0 2 * * 0' # Sunday 2 AM

jobs:
  cleanup:
    runs-on: windows-latest
    steps:
      - name: Run cleanup
        run: /desktop:cleanup --mode=execute --targets=all
```

### Local Task Scheduler (Windows)

```powershell
# Create Windows scheduled task
$action = New-ScheduledTaskAction -Execute "claude-code" -Argument "run /desktop:cleanup --mode=execute"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
Register-ScheduledTask -TaskName "Desktop Cleanup Weekly" -Action $action -Trigger $trigger
```

## Integration

This command triggers the desktop-cleanup-specialist sub-agent through desktop-expert. The sub-agent uses minimal context (only directory paths) for maximum speed.

## Related Commands

- `/desktop:quality-check` - Quality checks before cleanup
- `/desktop:test-smart` - Test before cleanup
- `/clean` - Basic clean (no intelligence)

## Troubleshooting

### Permission denied errors

```bash
# Files may be in use - close applications first
# Or run with elevated permissions (Admin)
```

### Unexpected file count

```bash
# Re-run dry-run to verify targets
/desktop:cleanup --mode=dry-run
```

### Deletion failed

```bash
# Check disk errors
chkdsk D: /f

# Check file locks
Get-Process | Where-Object {$_.Modules.FileName -like "*target*"}
```

### Archive directory full

```bash
# Clean old archives manually
Get-ChildItem D:\logs\archive\ -Filter "*.gz" | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-90)} | Remove-Item
```

## Recovery Metrics (Typical)

**Per Project:**

- Vibe-Code-Studio: 1.5-2 GB
- Nova-Agent: 500 MB - 1 GB
- Vibe-Justice: 300-500 MB

**Workspace-Wide (all 7 desktop apps):**

- Build artifacts: 3-5 GB
- Logs: 100-300 MB
- Cache: 500 MB - 1 GB
- **Total: 4-7 GB typical recovery**

---

**Created**: 2026-01-15
**Last Updated**: 2026-01-15
**Status**: Active (Phase 1)
