#!/usr/bin/env powershell
<#
.SYNOPSIS
    MoltBot system health check dashboard

.DESCRIPTION
    Checks health of all MoltBot components and reports status
    Can send alerts via Telegram if issues detected

.PARAMETER SendAlert
    Send Telegram alert if issues detected

.PARAMETER Detailed
    Show detailed information for each component

.EXAMPLE
    .\Get-MoltBotHealth.ps1
    Quick health check with summary

.EXAMPLE
    .\Get-MoltBotHealth.ps1 -Detailed
    Detailed health report

.EXAMPLE
    .\Get-MoltBotHealth.ps1 -SendAlert
    Check health and alert if issues found
#>

param(
    [switch]$SendAlert = $false,
    [switch]$Detailed = $false
)

# Health check functions
function Test-DatabaseHealth {
    param([string]$dbPath, [string]$dbName)

    $health = @{
        Name = $dbName
        Status = "Unknown"
        Issues = @()
        Size = 0
        LastModified = $null
    }

    if (-not (Test-Path $dbPath)) {
        $health.Status = "Missing"
        $health.Issues += "Database file not found"
        return $health
    }

    $health.Size = (Get-Item $dbPath).Length
    $health.LastModified = (Get-Item $dbPath).LastWriteTime

    # Check if sqlite3 is available
    $sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
    if ($sqlite3) {
        try {
            $integrityResult = & sqlite3 $dbPath "PRAGMA integrity_check;" 2>&1
            if ($integrityResult -eq "ok") {
                $health.Status = "Healthy"
            } else {
                $health.Status = "Corrupt"
                $health.Issues += "Integrity check failed: $integrityResult"
            }
        } catch {
            $health.Status = "Error"
            $health.Issues += "Failed to check: $($_.Exception.Message)"
        }
    } else {
        $health.Status = "Unknown"
        $health.Issues += "sqlite3 not available for integrity check"
    }

    return $health
}

function Test-ConfigurationHealth {
    param([string]$configPath, [string]$configName)

    $health = @{
        Name = $configName
        Status = "Unknown"
        Issues = @()
        Size = 0
        LastModified = $null
    }

    if (-not (Test-Path $configPath)) {
        $health.Status = "Missing"
        $health.Issues += "Configuration file not found"
        return $health
    }

    $health.Size = (Get-Item $configPath).Length
    $health.LastModified = (Get-Item $configPath).LastWriteTime

    try {
        $content = Get-Content $configPath -Raw
        $json = $content | ConvertFrom-Json -ErrorAction Stop
        $health.Status = "Healthy"
    } catch {
        $health.Status = "Invalid"
        $health.Issues += "JSON parse error: $($_.Exception.Message)"
    }

    return $health
}

function Test-BackupHealth {
    $health = @{
        Name = "Backup System"
        Status = "Unknown"
        Issues = @()
        LastBackup = $null
        BackupCount = 0
        TotalSize = 0
    }

    $backupDir = "D:\backups\moltbot"
    if (-not (Test-Path $backupDir)) {
        $health.Status = "Missing"
        $health.Issues += "Backup directory not found"
        return $health
    }

    $backups = Get-ChildItem $backupDir -Filter "*.zip" -ErrorAction SilentlyContinue
    $health.BackupCount = $backups.Count

    if ($backups.Count -eq 0) {
        $health.Status = "Warning"
        $health.Issues += "No backups found"
        return $health
    }

    $latestBackup = $backups | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $health.LastBackup = $latestBackup.LastWriteTime
    $health.TotalSize = ($backups | Measure-Object -Property Length -Sum).Sum

    $hoursSinceBackup = ((Get-Date) - $health.LastBackup).TotalHours

    if ($hoursSinceBackup -lt 30) {
        $health.Status = "Healthy"
    } elseif ($hoursSinceBackup -lt 48) {
        $health.Status = "Warning"
        $health.Issues += "Last backup is $([math]::Round($hoursSinceBackup, 1)) hours old"
    } else {
        $health.Status = "Critical"
        $health.Issues += "Last backup is $([math]::Round($hoursSinceBackup / 24, 1)) days old"
    }

    return $health
}

function Test-HookHealth {
    $health = @{
        Name = "Hook Scripts"
        Status = "Unknown"
        Issues = @()
        HookCount = 0
    }

    $hooksDir = "C:\dev\.claude\hooks"
    if (-not (Test-Path $hooksDir)) {
        $health.Status = "Missing"
        $health.Issues += "Hooks directory not found"
        return $health
    }

    $hooks = Get-ChildItem $hooksDir -Filter "*.ps1" -ErrorAction SilentlyContinue
    $health.HookCount = $hooks.Count

    if ($hooks.Count -eq 0) {
        $health.Status = "Warning"
        $health.Issues += "No hook scripts found"
        return $health
    }

    # Check critical hooks
    $criticalHooks = @(
        "pre-tool-use-stdin.ps1",
        "post-tool-use-stdin.ps1"
    )

    $missingHooks = @()
    foreach ($hookName in $criticalHooks) {
        if (-not (Test-Path (Join-Path $hooksDir $hookName))) {
            $missingHooks += $hookName
        }
    }

    if ($missingHooks.Count -gt 0) {
        $health.Status = "Critical"
        $health.Issues += "Missing critical hooks: $($missingHooks -join ', ')"
    } else {
        $health.Status = "Healthy"
    }

    return $health
}

