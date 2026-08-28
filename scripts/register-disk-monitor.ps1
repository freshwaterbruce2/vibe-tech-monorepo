# Requires -Version 7.0
# =============================================================================
# VibeTech Workspace - Register Scheduled Disk Space Monitor
# Registers the D:\ Drive Disk Space Monitor script with Windows Task Scheduler.
# Run this script in an ELEVATED PowerShell window (Run as Administrator).
# =============================================================================

# Check for Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This script must be run from an elevated PowerShell window (Run as Administrator)."
    exit 1
}

$scriptPath = "V:\monorepo\scripts\monitor-disk-space.ps1"
if (-not (Test-Path $scriptPath)) {
    Write-Error "Monitor script not found at $scriptPath."
    exit 1
}

$taskName = "VibeTech Drive Space Monitor"
$description = "Performs real-time capacity audits of the D:\ drive every hour to prevent transaction write failures."

Write-Host "Registering task: $taskName..." -ForegroundColor Cyan

# Create Scheduled Task Action
$action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

# Create Trigger (Hourly repeat indefinitely)
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration ([TimeSpan]::MaxValue)

# Create Settings Set
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register Task under SYSTEM account (highest privileges)
try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User "SYSTEM" -Description $description -Force | Out-Null
    Write-Host "✅ Successfully registered scheduled task '$taskName' under the SYSTEM account!" -ForegroundColor Green
    Write-Host "Task is scheduled to run every hour indefinitely." -ForegroundColor Gray
} catch {
    Write-Error "Failed to register scheduled task: $_"
}
