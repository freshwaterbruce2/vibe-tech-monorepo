# Requires -Version 7.0
# =============================================================================
# VibeTech Workspace - Register Scheduled Backup Task
# Registers the Daily Hot Backup script with Windows Task Scheduler.
# Run this script in an ELEVATED PowerShell window (Run as Administrator).
# =============================================================================

# Check for Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This script must be run from an elevated PowerShell window (Run as Administrator)."
    exit 1
}

$scriptPath = "V:\monorepo\scripts\backup-databases.ps1"
if (-not (Test-Path $scriptPath)) {
    Write-Error "Backup script not found at $scriptPath."
    exit 1
}

$taskName = "VibeTech Database Daily Backup"
$description = "Performs zero-downtime daily hot backups of all SQLite databases on the data drive."

Write-Host "Registering task: $taskName..." -ForegroundColor Cyan

# Create Scheduled Task Action
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

# Create Trigger (Daily at 2:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At "2:00 AM"

# Create Settings Set (allowing running on batteries, awake to run, etc.)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register Task under SYSTEM account (highest privileges)
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -Description $description -Force | Out-Null
    Write-Host "✅ Successfully registered scheduled task '$taskName' under the SYSTEM account!" -ForegroundColor Green
    Write-Host "Task is scheduled to run Daily at 2:00 AM." -ForegroundColor Gray
} catch {
    Write-Error "Failed to register scheduled task: $_"
}
