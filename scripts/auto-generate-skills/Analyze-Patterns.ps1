# Analyze-Patterns.ps1
# Analyzes learning system data to identify skill/agent generation opportunities

param(
    [Parameter(Mandatory=$false)]
    [int]$DaysBack = 30,

    [Parameter(Mandatory=$false)]
    [double]$MinSuccessRate = 0.8,

    [Parameter(Mandatory=$false)]
    [int]$MinOccurrences = 10
)

$ErrorActionPreference = "Stop"

# Paths
$LearningDB = "D:\databases\agent_learning.db"
$OutputDir = "C:\dev\.agent\skills\auto-skill-creator\analysis"

# Ensure output directory exists
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

Write-Host "Analyzing Learning System Patterns" -ForegroundColor Cyan
Write-Host "Database: $LearningDB" -ForegroundColor Gray
Write-Host "Time Range: Last $DaysBack days" -ForegroundColor Gray
Write-Host "Min Success Rate: $($MinSuccessRate * 100)%" -ForegroundColor Gray
Write-Host "Min Occurrences: $MinOccurrences" -ForegroundColor Gray
Write-Host ""

# Check if database exists
if (-not (Test-Path $LearningDB)) {
    Write-Host "ERROR: Learning database not found at $LearningDB" -ForegroundColor Red
    exit 1
}

# SQL Queries
$ToolUsageQuery = @"
SELECT
    tool_name,
    COUNT(*) as usage_count,
    ROUND(AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate,
    AVG(execution_time_ms) as avg_execution_time,
    MAX(timestamp) as last_used
FROM agent_executions
WHERE timestamp >= datetime('now', '-$DaysBack days')
GROUP BY tool_name
HAVING usage_count >= $MinOccurrences
   AND success_rate >= $($MinSuccessRate * 100)
ORDER BY usage_count DESC;
"@

$WorkflowPatternsQuery = @"
SELECT
    task_type,
    COUNT(*) as frequency,
    ROUND(AVG(success_rate) * 100, 2) as avg_success_rate,
    AVG(steps_count) as avg_steps
FROM task_patterns
WHERE success_rate >= $MinSuccessRate
GROUP BY task_type
HAVING frequency >= $MinOccurrences
ORDER BY frequency DESC;
"@

$ErrorPatternsQuery = @"
SELECT
    error_pattern,
    prevention_strategy,
    COUNT(*) as occurrences,
    MAX(identified_at) as last_occurrence
FROM agent_mistakes
WHERE identified_at >= datetime('now', '-$DaysBack days')
GROUP BY error_pattern
HAVING occurrences >= 5
ORDER BY occurrences DESC;
"@

$CodePatternsQuery = @"
SELECT
    pattern_name,
    language,
    success_count,
    ROUND(success_rate * 100, 2) as success_rate_pct,
    use_cases
FROM code_patterns
WHERE success_rate >= $MinSuccessRate
  AND success_count >= $MinOccurrences
ORDER BY success_count DESC;
"@

# Execute queries and save results
Write-Host "1. Analyzing Tool Usage Patterns..." -ForegroundColor Yellow
$toolResults = sqlite3 $LearningDB $ToolUsageQuery | ConvertFrom-Csv -Delimiter '|'
$toolResults | Export-Csv -Path "$OutputDir\tool-usage-patterns.csv" -NoTypeInformation
Write-Host "   Found $($toolResults.Count) high-usage tools" -ForegroundColor Green

Write-Host "2. Analyzing Workflow Patterns..." -ForegroundColor Yellow
$workflowResults = sqlite3 $LearningDB $WorkflowPatternsQuery | ConvertFrom-Csv -Delimiter '|'
$workflowResults | Export-Csv -Path "$OutputDir\workflow-patterns.csv" -NoTypeInformation
Write-Host "   Found $($workflowResults.Count) successful workflows" -ForegroundColor Green

Write-Host "3. Analyzing Error Patterns..." -ForegroundColor Yellow
$errorResults = sqlite3 $LearningDB $ErrorPatternsQuery | ConvertFrom-Csv -Delimiter '|'
$errorResults | Export-Csv -Path "$OutputDir\error-patterns.csv" -NoTypeInformation
Write-Host "   Found $($errorResults.Count) common errors" -ForegroundColor Green

Write-Host "4. Analyzing Code Patterns..." -ForegroundColor Yellow
$codeResults = sqlite3 $LearningDB $CodePatternsQuery | ConvertFrom-Csv -Delimiter '|'
$codeResults | Export-Csv -Path "$OutputDir\code-patterns.csv" -NoTypeInformation
Write-Host "   Found $($codeResults.Count) proven code patterns" -ForegroundColor Green

Write-Host ""
Write-Host "Analysis Complete!" -ForegroundColor Cyan
Write-Host "Results saved to: $OutputDir" -ForegroundColor Gray

# Generate skill candidates
Write-Host ""
Write-Host "Skill Generation Candidates:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Gray

$skillCandidates = @()

# Tool combination patterns (if tools used together frequently)
foreach ($workflow in $workflowResults) {
    if ($workflow.frequency -ge 15 -and $workflow.avg_success_rate -ge 90) {
        $candidate = [PSCustomObject]@{
            Type = "Skill"
            Name = $workflow.task_type -replace '\s+', '-'
            Reason = "Repeated workflow with $($workflow.frequency) occurrences and $($workflow.avg_success_rate)% success"
            Priority = "High"
            Confidence = [Math]::Round($workflow.avg_success_rate / 100, 2)
        }
        $skillCandidates += $candidate
    }
}

# Code pattern skills
foreach ($pattern in $codeResults) {
    if ($pattern.success_count -ge 20) {
        $candidate = [PSCustomObject]@{
            Type = "Skill"
            Name = "$($pattern.pattern_name)-pattern"
            Reason = "$($pattern.language) pattern used $($pattern.success_count) times with $($pattern.success_rate_pct)% success"
            Priority = "Medium"
            Confidence = [Math]::Round($pattern.success_rate_pct / 100, 2)
        }
        $skillCandidates += $candidate
    }
}

$skillCandidates | Format-Table -AutoSize
$skillCandidates | Export-Csv -Path "$OutputDir\skill-candidates.csv" -NoTypeInformation

Write-Host ""
Write-Host "Agent Generation Candidates:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Gray

# Analyze project categories (would need project detection logic)
# For now, just show the pattern
Write-Host "Run 'pnpm nx graph' to visualize project categories" -ForegroundColor Gray
Write-Host "Categories with >3 projects should get specialist agents" -ForegroundColor Gray

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review candidates in: $OutputDir\skill-candidates.csv" -ForegroundColor White
Write-Host "2. Run: .\Generate-Skill.ps1 -CandidateName <name>" -ForegroundColor White
Write-Host "3. User reviews generated SKILL.md" -ForegroundColor White
Write-Host "4. Deploy with: .\Deploy-Skill.ps1 -SkillName <name>" -ForegroundColor White
