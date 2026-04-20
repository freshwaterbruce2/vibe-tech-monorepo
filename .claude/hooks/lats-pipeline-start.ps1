#!/usr/bin/env powershell
# PreToolUse hook — Phase 4 shallow pipeline tracking: start a run.
#
# Fires before Agent tool calls. Detects skill-orchestrator / Ralph Wiggum invocations
# and opens a pipeline_runs record. Writes the runId to:
#   D:\learning-system\lats-active-pipeline.json
# so lats-pipeline-finish.ps1 and the orchestrator itself can reference it.

$ErrorActionPreference = 'SilentlyContinue'

$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop
    if ($hookData.tool_name -ne 'Agent') { exit 0 }

    # Stash start time for every Agent call so record-agent-execution.ps1
    # can compute execution_time_ms. Keyed by tool_use_id.
    $timingDir = 'D:\temp\agent-timings'
    if (-not (Test-Path $timingDir)) { New-Item -ItemType Directory -Path $timingDir -Force | Out-Null }
    $tuid = [string]$hookData.tool_use_id
    if ($tuid) {
        [DateTime]::UtcNow.ToString('o') | Set-Content -Path (Join-Path $timingDir "$tuid.txt") -Encoding ASCII -ErrorAction SilentlyContinue
    }

    $description = [string]($hookData.tool_input.description ?? '')
    $prompt      = [string]($hookData.tool_input.prompt ?? '')
    $subtype     = [string]($hookData.tool_input.subagent_type ?? '')
    $combined    = "$description $prompt $subtype"

    # Match orchestrator / pipeline patterns
    $isOrchestrator = $combined -match '(skill[_\-\s]orchestrat|ralph[_\-\s]wiggum|pipeline[_\-\s]run|skill[_\-\s]generat|generate[_\-\s]skill)' `
                   -or $subtype -eq 'skill-orchestrator'

    if (-not $isOrchestrator) { exit 0 }

    $CLI     = 'node'
    $CLIPath = 'C:\dev\packages\agent-lats\dist\cli.js'

    # Derive pipeline name — colon-syntax only ("pipeline:name") to avoid
    # matching "pipeline for ..." in natural-language task descriptions.
    $pipelineName = 'ralph-wiggum'
    if ($combined -match 'pipeline:(\w[\w\-]*)') { $pipelineName = $matches[1] }

    $task = if ($description) { $description } else { 'Skill generation pipeline' }

    $resultJson = (& $CLI $CLIPath pipeline start --pipeline $pipelineName --task $task --json 2>$null) -join "`n"
    if (-not $resultJson) { exit 0 }

    $result = $resultJson | ConvertFrom-Json -ErrorAction Stop
    $runId  = $result.runId
    if (-not $runId) { exit 0 }

    # Persist for finish hook + deep tracking
    $stateDir = 'D:\learning-system'
    if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Path $stateDir -Force | Out-Null }

    @{
        runId        = $runId
        pipelineName = $pipelineName
        startedAt    = (Get-Date -Format 'o')
        stageIndex   = 0
    } | ConvertTo-Json -Compress | Set-Content -Path "$stateDir\lats-active-pipeline.json" -Encoding UTF8

    Write-Host "[LATS P4] Pipeline run started: $runId ($pipelineName)"

} catch {
    exit 0
}
