#!/usr/bin/env pwsh
# PostToolUse hook - records specialist agent (Agent tool) invocations to the learning DB
# Fires on ANY PostToolUse; exits early if tool_name != "Agent"
# Fire-and-forget: never blocks, never fails the tool call
#
# Also auto-records pipeline stage results when a ralph-wiggum pipeline run is active
# (reads D:\learning-system\lats-active-pipeline.json written by lats-pipeline-start.ps1)
# This means stage recording is automatic — the orchestrator agent doesn't have to do it manually.

$ErrorActionPreference = 'SilentlyContinue'
$inputJson = [Console]::In.ReadToEnd()

# Exit silently if nothing on stdin
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop

    # Only handle Agent tool invocations - bail on everything else
    $toolName = $hookData.tool_name
    if ($toolName -ne 'Agent') { exit 0 }

    # Extract subagent details from tool_input
    $subagentType = $hookData.tool_input.subagent_type
    if ([string]::IsNullOrWhiteSpace($subagentType)) { $subagentType = 'unknown-agent' }

    $description = $hookData.tool_input.description
    if ([string]::IsNullOrWhiteSpace($description)) { $description = 'subagent-task' }

    $prompt = $hookData.tool_input.prompt
    $contextSnippet = if ($prompt) { $prompt.Substring(0, [Math]::Min(500, $prompt.Length)) } else { '' }

    # Determine success from tool_response
    # Claude Code marks failed tool calls with is_error=true on the response
    $success = $true
    $errorMessage = $null
    if ($hookData.tool_response.is_error -eq $true) {
        $success = $false
        $errorMessage = 'Subagent returned error'
    }
    if ($hookData.error) {
        $success = $false
        $errorMessage = $hookData.error
    }

    # Duration: prefer hook-provided field, otherwise compute from PreToolUse stash.
    $executionTimeMs = $null
    if ($hookData.duration_ms) { $executionTimeMs = [int]$hookData.duration_ms }
    elseif ($hookData.duration) { $executionTimeMs = [int]($hookData.duration * 1000) }
    else {
        $tuid = [string]$hookData.tool_use_id
        if ($tuid) {
            $timingFile = Join-Path 'D:\temp\agent-timings' "$tuid.txt"
            if (Test-Path $timingFile) {
                try {
                    $startIso = (Get-Content $timingFile -Raw -ErrorAction Stop).Trim()
                    $startUtc = [DateTime]::Parse($startIso, [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::RoundtripKind)
                    $executionTimeMs = [int]([DateTime]::UtcNow - $startUtc).TotalMilliseconds
                } catch {}
                Remove-Item -Path $timingFile -Force -ErrorAction SilentlyContinue
            }
        }
    }

    # Infer project from cwd
    $project = $null
    if ($hookData.cwd -match 'C:\\dev\\apps\\([^\\]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -match 'C:\\dev\\packages\\([^\\]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -match 'C:\\dev\\backend\\([^\\]+)') { $project = $matches[1] }

    # Build MCP payload
    $mcpArgs = @{
        agentId = $subagentType
        taskType = $description
        success = $success
    }
    if ($project) { $mcpArgs.projectName = $project }
    if ($executionTimeMs) { $mcpArgs.executionTimeMs = $executionTimeMs }
    if ($errorMessage) { $mcpArgs.errorMessage = $errorMessage }
    if ($contextSnippet) { $mcpArgs.context = $contextSnippet }

    $payload = @{
        jsonrpc = '2.0'
        id = [Guid]::NewGuid().ToString()
        method = 'tools/call'
        params = @{
            name = 'memory_learning_record_execution'
            arguments = $mcpArgs
        }
    } | ConvertTo-Json -Depth 5 -Compress

    # POST with 2s timeout - fire and forget
    try {
        Invoke-RestMethod -Uri 'http://localhost:3200' `
            -Method POST `
            -Body $payload `
            -ContentType 'application/json' `
            -TimeoutSec 2 `
            -ErrorAction SilentlyContinue | Out-Null
    } catch {
        # Silent - memory-mcp may not be running
    }

    # Auto-record pipeline stage result if a ralph-wiggum run is active.
    # Maps subagent_type → (stageName, position) so the orchestrator doesn't
    # have to call `pipeline stage` manually after every sub-agent.
    $pipelineStateFile = 'D:\learning-system\lats-active-pipeline.json'
    if (Test-Path $pipelineStateFile) {
        $stageMap = @{
            'skill-patternanalyzer' = @{ name = 'PatternAnalyzer'; pos = 0 }
            'skill-skillgenerator'  = @{ name = 'SkillGenerator';  pos = 1 }
            'skill-codereviewer'    = @{ name = 'CodeReviewer';    pos = 2 }
            'skill-testarchitect'   = @{ name = 'TestArchitect';   pos = 3 }
            'skill-securityauditor' = @{ name = 'SecurityAuditor'; pos = 4 }
            'skill-docswriter'      = @{ name = 'DocsWriter';      pos = 5 }
            'skill-qualitygate'     = @{ name = 'QualityGate';     pos = 6 }
            'skill-monitor'         = @{ name = 'Monitor';         pos = 7 }
        }
        $stageInfo = $stageMap[$subagentType.ToLower()]
        if ($stageInfo) {
            try {
                $ps = Get-Content $pipelineStateFile -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
                $runId = $ps.runId
                if ($runId) {
                    $CLI = 'node'
                    $CLIPath = 'C:\dev\packages\agent-lats\dist\cli.js'
                    $successStr = if ($success) { 'true' } else { 'false' }
                    $durationArg = if ($executionTimeMs) { $executionTimeMs } else { 0 }
                    $stageArgs = @($CLIPath, 'pipeline', 'stage',
                        '--run', $runId,
                        '--stage', $stageInfo.name,
                        '--position', $stageInfo.pos,
                        '--success', $successStr,
                        '--duration', $durationArg)
                    if (-not $success -and $errorMessage) {
                        $stageArgs += '--error', ($errorMessage.Substring(0, [Math]::Min(200, $errorMessage.Length)))
                    }
                    & $CLI @stageArgs 2>$null | Out-Null
                }
            } catch {}
        }
    }

    # Debug log (writes to D:\logs)
    $logDir = 'D:\logs\learning-system'
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $logLine = "[{0}] {1} ({2}) success={3} project={4} ms={5}" -f `
        (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $subagentType, $description, $success, $project, $executionTimeMs
    Add-Content -Path "$logDir\agent-executions.log" -Value $logLine -ErrorAction SilentlyContinue

} catch {
    # Silent failure - do NOT block the tool call
}

exit 0
