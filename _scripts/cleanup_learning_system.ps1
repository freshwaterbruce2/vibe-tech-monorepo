# Phase 1: Clean D:\learning-system
# - Delete empty DBs (events.db, logging_analytics.db, monitoring.db)
# - Delete learning.db (0 rows, orphan)
# - Delete empty directories
# - Archive api/ if exists
# - Remove stale .log.gz files older than 30 days

$ErrorActionPreference = "Stop"
$root = "D:\learning-system"
$deleted = @()

# Delete empty/dead databases
$deadDbs = @(
    "$root\events.db",
    "$root\logging_analytics.db",
    "$root\monitoring.db",
    "$root\learning.db",
    "$root\logs\logging_analytics.db"
)
foreach ($db in $deadDbs) {
    if (Test-Path $db) {
        Remove-Item $db -Force
        $deleted += "DB: $db"
    }
}

# Delete empty directories (recursive until none remain)
do {
    $empty = Get-ChildItem -Path $root -Directory -Recurse -Force |
        Where-Object { (Get-ChildItem $_.FullName -Force -ErrorAction SilentlyContinue).Count -eq 0 }
    foreach ($d in $empty) {
        Remove-Item $d.FullName -Force -Recurse
        $deleted += "DIR: $($d.FullName)"
    }
} while ($empty.Count -gt 0)

# Remove stale log.gz files (>60 days)
$cutoff = (Get-Date).AddDays(-60)
$oldLogs = Get-ChildItem -Path "$root\logs" -Filter "*.log.gz" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $cutoff }
foreach ($log in $oldLogs) {
    Remove-Item $log.FullName -Force
    $deleted += "LOG: $($log.FullName)"
}

Write-Output "Deleted $($deleted.Count) items:"
$deleted | ForEach-Object { Write-Output "  $_" }
