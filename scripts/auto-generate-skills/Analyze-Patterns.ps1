# Analyze-Patterns.ps1
# Analyzes learning system data to identify skill/agent generation opportunities
# Queries the real schema in D:\databases\agent_learning.db.

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
$OutputDir = "V:\monorepo\.agent\skills\auto-skill-creator\analysis"

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

# Run a query in tab mode (robust against the '|' that appears in tool/JSON
# values) and return parsed objects. On failure, log and return an empty set so
# one bad query never aborts the whole analysis run.
function Invoke-LearningQuery {
    param(
        [string]$Query,
        [string]$CsvPath
    )
    try {
        $rows = sqlite3 $LearningDB ".headers on" ".mode tabs" $Query | ConvertFrom-Csv -Delimiter "`t"
        if ($null -eq $rows) { $rows = @() }
        $rows | Export-Csv -Path $CsvPath -NoTypeInformation
        return $rows
    } catch {
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        @() | Export-Csv -Path $CsvPath -NoTypeInformation
        return @()
    }
}

# SQL Queries - using actual schema from agent_learning.db

# Tool usage from the tool_success_rates view.
$ToolUsageQuery = @"
SELECT
    tools_used as tool_name,
    total_uses as usage_count,
    success_rate,
    avg_execution_time_ms as avg_execution_time,
    '' as last_used
FROM tool_success_rates
WHERE total_uses >= $MinOccurrences
  AND success_rate >= $($MinSuccessRate * 100)
ORDER BY total_uses DESC;
"@

# Workflow patterns from agent_executions - common task_type + tools_used combinations
$WorkflowPatternsQuery = @"
SELECT
    task_type || '_' || tools_used as task_type,
    COUNT(*) as frequency,
    ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as avg_success_rate,
    AVG(execution_time_ms) as avg_steps
FROM agent_executions
WHERE started_at >= datetime('now', '-$DaysBack days')
  AND task_type IS NOT NULL
  AND task_type != ''
GROUP BY task_type, tools_used
HAVING frequency >= $MinOccurrences
   AND avg_success_rate >= $($MinSuccessRate * 100)
ORDER BY frequency DESC;
"@

# Error patterns from agent_mistakes
$ErrorPatternsQuery = @"
SELECT
    mistake_type as error_pattern,
    prevention_strategy,
    COUNT(*) as occurrences,
    MAX(identified_at) as last_occurrence
FROM agent_mistakes
WHERE identified_at >= datetime('now', '-$DaysBack days')
GROUP BY mistake_type, prevention_strategy
HAVING occurrences >= 5
ORDER BY occurrences DESC;
"@

# Code patterns from code_patterns table
$CodePatternsQuery = @"
SELECT
    name as pattern_name,
    language,
    usage_count as success_count,
    ROUND(100.0 * usage_count / (usage_count + 1), 2) as success_rate_pct,
    tags as use_cases
FROM code_patterns
WHERE usage_count >= $MinOccurrences
ORDER BY usage_count DESC;
"@

# Agent execution patterns from agent_patterns table
$AgentPatternsQuery = @"
SELECT
    pattern_type,
    pattern_name,
    frequency,
    confidence_score,
    task_type,
    tools_used,
    avg_execution_time,
    occurrence_count
FROM agent_patterns
WHERE occurrence_count >= $MinOccurrences
  AND confidence_score >= $MinSuccessRate
ORDER BY occurrence_count DESC;
"@

# Execute queries and save results
Write-Host "1. Analyzing Tool Usage Patterns..." -ForegroundColor Yellow
$toolResults = Invoke-LearningQuery $ToolUsageQuery "$OutputDir\tool-usage-patterns.csv"
Write-Host "   Found $($toolResults.Count) high-usage tools" -ForegroundColor Green

Write-Host "2. Analyzing Workflow Patterns..." -ForegroundColor Yellow
$workflowResults = Invoke-LearningQuery $WorkflowPatternsQuery "$OutputDir\workflow-patterns.csv"
Write-Host "   Found $($workflowResults.Count) successful workflows" -ForegroundColor Green

Write-Host "3. Analyzing Error Patterns..." -ForegroundColor Yellow
$errorResults = Invoke-LearningQuery $ErrorPatternsQuery "$OutputDir\error-patterns.csv"
Write-Host "   Found $($errorResults.Count) common errors" -ForegroundColor Green

Write-Host "4. Analyzing Code Patterns..." -ForegroundColor Yellow
$codeResults = Invoke-LearningQuery $CodePatternsQuery "$OutputDir\code-patterns.csv"
Write-Host "   Found $($codeResults.Count) proven code patterns" -ForegroundColor Green

