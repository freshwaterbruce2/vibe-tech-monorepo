#!/usr/bin/env pwsh
# Learning Engine Hook - fires learning_engine.py for ALL tool executions
# Runs as a PostToolUse hook, captures tool name, success, timing, project
# Fire-and-forget: launches Python as a background job, never blocks

$ErrorActionPreference = 'SilentlyContinue'
$inputJson = [Console]::In.ReadToEnd()

if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop

    # Skip if no tool_name (malformed hook data)
    $toolName = $hookData.tool_name
    if ([string]::IsNullOrWhiteSpace($toolName)) { exit 0 }

    # Skip Agent tool - already handled by record-agent-execution.ps1
    if ($toolName -eq 'Agent') { exit 0 }

    # Determine success
    $success = 'True'
    $errorMsg = ''
    if ($hookData.tool_response.is_error -eq $true) {
        $success = 'False'
        $errorMsg = 'Tool returned error'
    }
    if ($hookData.error) {
        $success = 'False'
        $errorMsg = $hookData.error
    }

    # Extract timing
    $execTimeMs = 0
    if ($hookData.duration_ms) { $execTimeMs = [int]$hookData.duration_ms }
    elseif ($hookData.duration) { $execTimeMs = [int]($hookData.duration * 1000) }

    # Infer project from cwd
    $project = ''
    if ($hookData.cwd -match 'V:\\monorepo\\apps\\([^\\]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -match 'V:\\monorepo\\packages\\([^\\]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -match 'V:\\monorepo\\backend\\([^\\]+)') { $project = $matches[1] }

    # Extract context snippet from tool_input
    $context = ''
    if ($hookData.tool_input) {
        $inputStr = $hookData.tool_input | ConvertTo-Json -Depth 2 -Compress -ErrorAction SilentlyContinue
        if ($inputStr) {
            $context = $inputStr.Substring(0, [Math]::Min(500, $inputStr.Length))
        }
    }

    # Build Python one-liner to call learning_engine.py
    # Uses the SimpleLearningEngine.learn_from_execution() method
    $pyScript = @"
import sys
sys.path.insert(0, r'D:\learning-system')
from learning_engine import SimpleLearningEngine
engine = SimpleLearningEngine()
engine.learn_from_execution(
    agent_name='antigravity',
    task_type='$($toolName -replace "'", "")',
    success=$success,
    tools_used=['$($toolName -replace "'", "")'],
    execution_time=$([Math]::Round($execTimeMs / 1000.0, 3)),
    project='$($project -replace "'", "")',
    context='$($context -replace "'", "" -replace "`n", " " -replace "`r", "")',
    error_message=None if '$($errorMsg -replace "'", "")' == '' else '$($errorMsg -replace "'", "")'
)
"@

    # Fire-and-forget: run Python in background, timeout 3s
    $pyScriptBytes = [System.Text.Encoding]::UTF8.GetBytes($pyScript)
    $pyScriptB64 = [Convert]::ToBase64String($pyScriptBytes)
    $decodedCmd = "import base64,sys;exec(base64.b64decode('$pyScriptB64').decode())"

    Start-Process -FilePath 'python' `
        -ArgumentList '-c', "`"$decodedCmd`"" `
        -WindowStyle Hidden `
        -ErrorAction SilentlyContinue

} catch {
    # Silent failure - never block the tool call
}

exit 0
