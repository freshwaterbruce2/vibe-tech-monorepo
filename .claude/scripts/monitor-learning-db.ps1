<#
.SYNOPSIS
    Monitor learning database health and growth

.DESCRIPTION
    Daily health check script for D:\databases\agent_learning.db:
    - Database size and growth rate
    - Table row counts (agent_executions, success_patterns, etc.)
    - Recent activity (last 24 hours)
    - Pattern confidence scores
    - Error rates and failure patterns
    - Generates daily health report

.PARAMETER Alert
    Send email/notification if issues detected

.PARAMETER Detailed
    Include detailed pattern analysis

.PARAMETER Days
    Number of days to analyze (default: 7)

.EXAMPLE
    .\monitor-learning-db.ps1
    Run daily health check

.EXAMPLE
    .\monitor-learning-db.ps1 -Detailed
    Include pattern analysis

.EXAMPLE
    .\monitor-learning-db.ps1 -Days 30
    Analyze last 30 days

.NOTES
    Author: VibeTech Development Team
    Created: 2026-01-15
    Schedule: Run daily via Windows Task Scheduler (6:00 AM)
#>

param(
    [switch]$Alert,
    [switch]$Detailed,
    [int]$Days = 7
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Paths
$DatabasePath = "D:\databases\agent_learning.db"
$LogsPath = "D:\learning-system\logs"
$ReportsPath = "D:\learning-system\reports"

# Ensure reports directory exists
if (-not (Test-Path $ReportsPath)) {
    New-Item -ItemType Directory -Path $ReportsPath -Force | Out-Null
}

# Colors
function Write-Success { param($Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "→ $Message" -ForegroundColor Cyan }
function Write-Metric { param($Label, $Value, $Color = "White") Write-Host "  $Label`: " -NoNewline; Write-Host $Value -ForegroundColor $Color }

# Banner
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Learning Database Health Monitor v1.0.0              ║" -ForegroundColor Cyan
Write-Host "║     Daily Health Check for agent_learning.db             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if database exists
if (-not (Test-Path $DatabasePath)) {
    Write-Error "Database not found: $DatabasePath"
    exit 1
}

# Check if sqlite3 is available
$sqlite3Path = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqlite3Path) {
    Write-Error "sqlite3 not found in PATH. Please install SQLite."
    exit 1
}

# Helper function to query database
function Invoke-SqliteQuery {
    param([string]$Query)
    $result = sqlite3 $DatabasePath "$Query" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Query failed: $Query"
        return $null
    }
    return $result
}

# Step 1: Database size and growth
Write-Info "Step 1: Database size and growth..."
$dbStats = Get-Item $DatabasePath
$dbSizeMB = [math]::Round($dbStats.Length / 1MB, 2)
Write-Metric "Database Size" "$dbSizeMB MB" "Cyan"
Write-Metric "Last Modified" $dbStats.LastWriteTime "Gray"

# Check growth rate (compare to previous day if report exists)
$previousReportPath = Get-ChildItem -Path $ReportsPath -Filter "health-report-*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($previousReportPath) {
    $previousReport = Get-Content $previousReportPath.FullName -Raw | ConvertFrom-Json
    $growthMB = [math]::Round($dbSizeMB - $previousReport.DatabaseSizeMB, 2)
    $growthPercent = if ($previousReport.DatabaseSizeMB -gt 0) { [math]::Round(($growthMB / $previousReport.DatabaseSizeMB) * 100, 2) } else { 0 }
    Write-Metric "Growth" "+$growthMB MB ($growthPercent%)" $(if ($growthPercent -gt 10) { "Yellow" } else { "Green" })
}

# Step 2: Table row counts
Write-Info "`nStep 2: Table row counts..."
$tables = @("agent_executions", "success_patterns", "agent_mistakes", "code_patterns", "task_patterns")
$tableCounts = @{}

foreach ($table in $tables) {
    $count = Invoke-SqliteQuery "SELECT COUNT(*) FROM $table;"
    $tableCounts[$table] = [int]$count
    Write-Metric $table ([int]$count).ToString("N0") "White"
}

