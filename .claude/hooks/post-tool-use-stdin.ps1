#!/usr/bin/env powershell
# Post-Tool-Use Hook (stdin-based) - MoltBot Integration with Learning System
# Reads JSON from stdin, logs tool results, writes to database

# Read JSON from stdin
$inputJson = [Console]::In.ReadToEnd()

# Configuration
$LearningSystemPath = "D:\learning-system"
$LogPath = "$LearningSystemPath\logs"
$PythonExe = "python" # System Python 3.13.5

# Ensure log directory exists
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

$LogFile = Join-Path $LogPath "tool-usage-$(Get-Date -Format 'yyyy-MM-dd').log"
$DebugFile = Join-Path $LogPath "tool-raw-json-$(Get-Date -Format 'yyyy-MM-dd').log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"

# Calculate execution duration if pre-hook stored start time
$executionTime = $null
if ($global:ToolStartTime) {
    $executionTime = ((Get-Date) - $global:ToolStartTime).TotalSeconds
}

# Try to parse JSON (non-blocking)
try {
    # Log raw JSON for debugging (first 500 chars)
    $rawJsonSample = if ($inputJson.Length -gt 500) { $inputJson.Substring(0, 500) + "..." } else { $inputJson }
    Add-Content -Path $DebugFile -Value "[$Timestamp] POST RAW JSON: $rawJsonSample" -ErrorAction SilentlyContinue

    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop

    # Extract result information with multiple strategies
    $success = $false
    $errorMessage = $null
    $toolName = "Unknown"

    # Determine success/failure
    if ($hookData.success -eq $true) { $success = $true }
    if ($hookData.status -eq "success") { $success = $true }
    if ($hookData.error -eq $null -or $hookData.error -eq "") { $success = $true }

    # Extract error if present
    if ($hookData.error) { $errorMessage = $hookData.error }
    if ($hookData.errorMessage) { $errorMessage = $hookData.errorMessage }
    if ($hookData.error_message) { $errorMessage = $hookData.error_message }

    # Try to get tool name from various sources
    if ($hookData.tool_name) { $toolName = $hookData.tool_name }
    if ($hookData.tool) { $toolName = $hookData.tool }
    if ($hookData.name) { $toolName = $hookData.name }
    if ($hookData.toolName) { $toolName = $hookData.toolName }

    # Fallback: Use pre-hook data if available
    if ($toolName -eq "Unknown" -and $global:PreHookData) {
        $toolName = $global:PreHookData.ToolName
    }

    # Get metadata from pre-hook or infer
    $sessionId = if ($global:PreHookData) { $global:PreHookData.SessionId } else { "Unknown" }
    $project = if ($global:PreHookData) { $global:PreHookData.Project } else { $null }
    $taskType = if ($global:PreHookData) { $global:PreHookData.TaskType } else { "unknown" }

    # Extract additional context
    if ($hookData.session_id) { $sessionId = $hookData.session_id }
    if ($hookData.sessionId) { $sessionId = $hookData.sessionId }
    if ($hookData.project) { $project = $hookData.project }

    # Infer project from cwd in JSON or workspace
    if (-not $project -and $hookData.cwd) {
        if ($hookData.cwd -match 'C:\\dev\\apps\\([^\\]+)') { $project = $matches[1] }
        elseif ($hookData.cwd -match 'C:\\dev\\packages\\([^\\]+)') { $project = $matches[1] }
        elseif ($hookData.cwd -match 'C:\\dev\\backend\\([^\\]+)') { $project = $matches[1] }
    }

    # Fallback to env:PWD
    if (-not $project -and $env:PWD) {
        if ($env:PWD -match 'C:\\dev\\apps\\([^\\]+)') { $project = $matches[1] }
        elseif ($env:PWD -match 'C:\\dev\\packages\\([^\\]+)') { $project = $matches[1] }
        elseif ($env:PWD -match 'C:\\dev\\backend\\([^\\]+)') { $project = $matches[1] }
    }

    # Log tool result to file
    $statusText = if ($success) { "SUCCESS" } else { "FAILED" }
    $LogEntry = "[$Timestamp] [POST-TOOL] Tool: $toolName | Status: $statusText | Duration: $executionTime`s | Session: $sessionId | Project: $project"
    Add-Content -Path $LogFile -Value $LogEntry -ErrorAction SilentlyContinue

    # Note: Per-tool learning DB writes superseded by record-agent-execution.ps1
    # (PostToolUse hook matching Agent tool). See .claude/hooks/record-agent-execution.ps1

} catch {
    # Log parsing error but don't block cleanup
    $ErrorMsg = $_.Exception.Message
    Add-Content -Path $DebugFile -Value "[$Timestamp] POST JSON PARSE ERROR: $ErrorMsg" -ErrorAction SilentlyContinue
}

# Clean up global state
$global:ToolStartTime = $null
$global:PreHookData = $null

# Exit successfully
exit 0
