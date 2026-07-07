<#
.SYNOPSIS
  Scheduled watchdog for workspace orphan processes (Phase 3 stub).

.DESCRIPTION
  Calls cleanup-processes.ps1 -Agents with a higher age threshold.
  Dry-run by default; set PROCESS_CLEANUP_AUTO_FORCE=1 to kill matched processes.

.EXAMPLE
  .\watchdog-process-cleanup.ps1
  $env:PROCESS_CLEANUP_AUTO_FORCE='1'; .\watchdog-process-cleanup.ps1
#>
param(
    [int]$MinAgeMinutes = 120,
    [string]$LogDir = 'D:\logs\process-cleanup'
)

$ErrorActionPreference = 'SilentlyContinue'

$cleanupScript = Join-Path $PSScriptRoot 'cleanup-processes.ps1'
if (-not (Test-Path -LiteralPath $cleanupScript)) {
    Write-Host "Missing cleanup script: $cleanupScript" -ForegroundColor Red
    exit 1
}

$args = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $cleanupScript,
    '-Agents', '-MinAgeMinutes', $MinAgeMinutes, '-LogDir', $LogDir
)

if ($env:PROCESS_CLEANUP_AUTO_FORCE -eq '1') {
    $args += '-Force'
    Write-Host '[WATCHDOG] Force mode enabled via PROCESS_CLEANUP_AUTO_FORCE=1' -ForegroundColor Yellow
}
else {
    Write-Host '[WATCHDOG] Dry-run (set PROCESS_CLEANUP_AUTO_FORCE=1 to kill)' -ForegroundColor Yellow
}

& pwsh @args
exit $LASTEXITCODE
