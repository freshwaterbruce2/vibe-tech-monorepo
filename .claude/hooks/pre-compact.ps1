#!/usr/bin/env powershell
# Pre-Compact Hook — fires before Claude Code compresses context window.
# Saves a compact checkpoint via the shared memory lifecycle script.

$ErrorActionPreference = 'SilentlyContinue'

$raw = [Console]::In.ReadToEnd()

try {
    $d = $raw | ConvertFrom-Json -ErrorAction Stop
    $toolName = if ($d.tool_name) { $d.tool_name } else { 'unknown' }

    # Call memory-compact.cjs to save task state before context loss
    $CompactScript = "V:\monorepo\scripts\memory-compact.cjs"
    if (Test-Path $CompactScript) {
        & node $CompactScript `
            --task "Context compaction triggered by $toolName" `
            --decisions "See active context in memory-bank/activeContext.md" `
            --remaining "In progress — resumed after compaction" `
            --blockers "" 2>$null
    }
} catch {}

exit 0
