#!/usr/bin/env powershell
<#
.SYNOPSIS
    Register Windows Scheduled Task for automated MoltBot backups

.DESCRIPTION
    Creates a scheduled task to run Backup-MoltBotData.ps1 daily at 2:00 AM
    Task runs with highest privileges to access all necessary directories

.EXAMPLE
    .\Register-BackupTask.ps1
    Registers the daily backup task

.EXAMPLE
    .\Register-BackupTask.ps1 -Unregister
    Removes the backup task
#>

param(
    [switch]$Unregister = $false
)

$TaskName = "MoltBot-DailyBackup"
$TaskPath = "\MoltBot\"
$ScriptPath = "C:\dev\scripts\backup\Backup-MoltBotData.ps1"

if ($Unregister) {
    Write-Host "Unregistering scheduled task..." -ForegroundColor Yellow
    try {
        Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false -ErrorAction Stop
        Write-Host "[OK] Task unregistered successfully" -ForegroundColor Green
        exit 0
    } catch {
        Write-Host "[ERROR] Failed to unregister task: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

Write-Host "=== MoltBot Backup Task Registration ===" -ForegroundColor Cyan
Write-Host ""

# Check if script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "[ERROR] Backup script not found: $ScriptPath" -ForegroundColor Red
    exit 1
}

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "[WARN] Task already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath -Confirm:$false
}

# Create scheduled task action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$ScriptPath`" -Compress"

# Create scheduled task trigger (daily at 2:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

# Create scheduled task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Create scheduled task principal (run with current user privileges)
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

# Register scheduled task
try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -TaskPath $TaskPath `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Automated daily backup of MoltBot critical data (databases, configuration, hooks, docs, logs)" `
        -ErrorAction Stop | Out-Null

    Write-Host "[OK] Scheduled task registered successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $TaskName"
    Write-Host "  Path: $TaskPath"
    Write-Host "  Schedule: Daily at 2:00 AM"
    Write-Host "  Script: $ScriptPath"
    Write-Host "  Backup Location: D:\backups\moltbot\"
    Write-Host "  Retention: 30 days"
    Write-Host ""
    Write-Host "View task in Task Scheduler:"
    Write-Host "  taskschd.msc"
    Write-Host ""
    Write-Host "Test task immediately:"
    Write-Host "  Start-ScheduledTask -TaskName '$TaskName' -TaskPath '$TaskPath'"
    Write-Host ""

    exit 0

} catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to register task: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
