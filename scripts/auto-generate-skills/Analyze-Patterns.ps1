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
$LearningSystemDir = "D:\learning-system"
$InsightsFile = "$LearningSystemDir\learning_insights.json"
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

# Check if insights file exists and is fresh
$useInsights = $false
if (Test-Path $InsightsFile) {
    $insightsAge = (Get-Date) - (Get-Item $InsightsFile).LastWriteTime
    if ($insightsAge.TotalHours -lt 24) {
        Write-Host "Using recent learning_insights.json (age: $([math]::Round($insightsAge.TotalHours, 1)) hours)" -ForegroundColor Green
        $useInsights = $true
    }
}

if ($useInsights) {
    # Parse learning_insights.json for pre-analyzed patterns
    $insights = Get-Content $InsightsFile -Raw | ConvertFrom-Json
    
    # Tool usage patterns from insights
    Write-Host "1. Analyzing Tool Usage Patterns (from insights)..." -ForegroundColor Yellow
    $toolPatterns = @()
    foreach ($pattern in $insights.tool_usage_patterns) {
        $tools = $pattern.tools.Trim('[\]" ')
        $usage = $pattern.usage_count
        $success = $pattern.success_rate
        if ($usage -ge $MinOccurrences -and $success -ge ($MinSuccessRate * 100)) {
            $toolPatterns += [PSCustomObject]@{
                tool_name = $tools
                usage_count = $usage
                success_rate = $success
                avg_execution_time = 0
                last_used = (Get-Date).ToString("yyyy-MM-dd")
            }
        }
    }
    $toolPatterns | Export-Csv -Path "$OutputDir\tool-usage-patterns.csv" -NoTypeInformation
    Write-Host "   Found $($toolPatterns.Count) high-usage tools" -ForegroundColor Green

    # Success patterns from insights (task types with success rates)
    Write-Host "2. Analyzing Workflow Patterns (from insights)..." -ForegroundColor Yellow
    $workflowPatterns = @()
    foreach ($pattern in $insights.success_patterns) {
        $taskType = $pattern.task_type
        $freq = $pattern.total_executions
        $success = $pattern.success_rate
        if ($freq -ge $MinOccurrences -and $success -ge ($MinSuccessRate * 100)) {
            $workflowPatterns += [PSCustomObject]@{
                task_type = $taskType
                frequency = $freq
                avg_success_rate = $success
                avg_steps = 1
            }
        }
    }
    $workflowPatterns | Export-Csv -Path "$OutputDir\workflow-patterns.csv" -NoTypeInformation
    Write-Host "   Found $($workflowPatterns.Count) successful workflows" -ForegroundColor Green

    # Error patterns from insights (mistake_patterns is usually empty)
    Write-Host "3. Analyzing Error Patterns (from insights)..." -ForegroundColor Yellow
    $errorPatterns = @()
    if ($insights.mistake_patterns) {
        foreach ($pattern in $insights.mistake_patterns) {
            $errorPatterns += [PSCustomObject]@{
                error_pattern = $pattern.pattern
                prevention_strategy = $pattern.prevention
                occurrences = $pattern.count
                last_occurrence = $pattern.last_seen
            }
        }
    }
    $errorPatterns | Export-Csv -Path "$OutputDir\error-patterns.csv" -NoTypeInformation
    Write-Host "   Found $($errorPatterns.Count) common errors" -ForegroundColor Green

    # Code patterns from database (using actual schema)
    Write-Host "4. Analyzing Code Patterns (from database)..." -ForegroundColor Yellow
    $CodePatternsQuery = @"
SELECT
    name as pattern_name,
    language,
    usage_count as success_count,
    0 as success_rate_pct,
    '' as use_cases
FROM code_patterns
WHERE usage_count >= $MinOccurrences
ORDER BY usage_count DESC;
"@

    $codeResults = sqlite3 $LearningDB $CodePatternsQuery | ConvertFrom-Csv -Delimiter '|'
    $codeResults | Export-Csv -Path "$OutputDir\code-patterns.csv" -NoTypeInformation
    Write-Host "   Found $($codeResults.Count) proven code patterns" -ForegroundColor Green
}
else {
    # Fallback: Use database queries with corrected schema
    Write-Host "Insights file not recent, using database queries with corrected schema..." -ForegroundColor Yellow

    # Tool Usage: Parse tools_used JSON from agent_executions (limited approach)
    $ToolUsageQuery = @"
SELECT
    task_type as tool_name,
    COUNT(*) as usage_count,
    ROUND(AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) * 100, 2) as success_rate,
    AVG(execution_time_ms) as avg_execution_time,
    MAX(started_at) as last_used
FROM agent_executions
WHERE started_at >= datetime('now', '-$DaysBack days')
GROUP BY task_type
HAVING usage_count >= $MinOccurrences
   AND success_rate >= $($MinSuccessRate * 100)
