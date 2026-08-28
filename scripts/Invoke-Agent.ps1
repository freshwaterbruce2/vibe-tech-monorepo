#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Dispatch a task to the first available Power Cell NATO agent.

.DESCRIPTION
    Finds an idle agent cell (by checking D:\databases\cell_status and live PID),
    then assigns the task via Manage-Agents.ps1.

    Run .\New-AgentCells.ps1 once and start at least one cell before using this script.

.PARAMETER Task
    The task text to dispatch.

.PARAMETER Force
    Skip the confirmation prompt.

.EXAMPLE
    .\Invoke-Agent.ps1 "Check lint errors in apps/vibe-shop"
    .\Invoke-Agent.ps1 "List TypeScript errors in apps/vibe-tutor" -Force

.NOTES
    Alias: agent "..."  (if you have an alias set in your PowerShell profile)
#>

param(
    [Parameter(Mandatory, Position = 0)]
    [string]$Task,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RegistryPath = 'D:\databases\agent_cells.json'
$StatusDir    = 'D:\databases\cell_status'
$ManageScript = Join-Path $PSScriptRoot 'Manage-Agents.ps1'

function Test-PidAlive {
    param([int]$ProcessId)
    if ($ProcessId -le 0) { return $false }
    try { $null = Get-Process -Id $ProcessId -ErrorAction Stop; return $true } catch { return $false }
}

Write-Host ''
Write-Host '  Power Cell NATO  —  Agent Dispatcher' -ForegroundColor Cyan
Write-Host '  ────────────────────────────────────' -ForegroundColor DarkGray
Write-Host ''

# ── Prerequisite checks ───────────────────────────────────────────────────────

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host '  [!!] claude not on PATH. Install Claude Code from https://claude.ai/code' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ManageScript)) {
    Write-Host "  [!!] Manage-Agents.ps1 not found at: $ManageScript" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $RegistryPath)) {
    Write-Host '  [!!] Registry not found. Bootstrap first:' -ForegroundColor Red
    Write-Host '       .\New-AgentCells.ps1' -ForegroundColor Gray
    Write-Host '       .\Manage-Agents.ps1 -Action start -Cell CELL_01' -ForegroundColor Gray
    exit 1
}

# ── Find idle cell ────────────────────────────────────────────────────────────

$registry = Get-Content $RegistryPath -Raw | ConvertFrom-Json
$idleCell = $null

foreach ($cell in @($registry.cells)) {
    # Worker must be a live process
    $procPid = [int]($cell.pid ?? 0)
    if (-not (Test-PidAlive $procPid)) { continue }

    # Live status file must say 'idle' (worker writes this every 30s)
    $liveFile   = Join-Path $StatusDir "$($cell.name).json"
    $liveStatus = 'unknown'
    if (Test-Path $liveFile) {
        try { $liveStatus = (Get-Content $liveFile -Raw | ConvertFrom-Json).status } catch {}
    }

    if ($liveStatus -eq 'idle') {
        $idleCell = $cell.name
        break
    }
}

if (-not $idleCell) {
    $total = @($registry.cells).Count
    Write-Host "  [!!] No idle cells available ($total registered)." -ForegroundColor Yellow
    Write-Host '       Check status: .\Manage-Agents.ps1 -Action list' -ForegroundColor Gray
    Write-Host '       Start a cell: .\Manage-Agents.ps1 -Action start -Cell CELL_01' -ForegroundColor Gray
    exit 1
}

# ── Confirm and dispatch ──────────────────────────────────────────────────────

$workingDir = (Get-Location).Path
$fullTask   = "$Task  [cwd: $workingDir]"

Write-Host "  Task   : $Task" -ForegroundColor White
Write-Host "  Context: $workingDir" -ForegroundColor DarkGray
Write-Host "  Cell   : $idleCell" -ForegroundColor DarkGray
Write-Host ''

if (-not $Force) {
    Write-Host '  Dispatch? [Y/N]: ' -ForegroundColor Yellow -NoNewline
    $confirm = Read-Host
    if ($confirm -notmatch '^[Yy]') {
        Write-Host '  Cancelled.' -ForegroundColor DarkGray
        exit 0
    }
}

& $ManageScript -Action assign -Cell $idleCell -Task $fullTask

Write-Host ''
Write-Host "  Monitor: .\Manage-Agents.ps1 -Action monitor -Cell $idleCell -Follow" -ForegroundColor DarkGray
Write-Host ''