function Test-LearningSystemHealth {
    $health = @{
        Name = "Learning System"
        Status = "Unknown"
        Issues = @()
        ExecutionCount = 0
        LastExecution = $null
    }

    $dbPath = "D:\databases\agent_learning.db"
    if (-not (Test-Path $dbPath)) {
        $health.Status = "Missing"
        $health.Issues += "Learning database not found"
        return $health
    }

    $sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue
    if ($sqlite3) {
        try {
            # Check execution count
            $count = @(& sqlite3 $dbPath "SELECT COUNT(*) FROM agent_executions;" 2>$null) |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
                Select-Object -First 1
            $health.ExecutionCount = [int]$count

            # Check last execution
            $lastExec = @(& sqlite3 $dbPath "SELECT MAX(started_at) FROM agent_executions;" 2>$null) |
                Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
                Select-Object -First 1
            if ($lastExec) {
                $health.LastExecution = [datetime]$lastExec
            }

            if ($health.ExecutionCount -eq 0) {
                $health.Status = "Warning"
                $health.Issues += "No executions recorded (Phase 5 may be inactive)"
            } elseif ($health.LastExecution) {
                $hoursSinceExec = ((Get-Date) - $health.LastExecution).TotalHours
                if ($hoursSinceExec -lt 24) {
                    $health.Status = "Healthy"
                } else {
                    $health.Status = "Warning"
                    $health.Issues += "No executions in last 24 hours"
                }
            } else {
                $health.Status = "Healthy"
            }
        } catch {
            $health.Status = "Error"
            $health.Issues += "Failed to query database: $($_.Exception.Message)"
        }
    } else {
        $health.Status = "Unknown"
        $health.Issues += "Cannot verify (sqlite3 not available)"
    }

    return $health
}

function Test-ScheduledTaskHealth {
    $health = @{
        Name = "Scheduled Tasks"
        Status = "Unknown"
        Issues = @()
        Tasks = @()
    }

    $scheduledTaskCommand = Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue
    if (-not $scheduledTaskCommand) {
        Import-Module ScheduledTasks -ErrorAction SilentlyContinue
        $scheduledTaskCommand = Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue
    }

    if (-not $scheduledTaskCommand) {
        $health.Issues += "ScheduledTasks cmdlets unavailable in the current PowerShell session"
        return $health
    }

    $taskNames = @(
        "MoltBot-DailyBackup",
        "MoltBot-WeeklyLogRotation",
        "MoltBot-MonthlyDatabaseOptimization"
    )

    $missingTasks = @()
    $disabledTasks = @()

    foreach ($taskName in $taskNames) {
        $task = & $scheduledTaskCommand.Source -TaskName $taskName -TaskPath "\MoltBot\" -ErrorAction SilentlyContinue

        if (-not $task) {
            $missingTasks += $taskName
        } elseif ($task.State -ne "Ready") {
            $disabledTasks += "$taskName ($($task.State))"
        } else {
            $health.Tasks += @{
                Name = $taskName
                State = $task.State
                NextRun = $task.Triggers[0].StartBoundary
            }
        }
    }

    if ($missingTasks.Count -gt 0) {
        $health.Status = "Critical"
        $health.Issues += "Missing tasks: $($missingTasks -join ', ')"
    } elseif ($disabledTasks.Count -gt 0) {
        $health.Status = "Warning"
        $health.Issues += "Disabled tasks: $($disabledTasks -join ', ')"
    } else {
        $health.Status = "Healthy"
    }

    return $health
}

# Main health check
Write-Host "=== MoltBot System Health Check ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

$healthResults = @{
    Timestamp = Get-Date
    OverallStatus = "Healthy"
    Components = @{}
    IssueCount = 0
}

# Check databases
Write-Host "Databases:" -ForegroundColor Yellow
$databases = @{
    "trading" = "D:\databases\trading.db"
    "agent_learning" = "D:\databases\agent_learning.db"
    "memory" = "D:\databases\memory.db"
    "nova_activity" = "D:\databases\nova_activity.db"
    "agent_tasks" = "D:\databases\agent_tasks.db"
    "feature_flags" = "D:\databases\feature_flags.db"
    "database" = "D:\databases\database.db"
}