Write-Host "5. Analyzing Agent Execution Patterns..." -ForegroundColor Yellow
$agentPatternResults = Invoke-LearningQuery $AgentPatternsQuery "$OutputDir\agent-patterns.csv"
Write-Host "   Found $($agentPatternResults.Count) agent execution patterns" -ForegroundColor Green

Write-Host ""
Write-Host "Analysis Complete!" -ForegroundColor Cyan
Write-Host "Results saved to: $OutputDir" -ForegroundColor Gray

# Generate skill candidates
Write-Host ""
Write-Host "Skill Generation Candidates:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Gray

$skillCandidates = @()

# Workflow skills (repeated, high-success task_type + tools combinations)
foreach ($workflow in $workflowResults) {
    if ([int]$workflow.frequency -ge 15 -and [double]$workflow.avg_success_rate -ge 90) {
        $candidate = [PSCustomObject]@{
            Type = "Skill"
            Name = $workflow.task_type -replace '\s+', '-'
            Reason = "Repeated workflow with $($workflow.frequency) occurrences and $($workflow.avg_success_rate)% success"
            Priority = "High"
            Confidence = [Math]::Round([double]$workflow.avg_success_rate / 100, 2)
        }
        $skillCandidates += $candidate
    }
}

# Code pattern skills
foreach ($pattern in $codeResults) {
    if ([int]$pattern.success_count -ge 20) {
        $candidate = [PSCustomObject]@{
            Type = "Skill"
            Name = "$($pattern.pattern_name)-pattern"
            Reason = "$($pattern.language) pattern used $($pattern.success_count) times with $($pattern.success_rate_pct)% success"
            Priority = "Medium"
            Confidence = [Math]::Round([double]$pattern.success_rate_pct / 100, 2)
        }
        $skillCandidates += $candidate
    }
}

# Agent execution pattern skills (frequency/occurrence-driven; execution
# patterns can carry low confidence scores, so the threshold here is lenient)
foreach ($agentPattern in $agentPatternResults) {
    $occurrences = [int]$agentPattern.occurrence_count
    $confidence = [double]$agentPattern.confidence_score
    if ($occurrences -ge 10 -and $confidence -ge 0.05) {
        $candidate = [PSCustomObject]@{
            Type = "Skill"
            Name = "agent-$($agentPattern.pattern_name -replace '\s+', '-')"
            Reason = "Agent pattern '$($agentPattern.pattern_name)' occurred $occurrences times (confidence: $([Math]::Round($confidence * 100, 1))%)"
            Priority = "Medium"
            Confidence = [Math]::Round($confidence, 2)
        }
        $skillCandidates += $candidate
    }
}

# Error-prevention skills (recurring mistakes that have a known prevention)
foreach ($err in $errorResults) {
    $occurrences = [int]$err.occurrences
    if ($occurrences -ge 5 -and $err.prevention_strategy) {
        $candidate = [PSCustomObject]@{
            Type = "Skill"
            Name = "error-prevention-$($err.error_pattern -replace '\s+', '-')"
            Reason = "Error '$($err.error_pattern)' occurred $occurrences times. Prevention: $($err.prevention_strategy)"
            Priority = "High"
            Confidence = 0.9
        }
        $skillCandidates += $candidate
    }
}

$skillCandidates | Format-Table -AutoSize
$skillCandidates | Export-Csv -Path "$OutputDir\skill-candidates.csv" -NoTypeInformation

Write-Host ""
Write-Host "Agent Generation Candidates:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Gray

# Project categories from agent_executions - projects with sustained activity
# are candidates for a dedicated specialist agent.
$ProjectQuery = @"
SELECT
    project_name,
    COUNT(*) as task_count
FROM agent_executions
WHERE started_at >= datetime('now', '-$DaysBack days')
  AND project_name IS NOT NULL
  AND project_name != ''
GROUP BY project_name
HAVING task_count >= 10
ORDER BY task_count DESC;
"@
$projectResults = Invoke-LearningQuery $ProjectQuery "$OutputDir\project-activity.csv"
foreach ($proj in $projectResults) {
    Write-Host "Project '$($proj.project_name)': $($proj.task_count) tasks" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review candidates in: $OutputDir\skill-candidates.csv" -ForegroundColor White
Write-Host "2. Run: .\Generate-Skill.ps1 -CandidateName <name>" -ForegroundColor White
Write-Host "3. User reviews generated SKILL.md" -ForegroundColor White
Write-Host "4. Deploy with: .\Deploy-Skill.ps1 -SkillName <name>" -ForegroundColor White
