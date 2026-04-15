#!/usr/bin/env powershell
# PostToolUse hook — runs LATS self-critique after Edit or Write on TypeScript files.
#
# Fires on every Edit/Write tool call.
# Exits early for non-TypeScript files (no-op on JS, py, md, etc.)
# Stores critique result to agent_learning.db self_critiques table.
# Prints a one-line summary to stdout so it appears in Claude's context.

$ErrorActionPreference = 'SilentlyContinue'

$inputJson = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($inputJson)) { exit 0 }

try {
    $hookData = $inputJson | ConvertFrom-Json -ErrorAction Stop
    $toolName = $hookData.tool_name

    # Only handle Edit and Write tools
    if ($toolName -notin @('Edit', 'Write')) { exit 0 }

    # Extract file path
    $filePath = $hookData.tool_input.file_path
    if ([string]::IsNullOrWhiteSpace($filePath)) { exit 0 }

    # Only critique TypeScript/TSX files
    if ($filePath -notmatch '\.(ts|tsx)$') { exit 0 }

    # Skip test files — mocks are allowed there
    if ($filePath -match '\.(test|spec)\.(ts|tsx)$') { exit 0 }
    if ($filePath -match '[\\/]__tests__[\\/]') { exit 0 }
    if ($filePath -match '[\\/]tests[\\/]') { exit 0 }

    # Resolve absolute path if relative
    if (-not [System.IO.Path]::IsPathRooted($filePath)) {
        $filePath = Join-Path ($hookData.cwd ?? (Get-Location).Path) $filePath
    }
    if (-not (Test-Path $filePath)) { exit 0 }

    # Determine if this is a new file (Write tool = new file)
    $newFileFlag = if ($toolName -eq 'Write') { '--new-file' } else { '' }

    # Get active LATS node ID if present
    $nodeFlag = ''
    $stateFile = 'D:\learning-system\lats-active-node.json'
    if (Test-Path $stateFile) {
        try {
            $state = Get-Content $stateFile -Raw | ConvertFrom-Json -ErrorAction Stop
            if ($state.nodeId) { $nodeFlag = "--node $($state.nodeId)" }
        } catch {}
    }

    # Run LATS critique (max 5s — fire and observe)
    $latsArgs = @('C:\dev\packages\agent-lats\dist\cli.js', 'critique', '--file', $filePath)
    if ($newFileFlag) { $latsArgs += $newFileFlag }
    if ($nodeFlag)    { $latsArgs += '--node'; $latsArgs += $state.nodeId }

    $result = & node @latsArgs 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0 -and $result) {
        # Echo the critique summary to stdout (appears in Claude's context)
        Write-Output ""
        Write-Output "── LATS Self-Critique ──────────────────────────────────"
        foreach ($line in $result) {
            Write-Output "  $line"
        }
        Write-Output "────────────────────────────────────────────────────────"
        Write-Output ""
    }

    # Log
    $logDir = 'D:\logs\learning-system'
    if (Test-Path $logDir) {
        $scoreMatch = ($result | Select-String -Pattern 'Score:\s+([\d.]+)').Matches.Value
        $logLine = "[{0}] critique {1} {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $filePath, $scoreMatch
        Add-Content -Path "$logDir\lats-critiques.log" -Value $logLine -ErrorAction SilentlyContinue
    }

} catch {
    # Silent — never block a tool call
}

exit 0
