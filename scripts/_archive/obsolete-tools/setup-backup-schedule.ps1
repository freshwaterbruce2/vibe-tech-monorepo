#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Setup Windows Task Scheduler for automated database backups
.DESCRIPTION
    Creates scheduled tasks for daily, weekly, and monthly backups
.EXAMPLE
    .\setup-backup-schedule.ps1
#>

$ErrorActionPreference = 'Stop'

# Backup script location
$BackupScript = "C:\dev\scripts\database-backup.ps1"
$MonitorScript = "C:\dev\scripts\monitor-backups.ps1"

Write-Host "=== Setting up Database Backup Schedule ===" -ForegroundColor Cyan

# Verify PowerShell 7+ is installed
$pwshPath = (Get-Command pwsh -ErrorAction SilentlyContinue).Source
if (-not $pwshPath) {
    Write-Host "ERROR: PowerShell 7+ is required" -ForegroundColor Red
    Write-Host "Install from: https://github.com/PowerShell/PowerShell/releases"
    exit 1
}

Write-Host "Using: $pwshPath"

# Task 1: Daily Full Backup (2 AM)
Write-Host "`nCreating daily backup task..."
$dailyAction = New-ScheduledTaskAction `
    -Execute $pwshPath `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`" -BackupType Full -RetentionDays 30"

$dailyTrigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

$dailySettings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false

Register-ScheduledTask `
    -TaskName "Database-Backup-Daily" `
    -Description "Daily full backup of all critical SQLite databases" `
    -Action $dailyAction `
    -Trigger $dailyTrigger `
    -Settings $dailySettings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Force

Write-Host "  ✓ Daily backup scheduled for 2:00 AM" -ForegroundColor Green

# Task 2: Weekly Verification (Sunday 3 AM)
Write-Host "`nCreating weekly verification task..."
$weeklyAction = New-ScheduledTaskAction `
    -Execute $pwshPath `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`" -BackupType Test"

$weeklyTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3:00AM

Register-ScheduledTask `
    -TaskName "Database-Backup-WeeklyTest" `
    -Description "Weekly backup verification and integrity check" `
    -Action $weeklyAction `
    -Trigger $weeklyTrigger `
    -Settings $dailySettings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Force

Write-Host "  ✓ Weekly verification scheduled for Sunday 3:00 AM" -ForegroundColor Green

# Task 3: Backup Health Monitor (Every 6 hours)
Write-Host "`nCreating backup health monitor..."
$monitorAction = New-ScheduledTaskAction `
    -Execute $pwshPath `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$MonitorScript`""

$monitorTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 6)

Register-ScheduledTask `
    -TaskName "Database-Backup-Monitor" `
    -Description "Monitor backup health and alert on issues" `
    -Action $monitorAction `
    -Trigger $monitorTrigger `
    -Settings $dailySettings `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Force

Write-Host "  ✓ Health monitor scheduled every 6 hours" -ForegroundColor Green

# Task 4: Pre-Shutdown Backup (runs before system shutdown/restart)
Write-Host "`nCreating pre-shutdown backup..."
$shutdownAction = New-ScheduledTaskAction `
    -Execute $pwshPath `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`" -BackupType Full -RetentionDays 30"

$shutdownTrigger = New-ScheduledTaskTrigger -AtStartup

Register-ScheduledTask `
    -TaskName "Database-Backup-PreShutdown" `
    -Description "Emergency backup before system shutdown" `
    -Action $shutdownAction `
    -Settings (New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries) `
    -User "SYSTEM" `
    -RunLevel Highest `
    -Force

Write-Host "  ✓ Pre-shutdown backup configured" -ForegroundColor Green

# Create initial backup now
Write-Host "`nRunning initial backup..."
& $pwshPath -NoProfile -ExecutionPolicy Bypass -File $BackupScript -BackupType Full

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "`nScheduled Tasks:"
Write-Host "  • Daily Full Backup: 2:00 AM"
Write-Host "  • Weekly Verification: Sunday 3:00 AM"
Write-Host "  • Health Monitor: Every 6 hours"
Write-Host "  • Pre-Shutdown: On system restart/shutdown"
Write-Host "`nManage tasks:"
Write-Host "  • Task Scheduler: taskschd.msc"
Write-Host "  • View logs: D:\backups\database-backups\backup_log_*.txt"
Write-Host "  • Monitor: C:\dev\scripts\monitor-backups.ps1"
