# LearningSystem PowerShell Module - Enhanced with Auto-Capture
# Location: C:\dev\scripts\LearningSystem.psm1

$Script:DbPath = "D:\databases\agent_learning.db"
$Script:PythonVenv = "D:\learning-system\.venv\Scripts\python.exe"
$Script:CaptureScript = "D:\learning-system\capture_learning.py"

function Record-Learning {
    <#
    .SYNOPSIS
    Record a learning (mistake or success) to the agent learning database
    
    .PARAMETER Type
    Type of learning: 'mistake' or 'success'
    
    .PARAMETER TaskType
    Type of task (e.g., "TypeScript Build", "Git Merge", "Tauri Deploy")
    
    .PARAMETER Description
    Brief description of the learning
    
    .PARAMETER WhatWentWrong
    For mistakes: What went wrong
    
    .PARAMETER WhatShouldHappen
    For mistakes: What should happen instead
    
    .PARAMETER Approach
    For successes: The approach that worked
    
    .PARAMETER Tools
    List of tools involved
    
    .PARAMETER ExecutionTime
    Execution time in seconds (optional)
    
    .PARAMETER Project
    Project name (e.g., "nova-agent", "vibe-tutor")
    
    .EXAMPLE
    Record-Learning -Type mistake -TaskType "React Build" `
        -WhatWentWrong "Used React.FC pattern" `
        -WhatShouldHappen "Use typed props directly" `
        -Tools @("React", "TypeScript")
    
    .EXAMPLE
    Record-Learning -Type success -TaskType "Tauri Build" `
        -Approach "Clean target folder first" `
        -Tools @("Tauri", "pnpm") `
        -ExecutionTime 45.2 `
        -Project "nova-agent"
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
    
    if (-not (Test-Path $Script:DbPath)) {
        Write-Error "Learning database not found at $Script:DbPath"
        return
    }
    
    $toolsJson = ($Tools | ConvertTo-Json -Compress).Replace("'", "''")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $createdAt = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $executionId = [guid]::NewGuid().ToString()
    
    if ($Type -eq 'mistake') {
        if (-not $WhatWentWrong -or -not $WhatShouldHappen) {
            Write-Error "For mistakes, must provide -WhatWentWrong and -WhatShouldHappen"
            return
        }
        
        $safeWrong = $WhatWentWrong.Replace("'", "''")
        $safeShould = $WhatShouldHappen.Replace("'", "''")
        $safeTask = $TaskType.Replace("'", "''")
        
        $query1 = "INSERT INTO agent_executions (execution_id, agent_id, task_type, tools_used, started_at, completed_at, success, execution_time_ms, error_message, metadata, context, project_name) VALUES ('$executionId', 'clawdbot', '$safeTask', '$toolsJson', '$timestamp', '$timestamp', 0, 0, '$safeWrong', '{}', '{}', 'unknown');"
        $mistakeMetadata = (@{
            execution_id = $executionId
            task_type = $TaskType
            tools = $Tools
        } | ConvertTo-Json -Compress).Replace("'", "''")
        $query2 = "INSERT INTO agent_mistakes (mistake_type, mistake_category, description, root_cause_analysis, context_when_occurred, impact_severity, prevention_strategy, identified_at, resolved) VALUES ('$safeTask', 'manual-capture', '$safeWrong', '$safeWrong', '$mistakeMetadata', 'medium', '$safeShould', '$timestamp', 0);"
        $query3 = "INSERT INTO learning_events (title, description, outcome, app_source, created_at, metadata) VALUES ('mistake_captured', 'Mistake: $safeWrong', 'needs_prevention', 'LearningSystem.psm1', $createdAt, '$mistakeMetadata');"
        
        sqlite3.exe $Script:DbPath $query1
        sqlite3.exe $Script:DbPath $query2
        sqlite3.exe $Script:DbPath $query3
        
        Write-Host "✅ Recorded mistake: $TaskType" -ForegroundColor Yellow
        Write-Host "   What went wrong: $WhatWentWrong" -ForegroundColor Gray
        Write-Host "   What should happen: $WhatShouldHappen" -ForegroundColor Green
        
    } elseif ($Type -eq 'success') {
        if (-not $Approach) {
            Write-Error "For successes, must provide -Approach"
            return
        }
        
        $execTime = if ($ExecutionTime) { $ExecutionTime } else { 0 }
        $execTimeMs = [int][math]::Round($execTime * 1000)
        $proj = if ($Project) { $Project } else { 'unknown' }
        
        $safeApproach = $Approach.Replace("'", "''")
        $safeTask = $TaskType.Replace("'", "''")
        $safeProj = $proj.Replace("'", "''")
        
        $query1 = "INSERT INTO agent_executions (execution_id, agent_id, task_type, tools_used, started_at, completed_at, success, execution_time_ms, error_message, metadata, context, project_name) VALUES ('$executionId', 'clawdbot', '$safeTask', '$toolsJson', '$timestamp', '$timestamp', 1, $execTimeMs, NULL, '{}', '{}', '$safeProj');"
        $knowledgeMetadata = (@{
            execution_id = $executionId
            project = $proj
            tools = $Tools
            execution_time_seconds = $execTime
        } | ConvertTo-Json -Compress).Replace("'", "''")
        $query2 = "INSERT INTO agent_knowledge (knowledge_type, title, content, applicable_tasks, success_rate_improvement, confidence_level, tags, description, applicable_contexts, usage_count, effectiveness_score, created_at, last_used) VALUES ('success_pattern', '$safeTask', '$safeApproach', '$safeTask', 1.0, 0.9, '$toolsJson', '$safeApproach', '$knowledgeMetadata', 1, 1.0, '$timestamp', '$timestamp');"
        $query3 = "INSERT INTO learning_events (title, description, outcome, app_source, created_at, metadata) VALUES ('success_recorded', 'Success: $safeTask - $safeApproach', 'success', 'LearningSystem.psm1', $createdAt, '$knowledgeMetadata');"
        
        sqlite3.exe $Script:DbPath $query1
        sqlite3.exe $Script:DbPath $query2
        sqlite3.exe $Script:DbPath $query3
        
        Write-Host "✅ Recorded success: $TaskType" -ForegroundColor Green
        Write-Host "   Approach: $Approach" -ForegroundColor Cyan
        Write-Host "   Tools: $($Tools -join ', ')" -ForegroundColor Gray
    }
}

function Get-LearningMistakes {
    <#
    .SYNOPSIS
    Query recent mistakes from the learning database
    
    .PARAMETER Last
    Number of recent mistakes to retrieve (default: 10)
    
    .PARAMETER TaskType
    Filter by task type
    
    .PARAMETER Tool
    Filter by tool name
    #>
    [CmdletBinding()]
    param(
        [int]$Last = 10,
        [string]$TaskType,
        [string]$Tool
    )
    
    $where = "WHERE 1=1"
    
    if ($TaskType) {
        $where += " AND m.mistake_type LIKE '%$TaskType%'"
    }
    
    if ($Tool) {
        $where += " AND m.context_when_occurred LIKE '%$Tool%'"
    }
    
    $query = "SELECT m.id, m.mistake_type, m.description as what_went_wrong, m.prevention_strategy as what_should_happen, m.impact_severity, m.identified_at as last_seen, m.context_when_occurred FROM agent_mistakes m $where ORDER BY m.identified_at DESC LIMIT $Last;"
    
    $results = sqlite3.exe $Script:DbPath -header -column $query
    
    if ($results) {
        Write-Host "`n📚 Recent Mistakes (Last $Last):" -ForegroundColor Yellow
        Write-Host $results
    } else {
        Write-Host "No mistakes found matching criteria" -ForegroundColor Gray
    }
}