# Step 3: Recent activity (last 24 hours)
Write-Info "`nStep 3: Recent activity (last 24 hours)..."
$recentExecutions = Invoke-SqliteQuery "SELECT COUNT(*) FROM agent_executions WHERE started_at > datetime('now', '-1 day');"
$recentSuccess = Invoke-SqliteQuery "SELECT COUNT(*) FROM agent_executions WHERE started_at > datetime('now', '-1 day') AND success = 1;"
$recentFailures = Invoke-SqliteQuery "SELECT COUNT(*) FROM agent_executions WHERE started_at > datetime('now', '-1 day') AND success = 0;"

Write-Metric "Total Executions" ([int]$recentExecutions).ToString("N0") "Cyan"
Write-Metric "Successful" ([int]$recentSuccess).ToString("N0") "Green"
Write-Metric "Failed" ([int]$recentFailures).ToString("N0") $(if ([int]$recentFailures -gt 10) { "Red" } else { "Yellow" })

$successRate = if ([int]$recentExecutions -gt 0) { [math]::Round(([int]$recentSuccess / [int]$recentExecutions) * 100, 2) } else { 0 }
Write-Metric "Success Rate" "$successRate%" $(if ($successRate -lt 90) { "Yellow" } else { "Green" })

# Step 4: Pattern confidence analysis
Write-Info "`nStep 4: Pattern confidence analysis..."
$highConfidencePatterns = Invoke-SqliteQuery "SELECT COUNT(*) FROM success_patterns WHERE confidence_score >= 0.8;"
$mediumConfidencePatterns = Invoke-SqliteQuery "SELECT COUNT(*) FROM success_patterns WHERE confidence_score >= 0.5 AND confidence_score < 0.8;"
$lowConfidencePatterns = Invoke-SqliteQuery "SELECT COUNT(*) FROM success_patterns WHERE confidence_score < 0.5;"

Write-Metric "High Confidence (≥0.8)" ([int]$highConfidencePatterns).ToString("N0") "Green"
Write-Metric "Medium Confidence (0.5-0.8)" ([int]$mediumConfidencePatterns).ToString("N0") "Yellow"
Write-Metric "Low Confidence (<0.5)" ([int]$lowConfidencePatterns).ToString("N0") "Gray"

# Step 5: Top agents by execution count
Write-Info "`nStep 5: Top agents by execution count (last $Days days)..."
$topAgents = Invoke-SqliteQuery "SELECT task_type, COUNT(*) as count FROM agent_executions WHERE started_at > datetime('now', '-$Days days') GROUP BY task_type ORDER BY count DESC LIMIT 5;"
if ($topAgents) {
    $topAgents -split "`n" | ForEach-Object {
        if ($_ -match "(.+)\|(\d+)") {
            $taskType = $matches[1]
            $count = [int]$matches[2]
            Write-Metric $taskType $count.ToString("N0") "White"
        }
    }
}

# Step 6: Failure pattern analysis
Write-Info "`nStep 6: Failure pattern analysis..."
$totalFailures = [int]$tableCounts["agent_mistakes"]
if ($totalFailures -gt 0) {
    $topFailures = Invoke-SqliteQuery "SELECT mistake_type, COUNT(*) as occurrence_count FROM agent_mistakes GROUP BY mistake_type ORDER BY occurrence_count DESC LIMIT 3;"
    if ($topFailures) {
        $topFailures -split "`n" | ForEach-Object {
            if ($_ -match "(.+)\|(\d+)") {
                $mistakeType = $matches[1]
                $occurrences = [int]$matches[2]
                Write-Metric $mistakeType $occurrences.ToString("N0") "Red"
            }
        }
    }
} else {
    Write-Success "No failure patterns recorded"
}

