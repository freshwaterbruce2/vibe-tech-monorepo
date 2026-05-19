# LearningSystem PowerShell Module - local helper for agent_learning.db
# Location: C:\dev\scripts\LearningSystem.psm1

$Script:DbPath = "D:\databases\agent_learning.db"
$Script:PythonVenv = "D:\learning-system\.venv\Scripts\python.exe"
$Script:CaptureScript = "D:\learning-system\capture_learning.py"

function ConvertTo-LearningSqlLiteral {
    param(
        [AllowNull()]
        [object]$Value
    )

    if ($null -eq $Value) {
        return 'NULL'
    }

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return 'NULL'
    }

    return "'$($text.Replace("'", "''"))'"
}

function ConvertTo-LearningLikeLiteral {
    param(
        [string]$Value
    )

    return ConvertTo-LearningSqlLiteral -Value "%$Value%"
}

function Invoke-LearningSql {
    param(
        [Parameter(Mandatory)]
        [string]$Sql
    )

    if (-not (Test-Path -LiteralPath $Script:DbPath)) {
        throw "Learning database not found at $Script:DbPath"
    }

    $output = $Sql | & sqlite3.exe $Script:DbPath 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "sqlite3 failed: $output"
    }

    return $output
}

function ConvertTo-LearningToolsJson {
    param(
        [string[]]$Tools = @()
    )

    if (-not $Tools -or $Tools.Count -eq 0) {
        return '[]'
    }

    return ConvertTo-Json -InputObject @($Tools) -Compress
}