ORDER BY usage_count DESC;
"@

    $toolResults = sqlite3 $LearningDB $ToolUsageQuery | ConvertFrom-Csv -Delimiter '|'
    $toolResults | Export-Csv -Path "$OutputDir\tool-usage-patterns.csv" -NoTypeInformation
    Write-Host "1. Found $($toolResults.Count) high-usage tools (by task_type)" -ForegroundColor Green

    # Workflow Patterns: Use task_patterns with actual schema
    $WorkflowPatternsQuery = @"
SELECT
    pattern_type as task_type,
    frequency,
    CASE WHEN frequency > 0 THEN 100.0 ELSE 0.0 END as avg_success_rate,
    1 as avg_steps
FROM task_patterns
WHERE frequency >= $MinOccurrences
ORDER BY frequency DESC;
"@

    $workflowResults = sqlite3 $LearningDB $WorkflowPatternsQuery | ConvertFrom-Csv -Delimiter '|'
    $workflowResults | Export-Csv -Path "$OutputDir\workflow-patterns.csv" -NoTypeInformation
    Write-Host "2. Found $($workflowResults.Count) successful workflows" -ForegroundColor Green

    # Error Patterns: Use agent_mistakes with actual schema
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

    $errorResults = sqlite3 $LearningDB $ErrorPatternsQuery | ConvertFrom-Csv -Delimiter '|'
    $errorResults | Export-Csv -Path "$OutputDir\error-patterns.csv" -NoTypeInformation
    Write-Host "3. Found $($errorResults.Count) common errors" -ForegroundColor Green

    # Code Patterns: Use code_patterns with actual schema
    $CodePatternsQuery = @"
SELECT
    name as pattern_name,
    language,
    usage_count as success_count,
    0 as success_rate_pct,
    '' as use_cases
FROM code_patterns
WHERE usage_count >= $MinOccurrences
ORDER BY usage_count DESC;
"@

    $codeResults = sqlite3 $LearningDB $CodePatternsQuery | ConvertFrom-Csv -Delimiter '|'
    $codeResults | Export-Csv -Path "$OutputDir\code-patterns.csv" -NoTypeInformation
    Write-Host "4. Found $($codeResults.Count) proven code patterns" -ForegroundColor Green
}

Write-Host ""
Write-Host "Analysis Complete!" -ForegroundColor Cyan
Write-Host "Results saved to: $OutputDir" -ForegroundColor Gray

# Generate skill candidates
Write-Host ""
Write-Host "Skill Generation Candidates:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Gray

$skillCandidates = @()

# From workflow patterns (task types with high frequency and success)
if ($useInsights) {
    $patterns = $workflowPatterns
} else {
    $patterns = $workflowResults
}

foreach ($workflow in $patterns) {
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

# From code patterns
foreach ($pattern in $codeResults) {
    if ($pattern.success_count -ge 20) {
        $candidate = [PSCustomObject]@{
            Type = "Skill"
            Name = "$($pattern.pattern_name)-pattern"
            Reason = "$($pattern.language) pattern used $($pattern.success_count) times"
            Priority = "Medium"
            Confidence = 0.8
        }
        $skillCandidates += $candidate
    }
}

# From tool usage patterns (multi-tool combinations)
if ($useInsights) {
    $toolPatts = $toolPatterns
} else {
    $toolPatts = $toolResults
}

# Add high-usage tool combinations as candidates
foreach ($tool in $toolPatts) {
    if ($tool.usage_count -ge 20 -and $tool.success_rate -ge 95) {
        $candidate = [PSCustomObject]@{
            Type = "Skill"
            Name = "tool-usage-$($tool.tool_name -replace '[^a-zA-Z0-9]', '-')"
            Reason = "High-usage tool pattern: $($tool.tool_name) ($($tool.usage_count) uses, $($tool.success_rate)% success)"
            Priority = "Medium"
            Confidence = [Math]::Round($tool.success_rate / 100, 2)
        }
        $skillCandidates += $candidate
    }
}

if ($skillCandidates.Count -gt 0) {
    $skillCandidates | Format-Table -AutoSize
    $skillCandidates | Export-Csv -Path "$OutputDir\skill-candidates.csv" -NoTypeInformation
}
else {
    Write-Host "No skill candidates found matching criteria." -ForegroundColor Yellow
    # Create empty CSV with headers
    @() | Export-Csv -Path "$OutputDir\skill-candidates.csv" -NoTypeInformation
}

Write-Host ""
Write-Host "Agent Generation Candidates:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Gray

# Analyze project categories (would need project detection logic)
Write-Host "Run 'pnpm nx graph' to visualize project categories" -ForegroundColor Gray
Write-Host "Categories with >3 projects should get specialist agents" -ForegroundColor Gray

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review candidates in: $OutputDir\skill-candidates.csv" -ForegroundColor White
Write-Host "2. Run: .\Generate-Skill.ps1 -CandidateName <name>" -ForegroundColor White
Write-Host "3. User reviews generated SKILL.md" -ForegroundColor White
Write-Host "4. Deploy with: .\Deploy-Skill.ps1 -SkillName <name>" -ForegroundColor White