function Get-LearningSuccesses {
    <#
    .SYNOPSIS
    Query recent successful patterns from the learning database
    
    .PARAMETER Last
    Number of recent successes to retrieve (default: 10)
    
    .PARAMETER TaskType
    Filter by task type
    
    .PARAMETER Project
    Filter by project name
    #>
    [CmdletBinding()]
    param(
        [int]$Last = 10,
        [string]$TaskType,
        [string]$Project
    )
    
    $where = "WHERE 1=1"
    
    if ($TaskType) {
        $where += " AND k.applicable_tasks LIKE '%$TaskType%'"
    }
    
    if ($Project) {
        $where += " AND k.applicable_contexts LIKE '%$Project%'"
    }
    
    $query = "SELECT k.id, k.applicable_tasks as task_type, k.content as approach, k.confidence_level as confidence, k.usage_count as times_used, k.last_used FROM agent_knowledge k $where ORDER BY k.last_used DESC LIMIT $Last;"
    
    $results = sqlite3.exe $Script:DbPath -header -column $query
    
    if ($results) {
        Write-Host "`n✅ Recent Successes (Last $Last):" -ForegroundColor Green
        Write-Host $results
    } else {
        Write-Host "No successes found matching criteria" -ForegroundColor Gray
    }
}

function Get-LearningRecommendations {
    <#
    .SYNOPSIS
    Get recommendations for a task based on learning history
    
    .PARAMETER TaskType
    Type of task to get recommendations for
    
    .PARAMETER Project
    Project context (optional)
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$TaskType,
        
        [string]$Project
    )
    
    # Find similar successful patterns
    $where = "WHERE k.applicable_tasks LIKE '%$TaskType%'"
    
    if ($Project) {
        $where += " AND k.applicable_contexts LIKE '%$Project%'"
    }
    
    $query = "SELECT k.content as approach, k.tags as tools, k.confidence_level as confidence, k.usage_count as times_used, k.applicable_contexts as context FROM agent_knowledge k $where ORDER BY k.confidence_level DESC, k.usage_count DESC LIMIT 3;"
    
    $recommendations = sqlite3.exe $Script:DbPath -header -column $query
    
    # Find related mistakes to avoid
    $mistakeQuery = "SELECT m.description as what_went_wrong, m.prevention_strategy as what_should_happen FROM agent_mistakes m WHERE m.mistake_type LIKE '%$TaskType%' ORDER BY m.identified_at DESC LIMIT 3;"
    
    $mistakes = sqlite3.exe $Script:DbPath -header -column $mistakeQuery
    
    Write-Host "`n💡 Recommendations for: $TaskType" -ForegroundColor Cyan
    
    if ($recommendations) {
        Write-Host "`n✅ Proven Approaches:" -ForegroundColor Green
        Write-Host $recommendations
    } else {
        Write-Host "  No proven approaches found yet" -ForegroundColor Gray
    }
    
    if ($mistakes) {
        Write-Host "`n⚠️ Mistakes to Avoid:" -ForegroundColor Yellow
        Write-Host $mistakes
    }
}

