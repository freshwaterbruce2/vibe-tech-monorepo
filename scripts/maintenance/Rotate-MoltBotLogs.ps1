#!/usr/bin/env powershell
<#
.SYNOPSIS
    Rotate and compress MoltBot log files

.DESCRIPTION
    Archives old log files, compresses them, and maintains retention policy
    Prevents log directory from growing too large

.PARAMETER RetentionDays
    Number of days to keep uncompressed logs (default: 7)

.PARAMETER CompressedRetentionDays
    Number of days to keep compressed archives (default: 90)

.PARAMETER DryRun
    Show what would be done without actually doing it

.EXAMPLE
    .\Rotate-MoltBotLogs.ps1
    Rotate logs with default retention (7 days raw, 90 days compressed)

.EXAMPLE
    .\Rotate-MoltBotLogs.ps1 -RetentionDays 14 -CompressedRetentionDays 180
    Keep 14 days of raw logs, 180 days of archives

.EXAMPLE
    .\Rotate-MoltBotLogs.ps1 -DryRun
    Show what would be done without making changes
#>

param(
    [int]$RetentionDays = 7,
    [int]$CompressedRetentionDays = 90,
    [switch]$DryRun = $false
)

Write-Host "=== MoltBot Log Rotation ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Raw Log Retention: $RetentionDays days"
Write-Host "Compressed Retention: $CompressedRetentionDays days"
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN (no changes)' } else { 'ACTIVE' })"
Write-Host ""

# Log directories
$logDirs = @(
    "D:\learning-system\logs",
    "D:\logs"
)

# Initialize counters
$compressedCount = 0
$deletedCount = 0
$totalSavedMB = 0

# Function to compress log file
function Compress-LogFile {
    param([string]$logPath)

    $archivePath = "$logPath.gz"

    if ($DryRun) {
        Write-Host "    [DRY RUN] Would compress: $logPath" -ForegroundColor Gray
        return $true
    }

    try {
        # Read file
        $content = [System.IO.File]::ReadAllBytes($logPath)

        # Compress
        $output = New-Object System.IO.FileStream($archivePath, [System.IO.FileMode]::Create)
        $gzipStream = New-Object System.IO.Compression.GZipStream($output, [System.IO.Compression.CompressionMode]::Compress)
        $gzipStream.Write($content, 0, $content.Length)
        $gzipStream.Close()
        $output.Close()

        # Calculate savings
        $originalSize = (Get-Item $logPath).Length
        $compressedSize = (Get-Item $archivePath).Length
        $savedMB = [math]::Round(($originalSize - $compressedSize) / 1MB, 2)

        # Delete original
        Remove-Item $logPath -Force

        Write-Host "    [OK] Compressed: $(Split-Path $logPath -Leaf) | Saved: $savedMB MB" -ForegroundColor Green
        return $savedMB

    } catch {
        Write-Host "    [ERROR] Failed to compress: $($_.Exception.Message)" -ForegroundColor Red
        return 0
    }
}

# Process each log directory
foreach ($logDir in $logDirs) {
    if (-not (Test-Path $logDir)) {
        Write-Host "[WARN] Log directory not found: $logDir" -ForegroundColor Yellow
        continue
    }

    Write-Host "Processing: $logDir" -ForegroundColor Yellow
    Write-Host ""

    # Step 1: Compress old uncompressed logs
    Write-Host "  [1/3] Compressing old logs (>$RetentionDays days)..." -ForegroundColor Gray

    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $oldLogs = Get-ChildItem $logDir -File -Filter "*.log" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoffDate }

    if ($oldLogs.Count -eq 0) {
        Write-Host "    No logs to compress" -ForegroundColor Gray
    } else {
        foreach ($log in $oldLogs) {
            $savedMB = Compress-LogFile -logPath $log.FullName
            if ($savedMB -gt 0) {
                $compressedCount++
                $totalSavedMB += $savedMB
            }
        }
    }

    # Step 2: Delete old compressed archives
    Write-Host "`n  [2/3] Deleting old archives (>$CompressedRetentionDays days)..." -ForegroundColor Gray

    $archiveCutoffDate = (Get-Date).AddDays(-$CompressedRetentionDays)
    $oldArchives = Get-ChildItem $logDir -File -Filter "*.log.gz" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $archiveCutoffDate }

    if ($oldArchives.Count -eq 0) {
        Write-Host "    No archives to delete" -ForegroundColor Gray
    } else {
        foreach ($archive in $oldArchives) {
            if ($DryRun) {
                Write-Host "    [DRY RUN] Would delete: $($archive.Name)" -ForegroundColor Gray
            } else {
                try {
                    Remove-Item $archive.FullName -Force
                    Write-Host "    [OK] Deleted: $($archive.Name)" -ForegroundColor Green
                    $deletedCount++
                } catch {
                    Write-Host "    [ERROR] Failed to delete: $($archive.Name)" -ForegroundColor Red
                }
            }
        }
    }

    # Step 3: Summary for this directory
    Write-Host "`n  [3/3] Directory summary..." -ForegroundColor Gray

    $currentLogs = Get-ChildItem $logDir -File -Filter "*.log" -ErrorAction SilentlyContinue
    $currentArchives = Get-ChildItem $logDir -File -Filter "*.log.gz" -ErrorAction SilentlyContinue
    $totalSizeMB = [math]::Round(
        (($currentLogs | Measure-Object -Property Length -Sum).Sum +
         ($currentArchives | Measure-Object -Property Length -Sum).Sum) / 1MB, 2)

    Write-Host "    Current logs: $($currentLogs.Count)"
    Write-Host "    Compressed archives: $($currentArchives.Count)"
    Write-Host "    Total size: $totalSizeMB MB"
    Write-Host ""
}

# Overall summary
Write-Host "=== Rotation Summary ===" -ForegroundColor Cyan
Write-Host "Logs Compressed: $compressedCount"
Write-Host "Archives Deleted: $deletedCount"
Write-Host "Space Saved: $totalSavedMB MB"
Write-Host ""

# Recommendations
if ($compressedCount -gt 0 -or $deletedCount -gt 0) {
    Write-Host "Recommendations:" -ForegroundColor Cyan
    Write-Host "  - Schedule weekly rotation: Register-MaintenanceTask.ps1"
    Write-Host "  - Monitor log directory sizes regularly"
    Write-Host "  - Adjust retention based on disk space"
    Write-Host "  - Consider log level adjustments if logs grow too fast"
    Write-Host ""
}

# Warnings
if ($compressedCount -eq 0 -and $deletedCount -eq 0) {
    Write-Host "[INFO] No logs needed rotation" -ForegroundColor Gray
} elseif ($DryRun) {
    Write-Host "[INFO] This was a dry run. Run without -DryRun to apply changes" -ForegroundColor Cyan
} else {
    Write-Host "[OK] Log rotation complete" -ForegroundColor Green
}

exit 0
