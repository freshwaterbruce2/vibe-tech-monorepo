#!/usr/bin/env powershell
# Stop hook — fires when Claude ends a session.
# Logs session end and flushes any open LATS active-node state.

$ErrorActionPreference = 'SilentlyContinue'

$raw = [Console]::In.ReadToEnd()
$logDir = 'D:\logs\learning-system'

try {
    $d = $raw | ConvertFrom-Json -ErrorAction Stop
    $stopReason = if ($d.stop_reason) { $d.stop_reason } else { 'unknown' }

    # Log session end
    if (Test-Path $logDir) {
        $logLine = '[{0}] session-stop reason={1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $stopReason
        Add-Content -Path "$logDir\session-lifecycle.log" -Value $logLine -ErrorAction SilentlyContinue
    }

    # Flush any open LATS active-node (backpropagate as success if session ended cleanly)
    $stateFile = 'D:\learning-system\lats-active-node.json'
    if (Test-Path $stateFile) {
        $state = Get-Content $stateFile -Raw | ConvertFrom-Json -ErrorAction Stop
        if ($state.nodeId) {
            & node C:\dev\packages\agent-lats\dist\cli.js backpropagate `
                --node $state.nodeId --success true 2>$null
        }
        Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
    }
} catch {}

exit 0
