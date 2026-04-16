#!/usr/bin/env powershell
# PostToolUse hook — Phase 4 shallow pipeline tracking: finish a run.
#
# Fires after Agent tool calls. Reads the active pipeline state written by
# lats-pipeline-start.ps1, closes the run, and surfaces ordering suggestions
# when enough history has accumulated (>= 5 runs).

$ErrorActionPreference = 'SilentlyContinue'

$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop
    if ($hookData.tool_name -ne 'Agent') { exit 0 }

    $stateFile = 'D:\learning-system\lats-active-pipeline.json'
    if (-not (Test-Path $stateFile)) { exit 0 }

    $state = Get-Content $stateFile -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
    $runId = $state.runId
    if (-not $runId) { exit 0 }

    $CLI     = 'node'
    $CLIPath = 'C:\dev\packages\agent-lats\dist\cli.js'

    # Infer success from tool response content
    $responseContent = ''
    if ($hookData.tool_response) {
        $responseContent = [string]($hookData.tool_response.content ?? $hookData.tool_response ?? '')
    }
    $success = $true
    if ($hookData.tool_response.is_error -eq $true) { $success = $false }
    elseif ($hookData.error) { $success = $false }
    elseif ($responseContent -match '\b(error|fail(ed|ure)?|crash(ed)?|exception|abort)\b' -and
            $responseContent -notmatch '\bsuccess\b') {
        $success = $false
    }

    $successStr = if ($success) { 'true' } else { 'false' }

    & $CLI $CLIPath pipeline finish --run $runId --success $successStr 2>$null | Out-Null

    Remove-Item $stateFile -Force -ErrorAction SilentlyContinue

    Write-Host "[LATS P4] Pipeline $runId finished (success=$successStr)"

    # Surface top ordering suggestion when we have enough history
    $suggestJson = (& $CLI $CLIPath pipeline suggest --pipeline ($state.pipelineName) --limit 1 --json 2>$null) -join "`n"
    if ($suggestJson) {
        $suggestions = $suggestJson | ConvertFrom-Json -ErrorAction Stop
        if ($suggestions -and $suggestions.Count -gt 0) {
            $top   = $suggestions[0]
            $delta = [math]::Round([double]$top.delta * 100, 1)
            if ($delta -gt 0.5) {
                $orderStr = ($top.ordering -join ' → ')
                Write-Host "[LATS P4] Suggestion: try ordering [$orderStr] → expected +$delta% success rate"
            }
        }
    }

} catch {
    exit 0
}
