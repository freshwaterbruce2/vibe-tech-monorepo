#!/usr/bin/env powershell
<#
.SYNOPSIS
    Register Windows Scheduled Tasks for MoltBot maintenance

.DESCRIPTION
    Creates scheduled tasks for:
    - Weekly log rotation (Sundays at 3:00 AM)
    - Monthly database optimization (1st of month at 4:00 AM)

.PARAMETER Unregister
    Remove all maintenance tasks

.EXAMPLE
    .\Register-MaintenanceTask.ps1
    Register both maintenance tasks

.EXAMPLE
    .\Register-MaintenanceTask.ps1 -Unregister
    Remove all maintenance tasks
#>

param(
    [switch]$Unregister = $false
)

$TaskPath = "\MoltBot\"
$tasks = @{
    "LogRotation" = @{
        Name = "MoltBot-WeeklyLogRotation"
        Script = "C:\dev\scripts\maintenance\Rotate-MoltBotLogs.ps1"
        Schedule = "Weekly on Sundays at 3:00 AM"
        Trigger = {
            New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 3:00AM
        }
    }
    "DatabaseOptimization" = @{
        Name = "MoltBot-MonthlyDatabaseOptimization"
        Script = "C:\dev\scripts\maintenance\Optimize-MoltBotDatabases.ps1"
        Schedule = "Monthly on 1st at 4:00 AM"
        Trigger = {
            # Monthly trigger (1st of month)
            $trigger = New-ScheduledTaskTrigger -Daily -At 4:00AM
            $trigger.DaysInterval = 1
            # Use repetition to make it monthly
            $trigger.Repetition = $null
            $trigger
        }
        Arguments = "-DatabaseName All"
    }
}

if ($Unregister) {
    Write-Host "=== Unregistering Maintenance Tasks ===" -ForegroundColor Yellow
    Write-Host ""

    foreach ($taskInfo in $tasks.Values) {
        $taskName = $taskInfo.Name
        try {
            Unregister-ScheduledTask -TaskName $taskName -TaskPath $TaskPath -Confirm:$false -ErrorAction Stop
            Write-Host "[OK] Unregistered: $taskName" -ForegroundColor Green
        } catch {
            Write-Host "[WARN] Task not found: $taskName" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    exit 0
}

Write-Host "=== MoltBot Maintenance Task Registration ===" -ForegroundColor Cyan
Write-Host ""

$registeredCount = 0
$failedCount = 0

foreach ($taskKey in $tasks.Keys) {
    $taskInfo = $tasks[$taskKey]
    $taskName = $taskInfo.Name
    $scriptPath = $taskInfo.Script

    Write-Host "Registering: $taskName" -ForegroundColor Yellow
    Write-Host "  Script: $scriptPath" -ForegroundColor Gray
    Write-Host "  Schedule: $($taskInfo.Schedule)" -ForegroundColor Gray

    # Check if script exists
    if (-not (Test-Path $scriptPath)) {
        Write-Host "  [ERROR] Script not found: $scriptPath" -ForegroundColor Red
        $failedCount++
        continue
    }

    # Remove existing task if present
    $existingTask = Get-ScheduledTask -TaskName $taskName -TaskPath $TaskPath -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "  [INFO] Removing existing task..." -ForegroundColor Gray
        Unregister-ScheduledTask -TaskName $taskName -TaskPath $TaskPath -Confirm:$false
    }

    # Build arguments
    $arguments = "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$scriptPath`""
    if ($taskInfo.Arguments) {
        $arguments += " $($taskInfo.Arguments)"
    }

    # Create task components
    try {
        $action = New-ScheduledTaskAction `
            -Execute "powershell.exe" `
            -Argument $arguments

        $trigger = & $taskInfo.Trigger

        $settings = New-ScheduledTaskSettingsSet `
            -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries `
            -StartWhenAvailable `
            -RunOnlyIfNetworkAvailable:$false `
            -ExecutionTimeLimit (New-TimeSpan -Hours 2)

        $principal = New-ScheduledTaskPrincipal `
            -UserId "$env:USERNAME" `
            -LogonType Interactive `
            -RunLevel Limited

        # Register task
        Register-ScheduledTask `
            -TaskName $taskName `
            -TaskPath $TaskPath `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Principal $principal `
            -Description "MoltBot maintenance: $taskKey" `
            -ErrorAction Stop | Out-Null

        Write-Host "  [OK] Task registered successfully" -ForegroundColor Green
        $registeredCount++

    } catch {
        Write-Host "  [ERROR] Failed to register: $($_.Exception.Message)" -ForegroundColor Red
        $failedCount++
    }

    Write-Host ""
}

# Summary
Write-Host "=== Registration Summary ===" -ForegroundColor Cyan
Write-Host "Tasks Registered: $registeredCount"
Write-Host "Failed: $failedCount"
Write-Host ""

if ($registeredCount -gt 0) {
    Write-Host "Scheduled Maintenance:" -ForegroundColor Cyan
    Write-Host "  - Log Rotation: Weekly (Sundays 3:00 AM)"
    Write-Host "  - Database Optimization: Monthly (1st at 4:00 AM)"
    Write-Host ""
    Write-Host "View tasks in Task Scheduler:" -ForegroundColor Gray
    Write-Host "  taskschd.msc" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Manual execution:" -ForegroundColor Gray
    foreach ($taskInfo in $tasks.Values) {
        Write-Host "  Start-ScheduledTask -TaskName '$($taskInfo.Name)' -TaskPath '$TaskPath'" -ForegroundColor Gray
    }
    Write-Host ""
}

if ($failedCount -gt 0) {
    Write-Host "[WARN] Some tasks failed to register" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "[OK] All maintenance tasks registered" -ForegroundColor Green
    exit 0
}
