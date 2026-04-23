#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'tmp\workspace-health-report.json')
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tmpDir = Join-Path $workspaceRoot 'tmp'
$databaseReportPath = Join-Path $tmpDir 'database-health-report.json'
$auditReportPath = Join-Path $tmpDir 'monorepo-sync-audit-report.json'
$environmentScript = Join-Path $PSScriptRoot 'Initialize-DevProcessEnvironment.ps1'

. $environmentScript
$null = Initialize-DevProcessEnvironment
Set-Location $workspaceRoot

function Invoke-Check {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    try {
        $global:LASTEXITCODE = 0
        & $Action | Out-Host
        return [pscustomobject]@{
            name = $Name
            success = $LASTEXITCODE -eq 0
            exitCode = if ($LASTEXITCODE) { $LASTEXITCODE } else { 0 }
        }
    } catch {
        return [pscustomobject]@{
            name = $Name
            success = $false
            exitCode = 1
            error = $_.Exception.Message
        }
    }
}

if (-not (Test-Path -LiteralPath $tmpDir)) {
    New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
}

$results = @(
    (Invoke-Check -Name 'paths' -Action { & (Join-Path $PSScriptRoot 'check-vibe-paths.ps1') }),
    (Invoke-Check -Name 'learning' -Action { & (Join-Path $PSScriptRoot 'validate-learning-system.ps1') }),
    (Invoke-Check -Name 'databases' -Action { & (Join-Path $PSScriptRoot 'database-health.ps1') -OutputPath $databaseReportPath }),
    (Invoke-Check -Name 'sync-audit' -Action { node (Join-Path $PSScriptRoot 'monorepo-sync-audit.mjs') --report-only })
)

$report = [ordered]@{
    generatedAt = (Get-Date).ToString('s')
    reportFiles = [ordered]@{
        databaseHealth = $databaseReportPath
        syncAudit = $auditReportPath
    }
    checks = $results
}

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$report | ConvertTo-Json -Depth 6 | Set-Content -Path $OutputPath -Encoding UTF8

Write-Host "`nWorkspace Health Summary" -ForegroundColor Cyan
foreach ($result in $results) {
    $status = if ($result.success) { 'OK' } else { 'FAIL' }
    $color = if ($result.success) { 'Green' } else { 'Red' }
    Write-Host "  $status  $($result.name)" -ForegroundColor $color
}
Write-Host "  Report: $OutputPath"

if (@($results | Where-Object { -not $_.success }).Count -gt 0) {
    exit 1
}
