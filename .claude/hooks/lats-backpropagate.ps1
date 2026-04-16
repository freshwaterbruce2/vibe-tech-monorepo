#!/usr/bin/env powershell
# PostToolUse hook — auto-backpropagates LATS outcomes after Agent tool calls.
#
# How it works:
#   1. Fires after every Agent tool call (exits early for other tools)
#   2. Looks for an active LATS state file: D:\learning-system\lats-active-node.json
#   3. Records actual success/failure back to agent_learning.db via the LATS CLI
#   4. Cleans up the state file
#
# The state file is written by any agent that calls:
#   node C:\dev\packages\agent-lats\dist\cli.js plan ...
# and then saves the nodeId to D:\learning-system\lats-active-node.json

$ErrorActionPreference = 'SilentlyContinue'

$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop

    # Only handle Agent tool — bail on everything else
    if ($hookData.tool_name -ne 'Agent') { exit 0 }

    # Determine success from the tool response
    $success = $true
    if ($hookData.tool_response.is_error -eq $true) { $success = $false }
    if ($hookData.error) { $success = $false }
    $successStr = if ($success) { 'true' } else { 'false' }

    # Extract agent details
    $agentId = $hookData.tool_input.subagent_type
    if ([string]::IsNullOrWhiteSpace($agentId)) { $agentId = 'unknown-agent' }

    $project = $null
    if ($hookData.cwd -match 'apps[\\/]([^\\/]+)') { $project = $matches[1] }
    elseif ($hookData.cwd -match 'packages[\\/]([^\\/]+)') { $project = $matches[1] }

    # Check for active LATS node
    $StateFile = 'D:\learning-system\lats-active-node.json'
    if (-not (Test-Path $StateFile)) { exit 0 }

    $state = Get-Content $StateFile -Raw | ConvertFrom-Json -ErrorAction Stop
    $nodeId = $state.nodeId
    if ([string]::IsNullOrWhiteSpace($nodeId)) { exit 0 }

    # Build CLI args
    $latsArgs = @(
        'C:\dev\packages\agent-lats\dist\cli.js',
        'backpropagate',
        '--node', $nodeId,
        '--success', $successStr
    )
    if ($agentId) { $latsArgs += '--agent', $agentId }
    if ($project)  { $latsArgs += '--project', $project }

    # Add failure reflection if available
    if (-not $success) {
        $errorMsg = ''
        if ($hookData.error) { $errorMsg = $hookData.error }
        elseif ($hookData.tool_response.content) { $errorMsg = ($hookData.tool_response.content | Out-String).Trim() }
        if ($errorMsg.Length -gt 0) {
            $latsArgs += '--reflection', ($errorMsg.Substring(0, [Math]::Min(400, $errorMsg.Length)))
        }
    }

    # Run backpropagation CLI (fire-and-forget, 3s timeout)
    $proc = Start-Process -FilePath 'node' `
        -ArgumentList $latsArgs `
        -NoNewWindow -PassThru -ErrorAction SilentlyContinue
    if ($proc) { $proc.WaitForExit(3000) | Out-Null }

    # Phase 2: Agent Q assessment — aggregate per-file critique scores into quality signal.
    # Fires after backpropagation so the quality score overwrites the binary value in mcts_nodes.
    $assessArgs = @('C:\dev\packages\agent-lats\dist\cli.js', 'assess', '--node', $nodeId, '--json')
    $assessOutput = & node @assessArgs 2>$null
    $qualityBand = ''
    if ($assessOutput) {
        try {
            $assessResult = $assessOutput | ConvertFrom-Json -ErrorAction Stop
            if ($assessResult.qualityScore) {
                $qualityBand = " quality=$($assessResult.qualityScore.ToString('F3')) [$($assessResult.qualityBand)]"
            }
        } catch {}
    }

    # Clean up the state file so next agent starts fresh
    Remove-Item $StateFile -Force -ErrorAction SilentlyContinue

    # Log to learning system
    $logDir = 'D:\logs\learning-system'
    if (Test-Path $logDir) {
        $logLine = "[{0}] lats-backpropagate node={1} success={2} agent={3} project={4}{5}" -f `
            (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $nodeId, $successStr, $agentId, $project, $qualityBand
        Add-Content -Path "$logDir\lats-backpropagate.log" -Value $logLine -ErrorAction SilentlyContinue
    }

} catch {
    # Silent failure — never block the tool call
}

exit 0
