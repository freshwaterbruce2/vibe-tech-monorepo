#!/usr/bin/env powershell
<#
.SYNOPSIS
    Restore MoltBot data from backup

.DESCRIPTION
    Restores databases, configuration, hooks, and documentation from a backup archive
    Supports full restore or selective restoration of specific components

.PARAMETER BackupFile
    Path to backup zip file (e.g., D:\backups\moltbot\20260202-020421.zip)

.PARAMETER RestoreMode
    What to restore: All, Databases, Configuration, Hooks, Documentation

.PARAMETER SkipBackup
    Skip creating safety backup before restoration

.EXAMPLE
    .\Restore-MoltBotBackup.ps1 -BackupFile "D:\backups\moltbot\20260202-020421.zip"
    Full restoration from specified backup

.EXAMPLE
    .\Restore-MoltBotBackup.ps1 -BackupFile "D:\backups\moltbot\20260202-020421.zip" -RestoreMode Databases
    Restore only databases

.EXAMPLE
    .\Restore-MoltBotBackup.ps1 -BackupFile "D:\backups\moltbot\20260202-020421.zip" -SkipBackup
    Restore without creating safety backup first
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,

    [ValidateSet("All", "Databases", "Configuration", "Hooks", "Documentation")]
    [string]$RestoreMode = "All",

    [switch]$SkipBackup = $false
)

# Validate backup file exists
if (-not (Test-Path $BackupFile)) {
    Write-Host "[ERROR] Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "=== MoltBot Backup Restoration ===" -ForegroundColor Cyan
Write-Host "Backup File: $BackupFile"
Write-Host "Restore Mode: $RestoreMode"
Write-Host ""

# Create safety backup unless skipped
if (-not $SkipBackup) {
    Write-Host "[SAFETY] Creating pre-restore backup..." -ForegroundColor Yellow
    $safetyBackupScript = Join-Path $PSScriptRoot "Backup-MoltBotData.ps1"

    if (Test-Path $safetyBackupScript) {
        try {
            & $safetyBackupScript -Compress -Description "Pre-restore safety backup" | Out-Null
            Write-Host "  [OK] Safety backup created" -ForegroundColor Green
        } catch {
            Write-Host "  [WARN] Safety backup failed: $($_.Exception.Message)" -ForegroundColor Yellow
            $continue = Read-Host "Continue without safety backup? (y/n)"
            if ($continue -ne "y") {
                Write-Host "[ABORT] Restoration cancelled by user" -ForegroundColor Yellow
                exit 0
            }
        }
    }
}

# Extract backup to temporary location
$tempExtractPath = Join-Path $env:TEMP "moltbot-restore-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "`nExtracting backup..." -ForegroundColor Yellow

try {
    New-Item -ItemType Directory -Path $tempExtractPath -Force | Out-Null
    Expand-Archive -Path $BackupFile -DestinationPath $tempExtractPath -Force -ErrorAction Stop
    Write-Host "  [OK] Backup extracted to temporary location" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Failed to extract backup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Find the actual backup directory (it's nested inside the zip)
$backupDirs = Get-ChildItem $tempExtractPath -Directory
if ($backupDirs.Count -eq 0) {
    Write-Host "[ERROR] Invalid backup structure - no directories found" -ForegroundColor Red
    Remove-Item $tempExtractPath -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

$extractedBackup = $backupDirs[0].FullName

# Read metadata
$metadataPath = Join-Path $extractedBackup "backup-metadata.json"
if (Test-Path $metadataPath) {
    $metadata = Get-Content $metadataPath | ConvertFrom-Json
    Write-Host "`nBackup Information:" -ForegroundColor Cyan
    Write-Host "  Timestamp: $($metadata.Timestamp)"
    Write-Host "  Date: $($metadata.BackupDate)"
    Write-Host "  Databases: $($metadata.Databases)"
    Write-Host "  Configs: $($metadata.Configs)"
    Write-Host "  Hooks: $($metadata.Hooks)"
    Write-Host "  Docs: $($metadata.Docs)"
    Write-Host "  Logs: $($metadata.Logs)"
    Write-Host ""
}

# Confirmation prompt
$confirmation = Read-Host "Proceed with restoration? This will OVERWRITE existing files (y/n)"
if ($confirmation -ne "y") {
    Write-Host "[ABORT] Restoration cancelled by user" -ForegroundColor Yellow
    Remove-Item $tempExtractPath -Recurse -Force -ErrorAction SilentlyContinue
    exit 0
}

Write-Host "`nRestoring data..." -ForegroundColor Yellow
$restoredCount = 0
$failedCount = 0

