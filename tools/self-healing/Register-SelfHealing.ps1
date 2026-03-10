<#
.SYNOPSIS
    Register (or update) a Windows Scheduled Task for the Self-Healing Orchestrator.

.DESCRIPTION
    Creates a daily scheduled task that runs the self-healing dry-run report.
    Default: 06:00 AM daily, dry-run mode, all loops.

.EXAMPLE
    # Register with defaults
    .\Register-SelfHealing.ps1

    # Custom time
    .\Register-SelfHealing.ps1 -TriggerTime "08:00"

    # Remove the task
    .\Register-SelfHealing.ps1 -Unregister
#>

[CmdletBinding()]
param(
    [string]$TaskName = "Vibe-SelfHealing-DryRun",
    [string]$TriggerTime = "06:00",
    [switch]$Unregister
)

$ErrorActionPreference = "Stop"
$RepoRoot = "C:\dev"
$PythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source

if (-not $PythonExe) {
    Write-Error "Python not found in PATH. Install Python 3.11+ first."
    return
}

if ($Unregister) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "✅ Removed scheduled task: $TaskName"
    } else {
        Write-Host "⏭️  Task '$TaskName' not found, nothing to remove."
    }
    return
}

# Build the action
$Action = New-ScheduledTaskAction `
    -Execute $PythonExe `
    -Argument "tools/self-healing/run.py" `
    -WorkingDirectory $RepoRoot

# Trigger: daily at specified time
$Trigger = New-ScheduledTaskTrigger -Daily -At $TriggerTime

# Settings: allow running on battery, don't stop on battery
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# Register or update
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Set-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings | Out-Null
    Write-Host "🔄 Updated scheduled task: $TaskName (daily at $TriggerTime)"
} else {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Daily self-healing dry-run report for Vibe monorepo" | Out-Null
    Write-Host "✅ Registered scheduled task: $TaskName (daily at $TriggerTime)"
}

Write-Host ""
Write-Host "To run manually:"
Write-Host "  cd $RepoRoot; python -m tools.self_healing"
Write-Host ""
Write-Host "To auto-apply fixes (use with caution):"
Write-Host "  cd $RepoRoot; python -m tools.self_healing --auto-apply"
