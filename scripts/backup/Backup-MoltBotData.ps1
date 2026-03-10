#!/usr/bin/env powershell
<#
.SYNOPSIS
    Automated backup for MoltBot critical data

.DESCRIPTION
    Backs up databases, configuration, and logs to D:\backups\moltbot\
    Includes compression and automatic retention management

.PARAMETER BackupRoot
    Root directory for backups (default: D:\backups\moltbot)

.PARAMETER Compress
    Compress backup to .zip (default: true)

.PARAMETER RetentionDays
    Number of days to keep backups (default: 30)

.EXAMPLE
    .\Backup-MoltBotData.ps1
    Creates compressed backup with 30-day retention

.EXAMPLE
    .\Backup-MoltBotData.ps1 -RetentionDays 90 -Compress:$false
    Creates uncompressed backup with 90-day retention
#>

param(
    [string]$BackupRoot = "D:\backups\moltbot",
    [switch]$Compress = $true,
    [int]$RetentionDays = 30
)

# Ensure backup root exists
if (-not (Test-Path $BackupRoot)) {
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $BackupRoot $timestamp

Write-Host "=== MoltBot Backup ===" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp" -ForegroundColor Gray
Write-Host ""

try {
    # Create backup directory
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    # Tier 1: Databases (CRITICAL)
    Write-Host "Backing up databases..." -ForegroundColor Yellow
    $dbBackupDir = Join-Path $backupDir "databases"
    New-Item -ItemType Directory -Path $dbBackupDir -Force | Out-Null

    $databases = @(
        @{Source = "D:\databases\trading.db"; Name = "trading.db"},
        @{Source = "D:\learning-system\agent_learning.db"; Name = "agent_learning.db"},
        @{Source = "D:\learning-system\learning.db"; Name = "learning.db"},
        @{Source = "D:\learning-system\logging_analytics.db"; Name = "logging_analytics.db"},
        @{Source = "D:\learning-system\monitoring.db"; Name = "monitoring.db"},
        @{Source = "D:\learning-system\events.db"; Name = "events.db"}
    )

    foreach ($db in $databases) {
        if (Test-Path $db.Source) {
            Copy-Item $db.Source (Join-Path $dbBackupDir $db.Name) -ErrorAction Stop
            Write-Host "  [OK] $($db.Name)" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] $($db.Name) not found" -ForegroundColor Yellow
        }
    }

    # Tier 1: Configuration (CRITICAL)
    Write-Host "`nBacking up configuration..." -ForegroundColor Yellow
    $configBackupDir = Join-Path $backupDir "config"
    New-Item -ItemType Directory -Path $configBackupDir -Force | Out-Null

    $configs = @(
        @{Source = "C:\Users\fresh_zxae3v6\.clawdbot\clawdbot.json"; Name = "clawdbot.json"},
        @{Source = "C:\Users\fresh_zxae3v6\.openclaw\cron\jobs.json"; Name = "jobs.json"}
    )

    foreach ($cfg in $configs) {
        if (Test-Path $cfg.Source) {
            Copy-Item $cfg.Source (Join-Path $configBackupDir $cfg.Name) -ErrorAction Stop
            Write-Host "  [OK] $($cfg.Name)" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] $($cfg.Name) not found" -ForegroundColor Yellow
        }
    }

    # Tier 2: Hook Scripts
    Write-Host "`nBacking up hook scripts..." -ForegroundColor Yellow
    $hooksBackupDir = Join-Path $backupDir "hooks"
    New-Item -ItemType Directory -Path $hooksBackupDir -Force | Out-Null

    if (Test-Path "C:\dev\.claude\hooks") {
        Copy-Item "C:\dev\.claude\hooks\*.ps1" $hooksBackupDir -ErrorAction SilentlyContinue
        $hookCount = (Get-ChildItem $hooksBackupDir -File).Count
        Write-Host "  [OK] $hookCount hook scripts" -ForegroundColor Green
    }

    # Tier 2: Documentation
    Write-Host "`nBacking up documentation..." -ForegroundColor Yellow
    $docsBackupDir = Join-Path $backupDir "docs"
    New-Item -ItemType Directory -Path $docsBackupDir -Force | Out-Null

    $docs = @(
        "VIBE_ECOSYSTEM.md",
        "AGENT_ROUTING.md",
        "CRYPTO_MONITORING.md",
        "HEARTBEAT.md",
        "INTELLIGENCE_LAYER.md",
        "PHASE_*_*.md"
    )

    foreach ($docPattern in $docs) {
        Get-ChildItem "C:\Users\fresh_zxae3v6\clawd" -Filter $docPattern -ErrorAction SilentlyContinue |
            Copy-Item -Destination $docsBackupDir -ErrorAction SilentlyContinue
    }

    $docCount = (Get-ChildItem $docsBackupDir -File).Count
    Write-Host "  [OK] $docCount documentation files" -ForegroundColor Green

    # Tier 2: Recent Logs (last 7 days only)
    Write-Host "`nBacking up recent logs..." -ForegroundColor Yellow
    $logsBackupDir = Join-Path $backupDir "logs"
    New-Item -ItemType Directory -Path $logsBackupDir -Force | Out-Null

    $cutoffDate = (Get-Date).AddDays(-7)
    Get-ChildItem "D:\learning-system\logs" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt $cutoffDate } |
        Copy-Item -Destination $logsBackupDir -ErrorAction SilentlyContinue

    $logCount = (Get-ChildItem $logsBackupDir -File).Count
    Write-Host "  [OK] $logCount log files (last 7 days)" -ForegroundColor Green

    # Metadata
    Write-Host "`nCreating backup metadata..." -ForegroundColor Yellow
    $metadata = @{
        Timestamp = $timestamp
        BackupDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Databases = $databases.Count
        Configs = $configs.Count
        Hooks = $hookCount
        Docs = $docCount
        Logs = $logCount
        Compressed = $Compress.IsPresent
        RetentionDays = $RetentionDays
        ComputerName = $env:COMPUTERNAME
        UserName = $env:USERNAME
    } | ConvertTo-Json

    $metadata | Out-File (Join-Path $backupDir "backup-metadata.json") -Encoding UTF8

    # Calculate size before compression
    $sizeBeforeBytes = (Get-ChildItem $backupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $sizeMB = [math]::Round($sizeBeforeBytes / 1MB, 2)
    Write-Host "  [OK] Backup size: $sizeMB MB" -ForegroundColor Green

    # Compress if requested
    if ($Compress) {
        Write-Host "`nCompressing backup..." -ForegroundColor Yellow
        $zipPath = "$backupDir.zip"
        Compress-Archive -Path $backupDir -DestinationPath $zipPath -Force -ErrorAction Stop
        Remove-Item -Path $backupDir -Recurse -Force

        $zipSizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
        $compressionRatio = [math]::Round((1 - ($zipSizeMB / $sizeMB)) * 100, 1)

        Write-Host "  [OK] Compressed: $zipSizeMB MB (saved $compressionRatio%)" -ForegroundColor Green
        Write-Host "  [ZIP] Location: $zipPath" -ForegroundColor Cyan
    } else {
        Write-Host "`n[DIR] Location: $backupDir" -ForegroundColor Cyan
    }

    # Cleanup old backups
    Write-Host "`nCleaning up old backups..." -ForegroundColor Yellow
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)

    # Remove old directories
    $deletedDirs = Get-ChildItem $BackupRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoffDate } |
        ForEach-Object {
            Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            $_.Name
        }

    # Remove old zip files
    $deletedZips = Get-ChildItem $BackupRoot -Filter "*.zip" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoffDate } |
        ForEach-Object {
            Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
            $_.Name
        }

    $deletedCount = $deletedDirs.Count + $deletedZips.Count
    if ($deletedCount -gt 0) {
        Write-Host "  [OK] Removed $deletedCount old backups (>$RetentionDays days)" -ForegroundColor Green
    } else {
        Write-Host "  [INFO] No old backups to remove" -ForegroundColor Gray
    }

    # Summary
    Write-Host "`n=== Backup Complete ===" -ForegroundColor Green
    Write-Host "Timestamp: $timestamp"
    Write-Host "Retention: $RetentionDays days"
    Write-Host ""

    exit 0

} catch {
    $errorMsg = $_.Exception.Message
    Write-Host ""
    Write-Host "[ERROR] Backup failed: $errorMsg" -ForegroundColor Red
    exit 1
}
