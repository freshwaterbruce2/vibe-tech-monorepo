<#
.SYNOPSIS
  Kills duplicate/stale Node and Python processes from MCP servers and dev tools.
  Keeps only the NEWEST instance of each MCP server type.

.PARAMETER DryRun
  Show what would be killed without actually killing anything.

.PARAMETER All
  Kill ALL node/python dev processes (nuclear option).

.EXAMPLE
  .\cleanup-processes.ps1              # Smart cleanup (keep 1 of each)
  .\cleanup-processes.ps1 -DryRun      # Preview what would be killed
  .\cleanup-processes.ps1 -All         # Kill everything
#>
param(
    [switch]$DryRun,
    [switch]$All
)

$ErrorActionPreference = "SilentlyContinue"

function Get-McpType($cmd) {
    if (!$cmd) { return "unknown" }
    $map = @{
        '*cloud-run-mcp*'         = 'cloudrun-mcp'
        '*firebase*mcp*'          = 'firebase-mcp'
        '*genkit*'                = 'genkit-mcp'
        '*sequential-thinking*'   = 'sequential-thinking'
        '*playwright*mcp*'        = 'playwright-mcp'
        '*desktop-commander*'     = 'desktop-commander'
        '*neon*'                  = 'neon-mcp'
        '*perplexity*'            = 'perplexity-mcp'
        '*nx-mcp*'                = 'nx-mcp'
        '*nx.js*mcp*'             = 'nx-mcp'
        '*arize*'                 = 'arize-mcp'
        '*notebooklm*'            = 'notebooklm-mcp'
        '*mcp-skills*'            = 'skills-mcp'
        '*filesystem*'            = 'filesystem-mcp'
        '*feature-flags*server*'  = 'ff-server'
        '*run-executor*'          = 'nx-executor'
        '*server.mjs*'            = 'dev-server'
    }
    foreach ($pattern in $map.Keys) {
        if ($cmd -like $pattern) { return $map[$pattern] }
    }
    return "other"
}

Write-Host "=== Process Cleanup ===" -ForegroundColor Cyan
if ($DryRun) { Write-Host "[DRY RUN] No processes will be killed" -ForegroundColor Yellow }

# --- Node Processes ---
$nodeProcs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
    Select-Object ProcessId, CreationDate, CommandLine |
    ForEach-Object {
        [PSCustomObject]@{
            PID     = $_.ProcessId
            Created = $_.CreationDate
            Type    = Get-McpType $_.CommandLine
            Cmd     = $_.CommandLine
        }
    }

$toKill = @()

if ($All) {
    $toKill += $nodeProcs
} else {
    # Group by type, keep only the newest of each
    $grouped = $nodeProcs | Group-Object Type
    foreach ($group in $grouped) {
        if ($group.Count -gt 1) {
            $sorted = $group.Group | Sort-Object Created -Descending
            # Keep the newest, kill the rest
            $toKill += $sorted | Select-Object -Skip 1
        }
    }

    # Always kill stale nx-executors and npx wrappers
    $toKill += $nodeProcs | Where-Object { $_.Type -in @('nx-executor', 'other') }
    $toKill = $toKill | Select-Object -Unique -Property PID, Type
}

$nodeKilled = 0
foreach ($proc in $toKill) {
    if ($DryRun) {
        Write-Host "  [WOULD KILL] Node PID $($proc.PID) ($($proc.Type))" -ForegroundColor DarkYellow
    } else {
        Stop-Process -Id $proc.PID -Force -ErrorAction SilentlyContinue
    }
    $nodeKilled++
}

# --- Python Processes ---
$pyProcs = Get-CimInstance Win32_Process -Filter "Name='python.exe'" |
    Select-Object ProcessId, CreationDate, CommandLine

$pyToKill = @()

if ($All) {
    $pyToKill = $pyProcs
} else {
    # Kill UV cache workers (temporary, should not persist)
    $pyToKill += $pyProcs | Where-Object { $_.CommandLine -like '*uv\cache\archive*' }

    # Kill stuck notebooklm login processes
    $pyToKill += $pyProcs | Where-Object { $_.CommandLine -like '*notebooklm*login*' }

    # For MCP Python servers, keep only newest of each type
    $mcpPy = $pyProcs | Where-Object {
        $_.CommandLine -like '*notebooklm-mcp*' -or
        $_.CommandLine -like '*arize*'
    }
    $pyGrouped = $mcpPy | Group-Object { if ($_.CommandLine -like '*notebooklm*') {'nbm'} else {'arize'} }
    foreach ($group in $pyGrouped) {
        if ($group.Count -gt 1) {
            $sorted = $group.Group | Sort-Object CreationDate -Descending
            $pyToKill += $sorted | Select-Object -Skip 1
        }
    }
}

$pyKilled = 0
foreach ($proc in $pyToKill) {
    if ($DryRun) {
        Write-Host "  [WOULD KILL] Python PID $($proc.ProcessId)" -ForegroundColor DarkYellow
    } else {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
    $pyKilled++
}

# --- Summary ---
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
$verb = if ($DryRun) { "Would kill" } else { "Killed" }
Write-Host "  $verb $nodeKilled Node processes"
Write-Host "  $verb $pyKilled Python processes"

if (-not $DryRun) {
    Start-Sleep -Seconds 1
    $remaining = (Get-Process node -ErrorAction SilentlyContinue).Count
    $pyRemaining = (Get-Process python -ErrorAction SilentlyContinue).Count
    Write-Host "  Remaining: $remaining Node, $pyRemaining Python" -ForegroundColor Green
}
