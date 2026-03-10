<#
.SYNOPSIS
    Visual wrapper for the robust database backup system.
    Targeted for High-Capacity D: Drive Storage (Retaining 1 Year of history).

.DESCRIPTION
    Replaces the legacy "Second Brain" desktop script.
    Invokes C:\dev\scripts\database-backup.ps1 with 365-day retention
    and user-friendly visual feedback.

.PARAMETER Interactive
    If set, pauses at the end for user review. Default is false for automation.
#>
[CmdletBinding()]
param(
  [switch]$Interactive = $false
)

$ErrorActionPreference = "Stop"

# Configuration matches original user script preferences
$BackupRoot = "D:\backups"
$RetentionDays = 365
$RobustScript = "C:\dev\scripts\database-backup.ps1"

# Visual Header
Write-Host "Starting Second Brain Preservation..." -ForegroundColor Cyan
Write-Host "-------------------------------------"

# 1. Health Check (Physical Drive)
Write-Host "Checking Storage Drive Health..."
$disk = Get-PhysicalDisk | Where-Object { $_.DeviceId -or $_.FriendlyName -match "D" } | Select-Object -First 1

if ($disk) {
  if ($disk.HealthStatus -eq "Healthy") {
    Write-Host "Drive D: Status: HEALTHY" -ForegroundColor Green
  }
  else {
    Write-Host "WARNING: Drive D: Status is $($disk.HealthStatus)" -ForegroundColor Red
    Write-Host "Please back up to an external drive immediately!" -ForegroundColor Yellow
  }
}
else {
  Write-Host "Drive D: Physical disk info not available (Virtual Drive?)" -ForegroundColor Gray
}

# 2. Perform Backup via Robust Script
if (Test-Path $RobustScript) {
  Write-Host "`nInvoking Neural Backup Engine..." -ForegroundColor Cyan
  try {
    & $RobustScript -BackupRoot $BackupRoot `
      -RetentionDays $RetentionDays `
      -BackupType Full

    Write-Host "`nSnapshot Secured: $BackupRoot" -ForegroundColor Green
  }
  catch {
    Write-Host "Backup FAILED: $_" -ForegroundColor Red
    if ($Interactive) { Read-Host "Press Enter to exit..." }
    exit 1
  }
}
else {
  Write-Host "CRITICAL: Robust backup script not found at $RobustScript" -ForegroundColor Red
  exit 1
}

# 3. Footer
Write-Host "`nMaintenance Complete." -ForegroundColor Cyan
Write-Host "Your Second Brain is secure (History: $RetentionDays days)." -ForegroundColor Green

if ($Interactive) {
  Read-Host "Press Enter to close..."
}
