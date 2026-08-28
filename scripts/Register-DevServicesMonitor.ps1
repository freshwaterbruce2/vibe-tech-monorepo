#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Register or unregister development sidecar watchdogs as Windows Scheduled Tasks.
.DESCRIPTION
    Registers:
      1. VibeOps-Watch-PortsAndLogs (Real-time port conflict self-healer)
      2. VibeOps-Monitor-DevServices (Dev process memory leak monitor/recycler)
      3. VibeOps-Watch-PackageExports (Package export watcher and memory synchronizer)
    Must be run as Administrator.
.PARAMETER Action
    Select action to perform: "register" or "unregister" (default: "register").
.PARAMETER WorkingDirectory
    Working directory for task executions (default: V:\monorepo).
.PARAMETER RunAsUser
    User account to run the tasks under (default: SYSTEM).
.EXAMPLE
    pwsh -File scripts/Register-DevServicesMonitor.ps1 -Action register
    pwsh -File scripts/Register-DevServicesMonitor.ps1 -Action unregister
#>

[CmdletBinding()]
param(
    [ValidateSet("register", "unregister")]
    [string]$Action = "register",

    [string]$WorkingDirectory = "V:\monorepo",
    [string]$RunAsUser = "SYSTEM"
)

$ErrorActionPreference = "Stop"

# Verify Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Administrator privileges required. Please run this script from an elevated PowerShell console."
}

# Task Definitions List
$Tasks = @(
    [pscustomobject]@{
        Name = "VibeOps-Watch-PortsAndLogs"
        Script = "V:\monorepo\scripts\Watch-PortsAndLogs.ps1"
        Description = "Vibe Ops: Real-time port conflict resolver and service restarter log-watcher sidecar"
    },
    [pscustomobject]@{
        Name = "VibeOps-Monitor-DevServices"
        Script = "V:\monorepo\scripts\Monitor-DevServices.ps1"
        Description = "Vibe Ops: Dev process memory leak monitor and recycler"
    },
    [pscustomobject]@{
        Name = "VibeOps-Watch-PackageExports"
        Script = "V:\monorepo\scripts\Watch-PackageExports.ps1"
        Description = "Vibe Ops: Watch packages directory and sync exports changes to memory.db"
    }
)

if ($Action -eq "unregister") {
    Write-Host "[START] Unregistering Vibe Ops sidecar tasks..." -ForegroundColor Yellow
    foreach ($task in $Tasks) {
        $existing = Get-ScheduledTask -TaskName $task.Name -ErrorAction SilentlyContinue
        if ($existing) {
            Write-Host "  Removing task: $($task.Name)" -ForegroundColor Yellow
            Unregister-ScheduledTask -TaskName $task.Name -Confirm:$false
        } else {
            Write-Host "  Task $($task.Name) not found, skipping." -ForegroundColor Gray
        }
    }
    Write-Host "[OK] Sidecar tasks unregistration complete." -ForegroundColor Green
    exit 0
}

# Register Action
Write-Host "[START] Registering Vibe Ops sidecar tasks..." -ForegroundColor Cyan
Write-Host "  WorkDir: $WorkingDirectory" -ForegroundColor Gray
Write-Host "  Run User: $RunAsUser" -ForegroundColor Gray

foreach ($task in $Tasks) {
    Write-Host "`nProcessing: $($task.Name)" -ForegroundColor Yellow
    
    if (-not (Test-Path $task.Script)) {
        Write-Warning "  Script file not found: $($task.Script). Skipping registration."
        continue
    }

    # Clean existing task
    $existing = Get-ScheduledTask -TaskName $task.Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  Removing existing task configuration..." -ForegroundColor Gray
        Unregister-ScheduledTask -TaskName $task.Name -Confirm:$false
    }

    # Trigger: At Startup
    $trigger = New-ScheduledTaskTrigger -AtStartup

    # Action: Run Script
    $actionObject = New-ScheduledTaskAction `
        -Execute "pwsh.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$($task.Script)`"" `
        -WorkingDirectory $WorkingDirectory

    # Settings: Unlimited execution window, run on battery, auto-start when available
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit ([TimeSpan]::Zero)

    try {
        # Register task configuration
        Register-ScheduledTask `
            -TaskName $task.Name `
            -Trigger $trigger `
            -Action $actionObject `
            -Settings $settings `
            -Description $task.Description `
            -RunLevel Highest `
            -User $RunAsUser `
            -Force | Out-Null
            
        Write-Host "  [OK] Successfully registered $($task.Name)" -ForegroundColor Green
        Write-Host "       Trigger: On System Startup" -ForegroundColor Gray
        Write-Host "       RunLevel: Highest Privileges" -ForegroundColor Gray
    } catch {
        Write-Host "  [ERROR] Failed to register task $($task.Name): $_" -ForegroundColor Red
    }
}

Write-Host "`n[OK] Sidecar tasks registration complete." -ForegroundColor Green
Write-Host "To inspect tasks: Get-ScheduledTask -TaskName 'VibeOps-*'" -ForegroundColor Gray
Write-Host "To start manually: Start-ScheduledTask -TaskName 'VibeOps-Watch-PortsAndLogs'" -ForegroundColor Gray
