#!/usr/bin/env powershell
# Simulates a PostToolUse hook payload for the Agent tool
# Pipes it into record-agent-execution.ps1 and verifies the DB row was written

$ErrorActionPreference = 'Stop'

$hookPayload = @{
    tool_name = 'Agent'
    tool_input = @{
        subagent_type = 'test-harness-agent'
        description = 'Dry-run test of recording hook'
        prompt = 'This is a synthetic prompt used only for hook testing.'
    }
    tool_response = @{
        is_error = $false
    }
    cwd = 'C:\dev\apps\memory-mcp'
    duration_ms = 1234
} | ConvertTo-Json -Depth 5 -Compress

Write-Host "Sending synthetic Agent PostToolUse payload to hook..."
$hookPayload | & powershell -NoProfile -ExecutionPolicy Bypass -File C:\dev\.claude\hooks\record-agent-execution.ps1

Write-Host "Waiting 1s for HTTP write to complete..."
Start-Sleep -Seconds 1

Write-Host "Checking D:\databases\agent_learning.db for synthetic row..."
$result = sqlite3 D:\databases\agent_learning.db "SELECT agent_id || '|' || task_type || '|' || success || '|' || execution_time_ms || '|' || COALESCE(project_name,'<null>') FROM agent_executions WHERE agent_id = 'test-harness-agent' ORDER BY started_at DESC LIMIT 1;"

if ($result) {
    Write-Host "PASS: Row written: $result" -ForegroundColor Green
} else {
    Write-Host "FAIL: No row found for agent_id='test-harness-agent'" -ForegroundColor Red
    Write-Host "Check D:\logs\learning-system\agent-executions.log for hook output"
    Write-Host "Check that memory-mcp is running on port 3200"
    exit 1
}

Write-Host "Cleaning up synthetic row..."
sqlite3 D:\databases\agent_learning.db "DELETE FROM agent_executions WHERE agent_id = 'test-harness-agent';" | Out-Null

Write-Host "PASS" -ForegroundColor Green
exit 0
