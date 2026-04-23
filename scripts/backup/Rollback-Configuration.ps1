#!/usr/bin/env powershell
<#
.SYNOPSIS
    Rollback MoltBot configuration to previous version

.DESCRIPTION
    Restores config.json and jobs.json from the most recent backup
    Creates a backup of current configuration before rollback

.PARAMETER BackupFile
    Specific backup to restore from (optional, uses latest if not specified)

.PARAMETER ConfigType
    Which configuration to rollback: All, ClawdBot, CronJobs

.EXAMPLE
    .\Rollback-Configuration.ps1
    Rollback both configurations from latest backup

.EXAMPLE
    .\Rollback-Configuration.ps1 -ConfigType ClawdBot
    Rollback only config.json

.EXAMPLE
    .\Rollback-Configuration.ps1 -BackupFile "D:\backups\moltbot\20260202-020421.zip"
    Rollback from specific backup
#>

param(
    [string]$BackupFile,

    [ValidateSet("All", "ClawdBot", "CronJobs")]
    [string]$ConfigType = "All"
)

Write-Host "=== MoltBot Configuration Rollback ===" -ForegroundColor Cyan
Write-Host ""

# Find backup file if not specified
if (-not $BackupFile) {
    Write-Host "Finding latest backup..." -ForegroundColor Yellow

    $backupDir = "D:\backups\moltbot"
    if (-not (Test-Path $backupDir)) {
        Write-Host "[ERROR] Backup directory not found: $backupDir" -ForegroundColor Red
        exit 1
    }

    $latestBackup = Get-ChildItem $backupDir -Filter "*.zip" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestBackup) {
        Write-Host "[ERROR] No backups found in $backupDir" -ForegroundColor Red
        exit 1
    }

    $BackupFile = $latestBackup.FullName
    Write-Host "  [OK] Using latest backup: $($latestBackup.Name)" -ForegroundColor Green
}

# Validate backup file
if (-not (Test-Path $BackupFile)) {
    Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "Backup: $BackupFile" -ForegroundColor Cyan
Write-Host "Rollback: $ConfigType" -ForegroundColor Cyan
Write-Host ""

# Configuration paths
$configs = @{
    "ClawdBot" = "C:\Users\fresh_zxae3v6\.clawdbot\config.json"
    "CronJobs" = "C:\Users\fresh_zxae3v6\.openclaw\cron\jobs.json"
}

# Create current state backup
Write-Host "[SAFETY] Backing up current configuration..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

foreach ($configName in $configs.Keys) {
    if ($ConfigType -eq "All" -or $ConfigType -eq $configName) {
        $configPath = $configs[$configName]

        if (Test-Path $configPath) {
            $backupPath = "$configPath.rollback.$timestamp"
            try {
                Copy-Item $configPath $backupPath -Force
                Write-Host "  [OK] $configName backed up to: $backupPath" -ForegroundColor Green
            } catch {
                Write-Host "  [WARN] Failed to backup $configName: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [WARN] $configName not found: $configPath" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# Confirmation
$confirmation = Read-Host "Proceed with rollback? Current config will be replaced (y/n)"
if ($confirmation -ne "y") {
    Write-Host "[ABORT] Rollback cancelled by user" -ForegroundColor Yellow
    exit 0
}

# Use restore script
$restoreScript = Join-Path $PSScriptRoot "Restore-MoltBotBackup.ps1"
if (-not (Test-Path $restoreScript)) {
    Write-Host "[ERROR] Restore script not found: $restoreScript" -ForegroundColor Red
    exit 1
}

Write-Host "`nRestoring configuration from backup..." -ForegroundColor Yellow

try {
    & $restoreScript -BackupFile $BackupFile -RestoreMode Configuration -SkipBackup
    Write-Host ""
    Write-Host "[OK] Configuration rollback complete" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Restart MoltBot gateway: clawdbot restart"
    Write-Host "  2. Verify configuration: clawdbot doctor"
    Write-Host "  3. Check heartbeat: clawdbot heartbeat"
    Write-Host ""
    Write-Host "Rollback backups saved with .rollback.$timestamp extension" -ForegroundColor Gray
    exit 0
} catch {
    Write-Host ""
    Write-Host "[ERROR] Rollback failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Your current configuration backups are safe:" -ForegroundColor Yellow
    foreach ($configName in $configs.Keys) {
        if ($ConfigType -eq "All" -or $ConfigType -eq $configName) {
            $configPath = $configs[$configName]
            $backupPath = "$configPath.rollback.$timestamp"
            if (Test-Path $backupPath) {
                Write-Host "  $backupPath" -ForegroundColor Gray
            }
        }
    }
    exit 1
}
