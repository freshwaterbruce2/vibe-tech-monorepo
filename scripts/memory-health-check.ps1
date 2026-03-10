#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string]$DatabasePath = 'D:\databases\memory.db',
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'tmp\memory-health-report.json'),
    [switch]$IncludeIntegrityCheck
)

$ErrorActionPreference = 'Stop'
$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
$walPath = "$DatabasePath-wal"
$shmPath = "$DatabasePath-shm"

function Get-IntegrityStatus {
    if (-not $IncludeIntegrityCheck) {
        return 'skipped'
    }

    if (-not $sqlite) {
        return 'sqlite3-unavailable'
    }

    try {
        $result = & $sqlite.Source $DatabasePath 'PRAGMA quick_check;' 2>$null
        if ($result -eq 'ok') {
            return 'ok'
        }

        return if ($result) { "failed:$result" } else { 'failed:unknown' }
    } catch {
        return "error:$($_.Exception.Message)"
    }
}

$report = [ordered]@{
    generatedAt = (Get-Date).ToString('s')
    databasePath = $DatabasePath
    exists = Test-Path -LiteralPath $DatabasePath
    walPath = $walPath
    walExists = Test-Path -LiteralPath $walPath
    shmPath = $shmPath
    shmExists = Test-Path -LiteralPath $shmPath
    integrity = if (Test-Path -LiteralPath $DatabasePath) { Get-IntegrityStatus } else { 'missing' }
}

if ($report.exists) {
    $dbItem = Get-Item -LiteralPath $DatabasePath
    $report.sizeBytes = $dbItem.Length
    $report.sizeMB = [math]::Round(($dbItem.Length / 1MB), 2)
    $report.lastWriteTime = $dbItem.LastWriteTime.ToString('s')
}

if ($report.walExists) {
    $walItem = Get-Item -LiteralPath $walPath
    $report.walBytes = $walItem.Length
    $report.walMB = [math]::Round(($walItem.Length / 1MB), 2)
}

if ($report.shmExists) {
    $shmItem = Get-Item -LiteralPath $shmPath
    $report.shmBytes = $shmItem.Length
}

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$report | ConvertTo-Json -Depth 5 | Set-Content -Path $OutputPath -Encoding UTF8

Write-Host 'Memory Health Report' -ForegroundColor Cyan
Write-Host "  Database: $DatabasePath"
Write-Host "  Exists:   $($report.exists)"
Write-Host "  WAL:      $($report.walExists)"
Write-Host "  Report:   $OutputPath"