function Record-Learning {
    <#
    .SYNOPSIS
    Record a learning event to the live agent learning database.

    .PARAMETER Type
    Type of learning: 'mistake' or 'success'

    .PARAMETER TaskType
    Type of task, for example "TypeScript Build", "Git Merge", or "Tauri Deploy"

    .PARAMETER Description
    Brief description of the learning

    .PARAMETER WhatWentWrong
    For mistakes: what went wrong

    .PARAMETER WhatShouldHappen
    For mistakes: what should happen instead

    .PARAMETER Approach
    For successes: the approach that worked

    .PARAMETER Tools
    List of tools involved

    .PARAMETER ExecutionTime
    Execution time in seconds

    .PARAMETER Project
    Project name, for example "nova-agent" or "vibe-tutor"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet('mistake', 'success')]
        [string]$Type,

        [Parameter(Mandatory)]
        [string]$TaskType,

        [string]$Description,

        [string]$WhatWentWrong,

        [string]$WhatShouldHappen,

        [string]$Approach,

        [string[]]$Tools = @(),

        [double]$ExecutionTime,

        [string]$Project
    )

    $executionId = [Guid]::NewGuid().ToString()
    $projectName = if ($Project) { $Project } else { 'unknown' }
    $toolsJson = ConvertTo-LearningToolsJson -Tools $Tools
    $executionTimeMs = if ($ExecutionTime) { [int][Math]::Round($ExecutionTime * 1000) } else { 0 }
    $executionTimeSeconds = if ($ExecutionTime) { [int][Math]::Round($ExecutionTime) } else { 0 }
    $metadata = @{
        type = $Type
        description = $Description
        project = $projectName
        taskType = $TaskType
        tools = @($Tools)
        executionId = $executionId
    } | ConvertTo-Json -Compress

    try {
        if ($Type -eq 'mistake') {
            if (-not $WhatWentWrong -or -not $WhatShouldHappen) {
                Write-Error "For mistakes, provide -WhatWentWrong and -WhatShouldHappen"
                return
            }

            $metadata = @{
                type = $Type
                description = $Description
                project = $projectName
                taskType = $TaskType
                tools = @($Tools)
                executionId = $executionId
                whatShouldHappen = $WhatShouldHappen
            } | ConvertTo-Json -Compress

            Invoke-LearningSql -Sql @"
INSERT INTO agent_executions (
    execution_id, agent_id, agent_name, project_name, task_type, tools_used,
    started_at, success, execution_time_ms, execution_time, error_message,
    metadata, created_at
) VALUES (
    $(ConvertTo-LearningSqlLiteral $executionId),
    'clawdbot',
    'clawdbot',
    $(ConvertTo-LearningSqlLiteral $projectName),
    $(ConvertTo-LearningSqlLiteral $TaskType),
    $(ConvertTo-LearningSqlLiteral $toolsJson),
    datetime('now'),
    0,
    $executionTimeMs,
    $executionTimeSeconds,
    $(ConvertTo-LearningSqlLiteral $WhatWentWrong),
    $(ConvertTo-LearningSqlLiteral $metadata),
    strftime('%s','now')
);
"@ | Out-Null

            Invoke-LearningSql -Sql @"
INSERT INTO agent_mistakes (
    mistake_type, mistake_category, description, root_cause_analysis,
    context_when_occurred, impact_severity, prevention_strategy, identified_at,
    resolved
) VALUES (
    $(ConvertTo-LearningSqlLiteral $TaskType),
    'manual_capture',
    $(ConvertTo-LearningSqlLiteral $WhatWentWrong),
    $(ConvertTo-LearningSqlLiteral $WhatWentWrong),
    $(ConvertTo-LearningSqlLiteral $Description),
    'medium',
    $(ConvertTo-LearningSqlLiteral $WhatShouldHappen),
    datetime('now'),
    0
);
"@ | Out-Null

            Invoke-LearningSql -Sql @"
INSERT INTO learning_events (title, description, outcome, app_source, created_at, metadata)
VALUES (
    'mistake_captured',
    $(ConvertTo-LearningSqlLiteral $WhatWentWrong),
    'mistake',
    'nova',
    strftime('%s','now'),
    $(ConvertTo-LearningSqlLiteral $metadata)
);
"@ | Out-Null

            Write-Host "Recorded mistake: $TaskType" -ForegroundColor Yellow
            Write-Host "   What went wrong: $WhatWentWrong" -ForegroundColor Gray
            Write-Host "   What should happen: $WhatShouldHappen" -ForegroundColor Green
        } elseif ($Type -eq 'success') {
            if (-not $Approach) {
                Write-Error "For successes, provide -Approach"
                return
            }

            $tagValues = @($Tools) + @($projectName)
            $tags = ($tagValues | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }) -join ','
            $descriptionText = if ($Description) {
                "Project: $projectName. $Description"
            } else {
                "Project: $projectName."
            }

            Invoke-LearningSql -Sql @"
INSERT INTO agent_executions (
    execution_id, agent_id, agent_name, project_name, task_type, tools_used,
    started_at, success, execution_time_ms, execution_time, metadata, created_at
) VALUES (
    $(ConvertTo-LearningSqlLiteral $executionId),
    'clawdbot',
    'clawdbot',
    $(ConvertTo-LearningSqlLiteral $projectName),
    $(ConvertTo-LearningSqlLiteral $TaskType),
    $(ConvertTo-LearningSqlLiteral $toolsJson),
    datetime('now'),
    1,
    $executionTimeMs,
    $executionTimeSeconds,
    $(ConvertTo-LearningSqlLiteral $metadata),
    strftime('%s','now')
);
"@ | Out-Null

            Invoke-LearningSql -Sql @"
INSERT INTO agent_knowledge (
    knowledge_type, title, content, applicable_tasks, success_rate_improvement,
    confidence_level, tags, description, usage_count, effectiveness_score,
    created_at, last_used
) VALUES (
    'success_pattern',
    $(ConvertTo-LearningSqlLiteral $TaskType),
    $(ConvertTo-LearningSqlLiteral $Approach),
    $(ConvertTo-LearningSqlLiteral $TaskType),
    1.0,
    0.9,
    $(ConvertTo-LearningSqlLiteral $tags),
    $(ConvertTo-LearningSqlLiteral $descriptionText),
    1,
    1.0,
    datetime('now'),
    datetime('now')
);
"@ | Out-Null

            Invoke-LearningSql -Sql @"
INSERT INTO learning_events (title, description, outcome, app_source, created_at, metadata)
VALUES (
    'success_recorded',
    $(ConvertTo-LearningSqlLiteral $Approach),
    'success',
    'nova',
    strftime('%s','now'),
    $(ConvertTo-LearningSqlLiteral $metadata)
);
"@ | Out-Null

            Write-Host "Recorded success: $TaskType" -ForegroundColor Green
            Write-Host "   Approach: $Approach" -ForegroundColor Cyan
            Write-Host "   Tools: $($Tools -join ', ')" -ForegroundColor Gray
        }
    } catch {
        Write-Error "Failed to record learning: $_"
    }
}

