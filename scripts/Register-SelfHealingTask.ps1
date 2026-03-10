# Register-SelfHealingTask.ps1
# Registers the 4 AM self-healing cron as a Windows Scheduled Task.
# Run as Administrator.

$taskName = "VibeOps-SelfHealing-4AM"
$scriptPath = "C:\dev\scripts\self-healing-cron.ps1"
$workingDir = "C:\dev"

# Remove existing task if present
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removing existing task: $taskName"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create trigger: daily at 4:00 AM
$trigger = New-ScheduledTaskTrigger -Daily -At "4:00AM"

# Create action: run PowerShell script
$action = New-ScheduledTaskAction `
    -Execute "pwsh.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory $workingDir

# Settings: run whether logged in or not, don't stop on idle
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

# Register the task
Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -Description "Vibe Ops: 4 AM self-healing maintenance (lint + typecheck auto-fix)" `
    -RunLevel Highest

Write-Host ""
Write-Host "Scheduled Task '$taskName' registered."
Write-Host "  Trigger: Daily at 4:00 AM"
Write-Host "  Script:  $scriptPath"
Write-Host "  WorkDir: $workingDir"
Write-Host ""
Write-Host "To test manually: pwsh -File '$scriptPath'"
Write-Host "To disable:       Disable-ScheduledTask -TaskName '$taskName'"
Write-Host "To remove:        Unregister-ScheduledTask -TaskName '$taskName'"