# Restore Databases
if ($RestoreMode -eq "All" -or $RestoreMode -eq "Databases") {
    Write-Host "`nRestoring databases..." -ForegroundColor Yellow
    $dbBackupDir = Join-Path $extractedBackup "databases"

    if (Test-Path $dbBackupDir) {
        $databases = Get-ChildItem $dbBackupDir -File
        foreach ($db in $databases) {
            $targetPath = "D:\learning-system\$($db.Name)"

            # Special case: trading.db goes to D:\databases\
            if ($db.Name -eq "trading.db") {
                $targetPath = "D:\databases\$($db.Name)"
            }

            try {
                # Ensure target directory exists
                $targetDir = Split-Path $targetPath -Parent
                if (-not (Test-Path $targetDir)) {
                    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                }

                Copy-Item $db.FullName $targetPath -Force -ErrorAction Stop
                Write-Host "  [OK] $($db.Name)" -ForegroundColor Green
                $restoredCount++
            } catch {
                Write-Host "  [FAIL] $($db.Name): $($_.Exception.Message)" -ForegroundColor Red
                $failedCount++
            }
        }
    } else {
        Write-Host "  [WARN] No databases found in backup" -ForegroundColor Yellow
    }
}

# Restore Configuration
if ($RestoreMode -eq "All" -or $RestoreMode -eq "Configuration") {
    Write-Host "`nRestoring configuration..." -ForegroundColor Yellow
    $configBackupDir = Join-Path $extractedBackup "config"

    if (Test-Path $configBackupDir) {
        $configs = Get-ChildItem $configBackupDir -File
        foreach ($cfg in $configs) {
            if ($cfg.Name -eq "clawdbot.json") {
                $targetPath = "C:\Users\fresh_zxae3v6\.clawdbot\clawdbot.json"
            } elseif ($cfg.Name -eq "jobs.json") {
                $targetPath = "C:\Users\fresh_zxae3v6\.openclaw\cron\jobs.json"
            } else {
                continue
            }

            try {
                # Ensure target directory exists
                $targetDir = Split-Path $targetPath -Parent
                if (-not (Test-Path $targetDir)) {
                    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                }

                Copy-Item $cfg.FullName $targetPath -Force -ErrorAction Stop
                Write-Host "  [OK] $($cfg.Name)" -ForegroundColor Green
                $restoredCount++
            } catch {
                Write-Host "  [FAIL] $($cfg.Name): $($_.Exception.Message)" -ForegroundColor Red
                $failedCount++
            }
        }
    } else {
        Write-Host "  [WARN] No configuration found in backup" -ForegroundColor Yellow
    }
}

# Restore Hook Scripts
if ($RestoreMode -eq "All" -or $RestoreMode -eq "Hooks") {
    Write-Host "`nRestoring hook scripts..." -ForegroundColor Yellow
    $hooksBackupDir = Join-Path $extractedBackup "hooks"

    if (Test-Path $hooksBackupDir) {
        $hooks = Get-ChildItem $hooksBackupDir -File
        $targetHooksDir = "C:\dev\.claude\hooks"

        if (-not (Test-Path $targetHooksDir)) {
            New-Item -ItemType Directory -Path $targetHooksDir -Force | Out-Null
        }

        foreach ($hook in $hooks) {
            $targetPath = Join-Path $targetHooksDir $hook.Name

            try {
                Copy-Item $hook.FullName $targetPath -Force -ErrorAction Stop
                Write-Host "  [OK] $($hook.Name)" -ForegroundColor Green
                $restoredCount++
            } catch {
                Write-Host "  [FAIL] $($hook.Name): $($_.Exception.Message)" -ForegroundColor Red
                $failedCount++
            }
        }
    } else {
        Write-Host "  [WARN] No hooks found in backup" -ForegroundColor Yellow
    }
}

# Restore Documentation
if ($RestoreMode -eq "All" -or $RestoreMode -eq "Documentation") {
    Write-Host "`nRestoring documentation..." -ForegroundColor Yellow
    $docsBackupDir = Join-Path $extractedBackup "docs"

    if (Test-Path $docsBackupDir) {
        $docs = Get-ChildItem $docsBackupDir -File
        $targetDocsDir = "C:\Users\fresh_zxae3v6\clawd"

        if (-not (Test-Path $targetDocsDir)) {
            New-Item -ItemType Directory -Path $targetDocsDir -Force | Out-Null
        }

        foreach ($doc in $docs) {
            $targetPath = Join-Path $targetDocsDir $doc.Name

            try {
                Copy-Item $doc.FullName $targetPath -Force -ErrorAction Stop
                Write-Host "  [OK] $($doc.Name)" -ForegroundColor Green
                $restoredCount++
            } catch {
                Write-Host "  [FAIL] $($doc.Name): $($_.Exception.Message)" -ForegroundColor Red
                $failedCount++
            }
        }
    } else {
        Write-Host "  [WARN] No documentation found in backup" -ForegroundColor Yellow
    }
}

# Cleanup temporary extraction
Write-Host "`nCleaning up..." -ForegroundColor Yellow
Remove-Item $tempExtractPath -Recurse -Force -ErrorAction SilentlyContinue

# Summary
Write-Host "`n=== Restoration Complete ===" -ForegroundColor Green
Write-Host "Restored: $restoredCount files"
Write-Host "Failed: $failedCount files"
Write-Host ""

if ($failedCount -gt 0) {
    Write-Host "[WARN] Some files failed to restore. Check logs above." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "[OK] All files restored successfully" -ForegroundColor Green
    exit 0
}
