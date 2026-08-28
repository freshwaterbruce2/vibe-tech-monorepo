#!/usr/bin/env pwsh
<#
.SYNOPSIS
    One-time bootstrap for the Power Cell NATO agent manager.

.DESCRIPTION
    Creates required directories on D:\, initialises D:\databases\agent_cells.json,
    and runs a doctor check to confirm prerequisites are met.

.EXAMPLE
    .\New-AgentCells.ps1
    .\New-AgentCells.ps1 -Force   # overwrite existing registry
#>

[CmdletBinding()]
param(
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RegistryPath  = 'D:\databases\agent_cells.json'
$InboxDir      = 'D:\temp\cell_inbox'
$StatusDir     = 'D:\databases\cell_status'   # durable — survives reboots
$LogDir        = 'D:\logs\agents'
$WorkerDir     = 'D:\temp\cell_workers'

function Write-Step {
    param([string]$Msg, [string]$Status = 'info')
    $colour = @{ info = 'Cyan'; ok = 'Green'; warn = 'Yellow'; err = 'Red' }[$Status]
    $prefix = @{ info = '  '; ok = '  OK'; warn = 'WARN'; err = ' ERR' }[$Status]
    Write-Host "[$prefix] $Msg" -ForegroundColor $colour
}

Write-Host ''
Write-Host '╔══════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║  Power Cell NATO  —  Bootstrap       ║' -ForegroundColor Cyan
Write-Host '╚══════════════════════════════════════╝' -ForegroundColor Cyan
Write-Host ''

# ── Prerequisite checks ──────────────────────────────────────────────────────

Write-Host 'Prerequisites' -ForegroundColor White
Write-Step "PowerShell $($PSVersionTable.PSVersion)"
if ($PSVersionTable.PSVersion.Major -lt 7) {
    Write-Step 'PowerShell 7+ required. Install via: winget install Microsoft.PowerShell' 'err'
    exit 1
}
Write-Step 'PS version OK' 'ok'

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Step 'claude CLI not found on PATH' 'err'
    Write-Step 'Install Claude Code: https://claude.ai/code' 'info'
    exit 1
}
Write-Step "claude found: $((Get-Command claude).Source)" 'ok'

try {
    # Test by writing into the actual target directory (D:\databases), not the root
    $testTarget = if (Test-Path 'D:\databases') { 'D:\databases' } else { 'D:\' }
    $testFile   = Join-Path $testTarget '_bootstrap_test_'
    $null = New-Item -Path $testFile -ItemType File -Force -ErrorAction Stop
    Remove-Item $testFile -ErrorAction SilentlyContinue
    Write-Step "D:\ drive writable (tested in $testTarget)" 'ok'
} catch {
    Write-Step "D:\ drive not writable: $($_.Exception.Message)" 'err'
    exit 1
}

# ── Create directories ────────────────────────────────────────────────────────

Write-Host ''
Write-Host 'Directories' -ForegroundColor White

foreach ($dir in @($InboxDir, $StatusDir, $LogDir, $WorkerDir)) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Step "Created $dir" 'ok'
    } else {
        Write-Step "Exists  $dir" 'ok'
    }
}

# ── Initialise registry ───────────────────────────────────────────────────────

Write-Host ''
Write-Host 'Registry' -ForegroundColor White

if ((Test-Path $RegistryPath) -and -not $Force) {
    Write-Step "Registry already exists: $RegistryPath" 'warn'
    Write-Step 'Use -Force to overwrite' 'info'
} else {
    $registry = [ordered]@{
        version   = '1.0'
        createdAt = (Get-Date -Format 'o')
        cells     = @()
    }
    $registry | ConvertTo-Json -Depth 5 | Set-Content -Path $RegistryPath -Encoding UTF8
    Write-Step "Created $RegistryPath" 'ok'
}

# ── Done ──────────────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '╔══════════════════════════════════════╗' -ForegroundColor Green
Write-Host '║  Bootstrap complete                  ║' -ForegroundColor Green
Write-Host '╚══════════════════════════════════════╝' -ForegroundColor Green
Write-Host ''
Write-Host 'Next steps:' -ForegroundColor White
Write-Host '  .\Manage-Agents.ps1 -Action start -Cell CELL_01' -ForegroundColor Gray
Write-Host '  .\Manage-Agents.ps1 -Action start -Cell CELL_02' -ForegroundColor Gray
Write-Host '  .\Manage-Agents.ps1 -Action list' -ForegroundColor Gray
Write-Host ''
