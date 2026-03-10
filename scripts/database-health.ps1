#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string]$DatabaseRoot = 'D:\databases',
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'tmp\database-health-report.json'),
    [switch]$IncludeIntegrityCheck,
    [switch]$IncludeArchived
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
$excludedPathFragments = @('\_archive', '\backups\', '\cdev-databases\')

function Normalize-DbName {
    param([string]$Name)
    return (($Name.ToLowerInvariant()) -replace '[^a-z0-9]', '')
}

function Get-IntegrityStatus {
    param([string]$Path)

    if (-not $IncludeIntegrityCheck) {
        return 'skipped'
    }

    if (-not $sqlite) {
        return 'sqlite3-unavailable'
    }

    try {
        $result = & $sqlite.Source $Path 'PRAGMA quick_check;' 2>$null
        if ($result -eq 'ok') {
            return 'ok'
        }

        if ($result) {
            return "failed:$result"
        }

        return 'failed:unknown'
    } catch {
        return "error:$($_.Exception.Message)"
    }
}

if (-not (Test-Path -LiteralPath $DatabaseRoot)) {
    throw "Database root not found: $DatabaseRoot"
}

$dbFiles = Get-ChildItem -Path $DatabaseRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $fullName = $_.FullName
        $_.Extension.ToLowerInvariant() -in @('.db', '.sqlite', '.sqlite3') -and
        ($IncludeArchived -or -not ($excludedPathFragments | Where-Object { $fullName -like "*$_*" }))
    }

$records = foreach ($db in $dbFiles) {
    $walPath = "$($db.FullName)-wal"
    $shmPath = "$($db.FullName)-shm"
    $walItem = if (Test-Path -LiteralPath $walPath) { Get-Item -LiteralPath $walPath } else { $null }
    $shmItem = if (Test-Path -LiteralPath $shmPath) { Get-Item -LiteralPath $shmPath } else { $null }
    $normalized = Normalize-DbName -Name $db.BaseName

    [pscustomobject]@{
        name = $db.Name
        relativePath = $db.FullName.Substring($DatabaseRoot.Length).TrimStart('\')
        fullPath = $db.FullName
        normalizedName = $normalized
        sizeBytes = $db.Length
        sizeMB = [math]::Round(($db.Length / 1MB), 2)
        lastWriteTime = $db.LastWriteTime.ToString('s')
        walExists = [bool]$walItem
        walBytes = if ($walItem) { $walItem.Length } else { 0 }
        walMB = if ($walItem) { [math]::Round(($walItem.Length / 1MB), 2) } else { 0 }
        shmExists = [bool]$shmItem
        shmBytes = if ($shmItem) { $shmItem.Length } else { 0 }
        integrity = Get-IntegrityStatus -Path $db.FullName
        isCore = $db.Name -in @('database.db', 'memory.db', 'agent_learning.db', 'nova_activity.db')
    }
}

$duplicateGroups = @(
    $records |
        Group-Object normalizedName |
        Where-Object { $_.Count -gt 1 } |
        ForEach-Object {
            [pscustomobject]@{
                normalizedName = $_.Name
                members = @($_.Group | Select-Object name, relativePath, fullPath)
            }
        }
)

$largeWalFiles = @(
    $records |
        Where-Object { $_.walExists -and $_.walBytes -gt 10MB } |
        Select-Object name, relativePath, walMB
)

$report = [ordered]@{
    generatedAt = (Get-Date).ToString('s')
    databaseRoot = $DatabaseRoot
    sqlite3Available = [bool]$sqlite
    summary = [ordered]@{
        totalDatabases = $records.Count
        coreDatabases = ($records | Where-Object isCore | Measure-Object).Count
        duplicateNameGroups = $duplicateGroups.Count
        largeWalFiles = $largeWalFiles.Count
    }
    duplicates = $duplicateGroups
    largeWalFiles = $largeWalFiles
    files = $records
}

$outputDir = Split-Path -Parent $OutputPath
if ($outputDir -and -not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$report | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputPath -Encoding UTF8

Write-Host "Database Health Report" -ForegroundColor Cyan
Write-Host "  Root:       $DatabaseRoot"
Write-Host "  Databases:  $($records.Count)"
Write-Host "  Duplicates: $($duplicateGroups.Count)"
Write-Host "  Large WALs: $($largeWalFiles.Count)"
Write-Host "  Report:     $OutputPath"

if ($duplicateGroups.Count -gt 0) {
    Write-Host "`nPotential duplicate-name groups:" -ForegroundColor Yellow
    foreach ($group in $duplicateGroups) {
        $members = ($group.members | ForEach-Object { $_.name }) -join ', '
        Write-Host "  $($group.normalizedName): $members" -ForegroundColor Yellow
    }
}

if ($largeWalFiles.Count -gt 0) {
    Write-Host "`nLarge WAL files:" -ForegroundColor Yellow
    foreach ($item in $largeWalFiles) {
        Write-Host "  $($item.relativePath) ($($item.walMB) MB)" -ForegroundColor Yellow
    }
}
