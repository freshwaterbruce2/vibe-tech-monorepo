# VibeTech Google Drive Backup
# Usage: .\backup-to-gdrive.ps1 [-Remote gdrive] [-DryRun]
# Requires: D:\tools\rclone.exe configured with a Google Drive remote

param(
    [string]$Remote = "gdrive",
    [switch]$DryRun
)

$RCLONE = "D:\tools\rclone.exe"
$DEST = "${Remote}:vibetech-backup"
$FLAGS = @("--progress", "--stats-one-line", "--transfers", "4")
if ($DryRun) { $FLAGS += "--dry-run" }

function Sync-Dir {
    param([string]$Src, [string]$Dst, [string[]]$Exclude = @())
    if (-not (Test-Path $Src)) { Write-Host "SKIP (not found): $Src"; return }
    Write-Host "`n--- $Src ---"
    $args = @("sync", $Src, $Dst) + $FLAGS
    foreach ($ex in $Exclude) { $args += "--exclude"; $args += $ex }
    & $RCLONE @args
}

Write-Host "=== VibeTech Backup to $DEST ==="
if ($DryRun) { Write-Host "(DRY RUN - no files will be transferred)" }

# --- Critical data ---
Sync-Dir "D:\databases"      "$DEST/databases"
Sync-Dir "D:\learning-system" "$DEST/learning-system"
Sync-Dir "D:\memory_bank"    "$DEST/memory_bank"
Sync-Dir "D:\data"           "$DEST/data"

# --- App data ---
Sync-Dir "D:\vibe-tech-data"   "$DEST/vibe-tech-data"
Sync-Dir "D:\nova-agent-data"  "$DEST/nova-agent-data"
Sync-Dir "D:\secondbrain"      "$DEST/secondbrain"
Sync-Dir "D:\planning-files"   "$DEST/planning-files"
Sync-Dir "D:\trading_data"     "$DEST/trading_data"
Sync-Dir "D:\self-healing"     "$DEST/self-healing"
Sync-Dir "D:\recordings"       "$DEST/recordings"

# --- Out-of-place project files ---
Sync-Dir "D:\dev"           "$DEST/dev-legacy"
Sync-Dir "D:\repos"         "$DEST/repos"
Sync-Dir "D:\repositories"  "$DEST/repositories"

# --- Logs (last 7 days only via size filter) ---
Write-Host "`n--- D:\logs (recent) ---"
if (Test-Path "D:\logs") {
    & $RCLONE sync "D:\logs" "$DEST/logs" @FLAGS --max-age 7d
}

# --- V:\monorepo source (exclude build artifacts) ---
Sync-Dir "V:\monorepo" "$DEST/monorepo" @(
    "node_modules/**",
    ".nx/**",
    "dist/**",
    "build/**",
    "target/**",
    ".pnpm-store/**",
    "*.log",
    ".cache/**",
    "coverage/**"
)

Write-Host "`n=== Backup complete ==="
