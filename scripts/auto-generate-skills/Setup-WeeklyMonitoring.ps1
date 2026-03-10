# Setup-WeeklyMonitoring.ps1
# Sets up automated weekly skill performance monitoring

param(
    [Parameter(Mandatory=$false)]
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

$TaskName = "SkillMonitoring-Weekly"
$ScriptPath = "C:\dev\scripts\auto-generate-skills\Monitor-GeneratedSkills.ps1"
$LogPath = "D:\logs\skill-monitoring"

Write-Host "Skill Monitoring - Automated Weekly Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Gray
Write-Host ""

if ($Remove) {
    Write-Host "Removing scheduled task..." -ForegroundColor Yellow

    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Scheduled task removed successfully" -ForegroundColor Green
    } else {
        Write-Host "Task does not exist" -ForegroundColor Gray
    }

    exit 0
}

# Ensure log directory exists
if (-not (Test-Path $LogPath)) {
    New-Item -Path $LogPath -ItemType Directory -Force | Out-Null
    Write-Host "Created log directory: $LogPath" -ForegroundColor Green
}

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Scheduled task already exists" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $TaskName" -ForegroundColor White
    Write-Host "  State: $($existingTask.State)" -ForegroundColor White
    Write-Host "  Last Run: $($existingTask.LastRunTime)" -ForegroundColor White
    Write-Host "  Next Run: $($existingTask.NextRunTime)" -ForegroundColor White
    Write-Host ""

    $response = Read-Host "Replace existing task? (y/n)"
    if ($response -ne 'y') {
        Write-Host "Canceled" -ForegroundColor Gray
        exit 0
    }

    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Removed existing task" -ForegroundColor Yellow
}

# Create scheduled task
Write-Host "Creating scheduled task..." -ForegroundColor Cyan

$Action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-NoProfile -WindowStyle Hidden -File `"$ScriptPath`" -Report Weekly > `"$LogPath\weekly-$(Get-Date -Format 'yyyy-MM-dd').log`" 2>&1"

$Trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am

$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false `
    -DontStopOnIdleEnd

$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Weekly performance monitoring for auto-generated skills" | Out-Null

Write-Host "Scheduled task created successfully" -ForegroundColor Green
Write-Host ""

# Display task details
$task = Get-ScheduledTask -TaskName $TaskName

Write-Host "Task Configuration:" -ForegroundColor Cyan
Write-Host "  Name: $TaskName" -ForegroundColor White
Write-Host "  Schedule: Every Monday at 9:00 AM" -ForegroundColor White
Write-Host "  Script: $ScriptPath" -ForegroundColor White
Write-Host "  Logs: $LogPath" -ForegroundColor White
Write-Host "  State: $($task.State)" -ForegroundColor White
Write-Host "  Next Run: $($task.NextRunTime)" -ForegroundColor White
Write-Host ""

Write-Host "Management Commands:" -ForegroundColor Cyan
Write-Host "  Start manually: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  View logs: Get-Content '$LogPath\weekly-*.log' -Tail 50" -ForegroundColor White
Write-Host "  Disable: Disable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  Enable: Enable-ScheduledTask -TaskName '$TaskName'" -ForegroundColor White
Write-Host "  Remove: .\Setup-WeeklyMonitoring.ps1 -Remove" -ForegroundColor White
Write-Host ""

# Test run
Write-Host "Running test execution..." -ForegroundColor Cyan
$testLog = "$LogPath\test-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').log"
pwsh -File $ScriptPath -Report Weekly > $testLog 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Test execution successful" -ForegroundColor Green
    Write-Host "Log saved to: $testLog" -ForegroundColor Gray
} else {
    Write-Host "Test execution failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "Check log: $testLog" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Weekly monitoring will run every Monday at 9:00 AM" -ForegroundColor White
