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
            & node V:\monorepo\packages\agent-lats\dist\cli.js backpropagate `
                --node $state.nodeId --success true 2>$null
        }
        Remove-Item $stateFile -Force -ErrorAction SilentlyContinue
    }

    # Optional learning-system session archive (off by default)
    if ($env:SESSION_ARCHIVE_ON_STOP -eq '1') {
        $endSessionScript = 'D:\learning-system\sessions\scripts\end-session.ps1'
        if (Test-Path -LiteralPath $endSessionScript) {
            & pwsh -NoProfile -ExecutionPolicy Bypass -File $endSessionScript `
                -Agent 'Claude Code' `
                -Summary ("Session ended (reason={0})" -f $stopReason) `
                -ErrorAction SilentlyContinue 2>$null | Out-Null
        }
    }

    # Preview workspace orphan cleanup (dry-run unless PROCESS_CLEANUP_ON_STOP=force)
    $cleanupArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'V:\monorepo\scripts\cleanup-processes.ps1', '-Agents')
    if ($env:PROCESS_CLEANUP_ON_STOP -eq 'force') { $cleanupArgs += '-Force' }
    & pwsh @cleanupArgs 2>$null | Out-Null
} catch {}

exit 0