# Step 7: Detailed pattern analysis (if requested)
if ($Detailed) {
    Write-Info "`nStep 7: Detailed pattern analysis..."

    # Most used code patterns
    Write-Host "`n  Top Code Patterns:" -ForegroundColor Cyan
    $topCodePatterns = Invoke-SqliteQuery "SELECT name, usage_count FROM code_patterns ORDER BY usage_count DESC LIMIT 5;"
    if ($topCodePatterns) {
        $topCodePatterns -split "`n" | ForEach-Object {
            if ($_ -match "(.+)\|(\d+)") {
                Write-Host "    - $($matches[1]): $($matches[2]) uses" -ForegroundColor White
            }
        }
    }

    # Language distribution
    Write-Host "`n  Code Patterns by Language:" -ForegroundColor Cyan
    $languageDistribution = Invoke-SqliteQuery "SELECT language, COUNT(*) as count FROM code_patterns GROUP BY language ORDER BY count DESC;"
    if ($languageDistribution) {
        $languageDistribution -split "`n" | ForEach-Object {
            if ($_ -match "(.+)\|(\d+)") {
                Write-Host "    - $($matches[1]): $($matches[2]) patterns" -ForegroundColor White
            }
        }
    }
}

# Step 8: Health status determination
Write-Info "`nStep 8: Health status determination..."
$healthStatus = "Healthy"
$issues = @()

if ($successRate -lt 90) {
    $healthStatus = "Warning"
    $issues += "Success rate below 90% ($successRate%)"
}

if ([int]$recentFailures -gt 10) {
    $healthStatus = "Critical"
    $issues += "High failure count in last 24 hours ($recentFailures)"
}

if ([int]$recentExecutions -eq 0) {
    $healthStatus = "Warning"
    $issues += "No activity in last 24 hours"
}

if ($dbSizeMB -gt 500) {
    $healthStatus = "Warning"
    $issues += "Database size exceeds 500 MB ($dbSizeMB MB)"
}

# Display health status
$statusColor = switch ($healthStatus) {
    "Healthy" { "Green" }
    "Warning" { "Yellow" }
    "Critical" { "Red" }
}
Write-Host "`nHealth Status: " -NoNewline
Write-Host $healthStatus -ForegroundColor $statusColor

if ($issues.Count -gt 0) {
    Write-Host "`nIssues Detected:" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}

# Step 9: Generate health report
Write-Info "`nStep 9: Generating health report..."
$report = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    DatabaseSizeMB = $dbSizeMB
    TableCounts = $tableCounts
    RecentActivity = @{
        Executions = [int]$recentExecutions
        Successful = [int]$recentSuccess
        Failed = [int]$recentFailures
        SuccessRate = $successRate
    }
    PatternConfidence = @{
        High = [int]$highConfidencePatterns
        Medium = [int]$mediumConfidencePatterns
        Low = [int]$lowConfidencePatterns
    }
    HealthStatus = $healthStatus
    Issues = $issues
}

$reportFileName = "health-report-$(Get-Date -Format 'yyyy-MM-dd').json"
$reportPath = Join-Path $ReportsPath $reportFileName
$report | ConvertTo-Json -Depth 10 | Set-Content $reportPath
Write-Success "Health report saved: $reportPath"

# Step 10: Cleanup old reports (keep last 30 days)
$oldReports = Get-ChildItem -Path $ReportsPath -Filter "health-report-*.json" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }
if ($oldReports) {
    $oldReports | Remove-Item -Force
    Write-Success "Cleaned up $($oldReports.Count) old reports (>30 days)"
}

# Summary
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor $statusColor
Write-Host "║              Health Check Complete!                       ║" -ForegroundColor $statusColor
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor $statusColor

Write-Host "`nDatabase: " -NoNewline -ForegroundColor Cyan
Write-Host "$dbSizeMB MB" -ForegroundColor White
Write-Host "Total Executions: " -NoNewline -ForegroundColor Cyan
Write-Host "$($tableCounts['agent_executions'].ToString('N0'))" -ForegroundColor White
Write-Host "Success Rate: " -NoNewline -ForegroundColor Cyan
Write-Host "$successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } else { "Yellow" })
Write-Host "Health Status: " -NoNewline -ForegroundColor Cyan
Write-Host $healthStatus -ForegroundColor $statusColor

Write-Host ""
exit $(if ($healthStatus -eq "Critical") { 1 } else { 0 })