function Get-LearningMistakes {
    <#
    .SYNOPSIS
    Query recent mistakes from the learning database.
    #>
    [CmdletBinding()]
    param(
        [int]$Last = 10,
        [string]$TaskType,
        [string]$Tool
    )

    $where = @('1=1')

    if ($TaskType) {
        $pattern = ConvertTo-LearningLikeLiteral -Value $TaskType
        $where += "(m.mistake_type LIKE $pattern OR m.description LIKE $pattern)"
    }

    if ($Tool) {
        $pattern = ConvertTo-LearningLikeLiteral -Value $Tool
        $where += "(m.context_when_occurred LIKE $pattern OR m.description LIKE $pattern)"
    }

    $whereSql = $where -join ' AND '
    $query = @"
SELECT
    m.id,
    m.mistake_type,
    m.description AS what_went_wrong,
    m.prevention_strategy AS what_should_happen,
    m.impact_severity,
    m.identified_at
FROM agent_mistakes m
WHERE $whereSql
ORDER BY m.identified_at DESC
LIMIT $Last;
"@

    $results = Invoke-LearningSql -Sql $query

    if ($results) {
        Write-Host "`nRecent Mistakes (Last $Last):" -ForegroundColor Yellow
        Write-Host $results
    } else {
        Write-Host "No mistakes found matching criteria" -ForegroundColor Gray
    }
}

function Get-LearningSuccesses {
    <#
    .SYNOPSIS
    Query recent successful patterns from the learning database.
    #>
    [CmdletBinding()]
    param(
        [int]$Last = 10,
        [string]$TaskType,
        [string]$Project
    )

    $where = @("k.knowledge_type = 'success_pattern'")

    if ($TaskType) {
        $pattern = ConvertTo-LearningLikeLiteral -Value $TaskType
        $where += "(k.title LIKE $pattern OR k.applicable_tasks LIKE $pattern OR k.content LIKE $pattern)"
    }

    if ($Project) {
        $pattern = ConvertTo-LearningLikeLiteral -Value $Project
        $where += "(k.description LIKE $pattern OR k.tags LIKE $pattern)"
    }

    $whereSql = $where -join ' AND '
    $query = @"
SELECT
    k.id,
    k.title AS task_type,
    k.content AS approach,
    k.confidence_level,
    k.usage_count,
    round(k.effectiveness_score, 2) AS effectiveness,
    k.last_used
FROM agent_knowledge k
WHERE $whereSql
ORDER BY COALESCE(k.last_used, k.created_at) DESC
LIMIT $Last;
"@

    $results = Invoke-LearningSql -Sql $query

    if ($results) {
        Write-Host "`nRecent Successes (Last $Last):" -ForegroundColor Green
        Write-Host $results
    } else {
        Write-Host "No successes found matching criteria" -ForegroundColor Gray
    }
}