function Show-LearningStats {
    <#
    .SYNOPSIS
    Display overall learning statistics
    #>
    
    Write-Host "`n📊 Learning System Statistics" -ForegroundColor Cyan
    Write-Host "Database: $Script:DbPath`n" -ForegroundColor Gray
    
    $total = sqlite3.exe $Script:DbPath "SELECT COUNT(*) FROM agent_executions;"
    Write-Host "Total Executions: $total"
    
    $success = sqlite3.exe $Script:DbPath "SELECT ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 1) FROM agent_executions;"
    Write-Host "Success Rate: $success%"
    
    $mistakes = sqlite3.exe $Script:DbPath "SELECT COUNT(*) FROM agent_mistakes;"
    Write-Host "Total Mistakes Captured: $mistakes"
    
    $patterns = sqlite3.exe $Script:DbPath "SELECT COUNT(*) FROM agent_knowledge;"
    Write-Host "Success Patterns Stored: $patterns`n"
    
    Write-Host "Top Task Types:" -ForegroundColor Cyan
    sqlite3.exe $Script:DbPath -header -column "SELECT task_type, COUNT(*) as count FROM agent_executions GROUP BY task_type ORDER BY count DESC LIMIT 5;"
}

function Start-LearningReflection {
    <#
    .SYNOPSIS
    Analyze recent conversation for learnings (called from HEARTBEAT.md)
    
    .PARAMETER ConversationFile
    Path to conversation log (daily memory file)
    #>
    [CmdletBinding()]
    param(
        [string]$ConversationFile
    )
    
    # This will be implemented to:
    # 1. Read recent conversation
    # 2. Detect mistake/success patterns
    # 3. Auto-capture learnings
    # 4. Update MEMORY.md
    
    Write-Host "🧠 Running learning reflection..." -ForegroundColor Cyan
    
    # Placeholder - will integrate Python capture script
    if (Test-Path $Script:CaptureScript) {
        & $Script:PythonVenv $Script:CaptureScript
    }
    
    Write-Host "✅ Reflection complete" -ForegroundColor Green
}

# Export functions
Export-ModuleMember -Function @(
    'Record-Learning',
    'Get-LearningMistakes',
    'Get-LearningSuccesses',
    'Get-LearningRecommendations',
    'Show-LearningStats',
    'Start-LearningReflection'
)