foreach ($dbName in $databases.Keys) {
    $dbHealth = Test-DatabaseHealth -dbPath $databases[$dbName] -dbName $dbName
    $healthResults.Components[$dbName] = $dbHealth

    $statusColor = switch ($dbHealth.Status) {
        "Healthy" { "Green" }
        "Warning" { "Yellow" }
        "Missing" { "Red" }
        "Corrupt" { "Red" }
        "Error" { "Red" }
        default { "Gray" }
    }

    Write-Host "  [$($dbHealth.Status)] $dbName" -ForegroundColor $statusColor

    if ($Detailed -and $dbHealth.Issues.Count -gt 0) {
        foreach ($issue in $dbHealth.Issues) {
            Write-Host "      Issue: $issue" -ForegroundColor Red
        }
    }

    if ($dbHealth.Status -notin @("Healthy", "Unknown")) {
        $healthResults.IssueCount++
        if ($dbHealth.Status -in @("Missing", "Corrupt", "Error")) {
            $healthResults.OverallStatus = "Critical"
        } elseif ($healthResults.OverallStatus -eq "Healthy") {
            $healthResults.OverallStatus = "Warning"
        }
    }
}

Write-Host ""

# Check configuration
Write-Host "Configuration:" -ForegroundColor Yellow
$configs = @{
    "config.json" = "C:\Users\fresh_zxae3v6\.clawdbot\config.json"
    "jobs.json" = "C:\Users\fresh_zxae3v6\.openclaw\cron\jobs.json"
}

foreach ($configName in $configs.Keys) {
    $configHealth = Test-ConfigurationHealth -configPath $configs[$configName] -configName $configName
    $healthResults.Components[$configName] = $configHealth

    $statusColor = switch ($configHealth.Status) {
        "Healthy" { "Green" }
        "Warning" { "Yellow" }
        "Missing" { "Red" }
        "Invalid" { "Red" }
        default { "Gray" }
    }

    Write-Host "  [$($configHealth.Status)] $configName" -ForegroundColor $statusColor

    if ($Detailed -and $configHealth.Issues.Count -gt 0) {
        foreach ($issue in $configHealth.Issues) {
            Write-Host "      Issue: $issue" -ForegroundColor Red
        }
    }

    if ($configHealth.Status -notin @("Healthy", "Unknown")) {
        $healthResults.IssueCount++
        if ($configHealth.Status -in @("Missing", "Invalid")) {
            $healthResults.OverallStatus = "Critical"
        } elseif ($healthResults.OverallStatus -eq "Healthy") {
            $healthResults.OverallStatus = "Warning"
        }
    }
}

Write-Host ""

# Check other components
$otherChecks = @(
    { Test-BackupHealth },
    { Test-HookHealth },
    { Test-LearningSystemHealth },
    { Test-ScheduledTaskHealth }
)

foreach ($check in $otherChecks) {
    $result = & $check
    $healthResults.Components[$result.Name] = $result

    $statusColor = switch ($result.Status) {
        "Healthy" { "Green" }
        "Warning" { "Yellow" }
        "Missing" { "Red" }
        "Critical" { "Red" }
        default { "Gray" }
    }

    Write-Host "$($result.Name): [$($result.Status)]" -ForegroundColor $statusColor

    if ($Detailed -and $result.Issues.Count -gt 0) {
        foreach ($issue in $result.Issues) {
            Write-Host "    Issue: $issue" -ForegroundColor Red
        }
    }

    if ($result.Status -notin @("Healthy", "Unknown")) {
        $healthResults.IssueCount++
        if ($result.Status -in @("Missing", "Critical")) {
            $healthResults.OverallStatus = "Critical"
        } elseif ($healthResults.OverallStatus -eq "Healthy") {
            $healthResults.OverallStatus = "Warning"
        }
    }
}

Write-Host ""
Write-Host "=== Overall Status ===" -ForegroundColor Cyan

$overallColor = switch ($healthResults.OverallStatus) {
    "Healthy" { "Green" }
    "Warning" { "Yellow" }
    "Critical" { "Red" }
    default { "Gray" }
}

Write-Host "Status: $($healthResults.OverallStatus)" -ForegroundColor $overallColor
Write-Host "Issues Found: $($healthResults.IssueCount)"
Write-Host ""

# Send alert if requested and issues found
if ($SendAlert -and $healthResults.IssueCount -gt 0) {
    Write-Host "[ALERT] Sending Telegram notification..." -ForegroundColor Yellow
    # TODO: Implement Telegram alert
    # This requires TELEGRAM_BOT_TOKEN from environment or config
    Write-Host "[INFO] Telegram alerts not yet implemented" -ForegroundColor Gray
}

# Exit with appropriate code
if ($healthResults.OverallStatus -eq "Critical") {
    exit 2
} elseif ($healthResults.OverallStatus -eq "Warning") {
    exit 1
} else {
    exit 0
}
