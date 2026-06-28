<#
.SYNOPSIS
  Register or remove the Phase 3 process-cleanup watchdog in Task Scheduler.

.PARAMETER Action
  Register (default) or Unregister the scheduled task.

.EXAMPLE
  .\watchdog-scheduled-task.ps1 -Action Register
  .\watchdog-scheduled-task.ps1 -Action Unregister
#>
param(
    [ValidateSet('Register', 'Unregister')]
    [string]$Action = 'Register',

    [string]$TaskName = 'VibeMonorepo-ProcessCleanup-Watchdog',
    [string]$MonorepoRoot = 'V:\monorepo'
)

$ErrorActionPreference = 'Stop'

if ($Action -eq 'Unregister') {
    foreach ($name in @($TaskName, 'MonorepoProcessWatchdog')) {
        $existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
        if ($existing) {
            Unregister-ScheduledTask -TaskName $name -Confirm:$false
            Write-Host "Removed scheduled task: $name"
        }
    }
    exit 0
}

$pwsh = (Get-Command pwsh).Source
$scriptPath = Join-Path $MonorepoRoot 'scripts\watchdog-process-cleanup.ps1'
if (-not (Test-Path -LiteralPath $scriptPath)) {
    Write-Error "Missing watchdog script: $scriptPath"
    exit 1
}

foreach ($name in @($TaskName, 'MonorepoProcessWatchdog')) {
    if ($name -eq $TaskName) { continue }
    $legacy = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if ($legacy) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
        Write-Host "Removed legacy task: $name"
    }
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Replacing existing task: $TaskName"
}

$actionTask = New-ScheduledTaskAction -Execute $pwsh `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" `
    -WorkingDirectory $MonorepoRoot

$logonTrigger = New-ScheduledTaskTrigger -AtLogon -User $env:USERNAME
$repeatTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
    -RepetitionInterval (New-TimeSpan -Hours 2) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName `
    -Action $actionTask `
    -Trigger @($logonTrigger, $repeatTrigger) `
    -Settings $settings `
    -Principal $principal `
    -Description 'Dry-run orphan process watchdog for V:\monorepo (set User env PROCESS_CLEANUP_AUTO_FORCE=1 to enable kills)' `
    | Out-Null

Write-Host "Registered scheduled task: $TaskName"
Write-Host 'Triggers: at logon + every 2 hours (interactive / logged-on only)'
Write-Host 'Dry-run by default; set User env PROCESS_CLEANUP_AUTO_FORCE=1 to enable kills.'
