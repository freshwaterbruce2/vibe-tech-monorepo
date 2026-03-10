#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$scriptPath = 'C:\dev\scripts\monorepo-sync-audit.mjs'

if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "Nx audit script not found: $scriptPath"
}

Write-Host 'auto-inventory.ps1 is now a compatibility wrapper around the Nx-aware sync audit.' -ForegroundColor Yellow

$args = @($scriptPath, '--report-only')
if ($DryRun) {
    Write-Host '[DRY RUN] Generating inventory report without failing on workspace issues.' -ForegroundColor Yellow
}

node @args