function Get-LearningRecommendations {
    <#
    .SYNOPSIS
    Get recommendations for a task based on learning history.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$TaskType,

        [string]$Project
    )

    $taskPattern = ConvertTo-LearningLikeLiteral -Value $TaskType
    $successWhere = @(
        "k.knowledge_type = 'success_pattern'",
        "(k.title LIKE $taskPattern OR k.applicable_tasks LIKE $taskPattern OR k.content LIKE $taskPattern)"
    )

    if ($Project) {
        $projectPattern = ConvertTo-LearningLikeLiteral -Value $Project
        $successWhere += "(k.description LIKE $projectPattern OR k.tags LIKE $projectPattern)"
    }

    $successWhereSql = $successWhere -join ' AND '
    $recommendationQuery = @"
SELECT
    k.content AS approach,
    k.tags,
    k.confidence_level,
    k.usage_count,
    round(k.effectiveness_score, 2) AS effectiveness
FROM agent_knowledge k
WHERE $successWhereSql
ORDER BY k.confidence_level DESC, k.usage_count DESC
LIMIT 3;
"@

    $mistakeQuery = @"
SELECT
    m.description AS what_went_wrong,
    m.prevention_strategy AS what_should_happen
FROM agent_mistakes m
WHERE m.mistake_type LIKE $taskPattern OR m.description LIKE $taskPattern
ORDER BY m.identified_at DESC
LIMIT 3;
"@

    $recommendations = Invoke-LearningSql -Sql $recommendationQuery
    $mistakes = Invoke-LearningSql -Sql $mistakeQuery

    Write-Host "`nRecommendations for: $TaskType" -ForegroundColor Cyan

    if ($recommendations) {
        Write-Host "`nProven Approaches:" -ForegroundColor Green
        Write-Host $recommendations
    } else {
        Write-Host "  No proven approaches found yet" -ForegroundColor Gray
    }

    if ($mistakes) {
        Write-Host "`nMistakes to Avoid:" -ForegroundColor Yellow
        Write-Host $mistakes
    }
}

function Show-LearningStats {
    <#
    .SYNOPSIS
    Display overall learning statistics.
    #>

    Write-Host "`nLearning System Statistics" -ForegroundColor Cyan
    Write-Host "Database: $Script:DbPath`n" -ForegroundColor Gray

    $total = Invoke-LearningSql -Sql "SELECT COUNT(*) FROM agent_executions;"
    Write-Host "Total Executions: $total"

    $success = Invoke-LearningSql -Sql "SELECT ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 1) FROM agent_executions;"
    Write-Host "Success Rate: $success%"

    $mistakes = Invoke-LearningSql -Sql "SELECT COUNT(*) FROM agent_mistakes;"
    Write-Host "Total Mistakes Captured: $mistakes"

    $patterns = Invoke-LearningSql -Sql "SELECT COUNT(*) FROM agent_knowledge;"
    Write-Host "Success Patterns Stored: $patterns`n"

    Write-Host "Top Task Types:" -ForegroundColor Cyan
    Invoke-LearningSql -Sql "SELECT task_type, COUNT(*) AS count FROM agent_executions GROUP BY task_type ORDER BY count DESC LIMIT 5;"
}

function Start-LearningReflection {
    <#
    .SYNOPSIS
    Analyze recent conversation for learnings when the optional capture script exists.
    #>
    [CmdletBinding()]
    param(
        [string]$ConversationFile
    )

    Write-Host "Running learning reflection..." -ForegroundColor Cyan

    if (-not (Test-Path -LiteralPath $Script:CaptureScript)) {
        Write-Host "Skipped: optional capture script is not present at $Script:CaptureScript" -ForegroundColor Yellow
        return
    }

    if (Test-Path -LiteralPath $Script:PythonVenv) {
        & $Script:PythonVenv $Script:CaptureScript
    } else {
        & python $Script:CaptureScript
    }

    Write-Host "Reflection complete" -ForegroundColor Green
}

Export-ModuleMember -Function @(
    'Record-Learning',
    'Get-LearningMistakes',
    'Get-LearningSuccesses',
    'Get-LearningRecommendations',
    'Show-LearningStats',
    'Start-LearningReflection'
)
