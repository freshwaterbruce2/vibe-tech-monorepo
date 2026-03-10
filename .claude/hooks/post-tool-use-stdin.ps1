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

    # Write to learning database via Python (non-blocking, fire-and-forget)
    if ($executionTime -ne $null) {
        $pythonScript = @"
import sys
import json
sys.path.insert(0, r'$LearningSystemPath')
from learning_engine import SimpleLearningEngine

try:
    engine = SimpleLearningEngine()
    engine.learn_from_execution(
        agent_name='claude-code',
        task_type='$taskType',
        success=$($success.ToString().ToLower()),
        tools_used=['$toolName'],
        execution_time=$executionTime,
        error_message=$(if ($errorMessage) { "'$($errorMessage -replace "'", "\'")'" } else { "None" }),
        project=$(if ($project) { "'$project'" } else { "None" })
    )
except Exception as e:
    # Silent failure - don't block hook
    pass
"@

        # Execute Python asynchronously (don't wait for completion)
        $pythonScriptPath = Join-Path $env:TEMP "learning_hook_$((Get-Date).Ticks).py"
        $pythonScript | Out-File -FilePath $pythonScriptPath -Encoding UTF8 -Force

        Start-Process -FilePath $PythonExe -ArgumentList $pythonScriptPath -WindowStyle Hidden -NoNewWindow -ErrorAction SilentlyContinue

        # Cleanup temp script after 5 seconds (background job)
        Start-Job -ScriptBlock {
            param($path)
            Start-Sleep -Seconds 5
            Remove-Item -Path $path -Force -ErrorAction SilentlyContinue
        } -ArgumentList $pythonScriptPath | Out-Null
    }

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
