#!/usr/bin/env powershell
# Simulates PostToolUse hook payloads for the Agent tool.
# Pipes them into record-agent-execution.ps1 and verifies the DB rows were written.

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$hookPath = Join-Path $repoRoot '.claude\hooks\record-agent-execution.ps1'
$dbPath = 'D:\databases\agent_learning.db'

function Invoke-HookCase {
    param(
        [string]$ExpectedAgentId,
        [string]$Description,
        [string]$Prompt,
        [Nullable[int]]$DurationMs,
        [string]$SubagentType
    )

    $toolInput = @{
        description = $Description
        prompt = $Prompt
    }
    if (-not [string]::IsNullOrWhiteSpace($SubagentType)) {
        $toolInput.subagent_type = $SubagentType
    }

    $hookPayload = @{
        tool_name = 'Agent'
        tool_input = $toolInput
        tool_response = @{
            is_error = $false
        }
        cwd = 'C:\dev\apps\memory-mcp'
    }
    if ($null -ne $DurationMs) {
        $hookPayload.duration_ms = $DurationMs
    }

    Write-Host "Sending synthetic Agent PostToolUse payload for '$ExpectedAgentId'..."
    ($hookPayload | ConvertTo-Json -Depth 5 -Compress) |
        & pwsh -NoProfile -ExecutionPolicy Bypass -File $hookPath

    Write-Host "Waiting 1s for HTTP write to complete..."
    Start-Sleep -Seconds 1

    Write-Host "Checking $dbPath for synthetic row..."
    $query = "SELECT agent_id || '|' || task_type || '|' || success || '|' || COALESCE(execution_time_ms,'<null>') || '|' || COALESCE(project_name,'<null>') FROM agent_executions WHERE agent_id = '$ExpectedAgentId' AND task_type = '$Description' ORDER BY started_at DESC LIMIT 1;"
    $result = sqlite3 $dbPath $query

    if (-not $result) {
        Write-Host "FAIL: No row found for agent_id='$ExpectedAgentId'" -ForegroundColor Red
        Write-Host 'Check D:\logs\learning-system\agent-executions.log for hook output'
        Write-Host 'Check that memory-mcp is running on port 3200'
        exit 1
    }

    Write-Host "PASS: Row written: $result" -ForegroundColor Green
}

sqlite3 $dbPath "DELETE FROM agent_executions WHERE agent_id IN ('test-harness-agent', 'general-purpose') AND task_type IN ('Dry-run test of recording hook', 'Fallback agent test of recording hook');" | Out-Null

Invoke-HookCase `
    -ExpectedAgentId 'test-harness-agent' `
    -Description 'Dry-run test of recording hook' `
    -Prompt 'This is a synthetic prompt used only for hook testing.' `
    -DurationMs 1234 `
    -SubagentType 'test-harness-agent'

Invoke-HookCase `
    -ExpectedAgentId 'general-purpose' `
    -Description 'Fallback agent test of recording hook' `
    -Prompt 'This prompt verifies the fallback when subagent_type is omitted.' `
    -DurationMs $null `
    -SubagentType $null

Write-Host 'Cleaning up synthetic rows...'
sqlite3 $dbPath "DELETE FROM agent_executions WHERE agent_id IN ('test-harness-agent', 'general-purpose') AND task_type IN ('Dry-run test of recording hook', 'Fallback agent test of recording hook');" | Out-Null

Write-Host "PASS" -ForegroundColor Green
exit 0
