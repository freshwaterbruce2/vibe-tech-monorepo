#!/usr/bin/env powershell
# Pre-Tool-Use Hook (stdin-based) - MoltBot Integration with Learning System
# Reads JSON from stdin, logs tool usage, writes to database, and allows execution

# Read JSON from stdin
$inputJson = [Console]::In.ReadToEnd()

# Configuration
$LearningSystemPath = "D:\learning-system"
$LogPath = "$LearningSystemPath\logs"

# Ensure log directory exists
if (-not (Test-Path $LogPath)) {
    New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
}

$LogFile = Join-Path $LogPath "tool-usage-$(Get-Date -Format 'yyyy-MM-dd').log"
$DebugFile = Join-Path $LogPath "tool-raw-json-$(Get-Date -Format 'yyyy-MM-dd').log"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"

# Store start time for execution duration tracking
$global:ToolStartTime = Get-Date

# Try to parse JSON (non-blocking)
try {
    # Log raw JSON for debugging (first 500 chars to avoid massive logs)
    $rawJsonSample = if ($inputJson.Length -gt 500) { $inputJson.Substring(0, 500) + "..." } else { $inputJson }
    Add-Content -Path $DebugFile -Value "[$Timestamp] RAW JSON: $rawJsonSample" -ErrorAction SilentlyContinue

    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop

    # Extract tool information with multiple fallback strategies
    $toolName = "Unknown"
    $sessionId = "Unknown"
    $project = $null
    $taskType = $null

    # Strategy 1: Direct properties
    if ($hookData.tool_name) { $toolName = $hookData.tool_name }
    if ($hookData.tool) { $toolName = $hookData.tool }
    if ($hookData.name) { $toolName = $hookData.name }
    if ($hookData.toolName) { $toolName = $hookData.toolName }

    # Strategy 2: Nested in toolUse or tool_use
    if ($hookData.toolUse -and $hookData.toolUse.name) { $toolName = $hookData.toolUse.name }
    if ($hookData.tool_use -and $hookData.tool_use.name) { $toolName = $hookData.tool_use.name }

    # Strategy 3: Input parameters
    if ($hookData.input -and $hookData.input.tool) { $toolName = $hookData.input.tool }

    # Extract session/context information
    if ($hookData.session_id) { $sessionId = $hookData.session_id }
    if ($hookData.sessionId) { $sessionId = $hookData.sessionId }
    if ($hookData.conversationId) { $sessionId = $hookData.conversationId }

    # Extract project context
    if ($hookData.cwd -and $hookData.cwd -match 'C:\\dev\\apps\\([^\\]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -and $hookData.cwd -match 'C:\\dev\\packages\\([^\\]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -and $hookData.cwd -match 'C:\\dev\\backend\\([^\\]+)') { $project = $matches[1] }
    if ($hookData.project) { $project = $hookData.project }
    if ($hookData.workspace) { $project = $hookData.workspace }

    # Infer task type from tool name
    $taskType = switch -Regex ($toolName) {
        "^(Read|Glob|Grep)" { "code_exploration" }
        "^(Write|Edit)" { "code_modification" }
        "^(Bash|Execute)" { "command_execution" }
        "^(Task)" { "task_management" }
        default { "unknown" }
    }

    # Store metadata globally for post-hook access
    $global:PreHookData = @{
        ToolName = $toolName
        SessionId = $sessionId
        Project = $project
        TaskType = $taskType
        Timestamp = $Timestamp
    }

    # Log tool usage to file
    $LogEntry = "[$Timestamp] [PRE-TOOL] Tool: $toolName | Session: $sessionId | Project: $project | Task: $taskType"
    Add-Content -Path $LogFile -Value $LogEntry -ErrorAction SilentlyContinue

} catch {
    # Log parsing error but don't block execution
    $ErrorMsg = $_.Exception.Message
    Add-Content -Path $DebugFile -Value "[$Timestamp] JSON PARSE ERROR: $ErrorMsg" -ErrorAction SilentlyContinue
}

# Exit successfully (allow tool execution)
# Exit 0 = allow, Exit 2 = block
exit 0
