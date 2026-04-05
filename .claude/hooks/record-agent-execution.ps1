#!/usr/bin/env powershell
# PostToolUse hook - records specialist agent (Agent tool) invocations to the learning DB
# Fires on ANY PostToolUse; exits early if tool_name != "Agent"
# Fire-and-forget: never blocks, never fails the tool call

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

    # Duration (if provided by the hook)
    $executionTimeMs = $null
    if ($hookData.duration_ms) { $executionTimeMs = [int]$hookData.duration_ms }
    elseif ($hookData.duration) { $executionTimeMs = [int]($hookData.duration * 1000) }

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
