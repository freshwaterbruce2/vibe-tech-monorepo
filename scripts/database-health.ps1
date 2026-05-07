#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string]$DatabaseRoot = 'D:\databases',
    [string]$OutputPath = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'tmp\database-health-report.json'),
    [switch]$IncludeIntegrityCheck,
    [switch]$IncludeArchived,
    [switch]$CheckpointLargeWal
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
$excludedPathFragments = @('\_archive', '\backups\', '\cdev-databases\')
$knownDistinctNameGroups = @(
    [pscustomobject]@{
        normalizedName = 'trading'
        members = @('trading.db', 'crypto-enhanced\trading.db')
        reason = 'Top-level trading.db and crypto-enhanced\trading.db are documented as separate datasets in D:\databases\DB_INVENTORY.md.'
    }
)

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

function Test-SameSet {
    param([string[]]$Actual, [string[]]$Expected)

    $actualSorted = @($Actual | Sort-Object)
    $expectedSorted = @($Expected | Sort-Object)
    if ($actualSorted.Count -ne $expectedSorted.Count) {
        return $false
    }

    for ($i = 0; $i -lt $actualSorted.Count; $i++) {
        if ($actualSorted[$i] -ne $expectedSorted[$i]) {
            return $false
        }
    }

    return $true
}

function Get-KnownDistinctGroup {
    param([string]$NormalizedName, [object[]]$Members)

    $relativePaths = @($Members | ForEach-Object { $_.relativePath })
    foreach ($group in $knownDistinctNameGroups) {
        if ($group.normalizedName -eq $NormalizedName -and (Test-SameSet -Actual $relativePaths -Expected $group.members)) {
            return $group
        }
    }

    return $null
}

function Invoke-WalCheckpoint {
    param([string]$Path)

    if (-not $sqlite) {
        return [pscustomobject]@{ status = 'skipped:sqlite3-unavailable'; result = $null }
    }

    try {
        $result = & $sqlite.Source $Path 'PRAGMA busy_timeout=5000; PRAGMA wal_checkpoint(TRUNCATE);' 2>&1
        if ($LASTEXITCODE -ne 0) {
            return [pscustomobject]@{ status = 'error'; result = ($result -join "`n") }
        }

        $lines = @($result | Where-Object { $_ -match '\S' })
        $checkpointLine = if ($lines.Count -gt 0) { $lines[-1] } else { '' }
        $parts = @($checkpointLine -split '\|')
        if ($parts.Count -ge 3) {
            $status = if ($parts[0] -eq '0') { 'ok' } else { 'busy' }
            return [pscustomobject]@{
                status = $status
                busy = [int]$parts[0]
                logFrames = [int]$parts[1]
                checkpointedFrames = [int]$parts[2]
                result = $checkpointLine
            }
        }

        return [pscustomobject]@{ status = 'unknown'; result = ($result -join "`n") }
    } catch {
        return [pscustomobject]@{ status = "error:$($_.Exception.Message)"; result = $null }
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
    $checkpoint = $null

    if ($CheckpointLargeWal -and $walItem -and $walItem.Length -gt 10MB) {
        $checkpoint = Invoke-WalCheckpoint -Path $db.FullName
        $walItem = if (Test-Path -LiteralPath $walPath) { Get-Item -LiteralPath $walPath } else { $null }
        $shmItem = if (Test-Path -LiteralPath $shmPath) { Get-Item -LiteralPath $shmPath } else { $null }
    }

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
        checkpoint = $checkpoint
        isCore = $db.Name -in @('database.db', 'memory.db', 'agent_learning.db', 'nova_activity.db')
    }
}

$duplicateGroups = @()
$knownDistinctGroups = @()

$duplicateCandidates = @($records | Group-Object normalizedName | Where-Object { $_.Count -gt 1 })
foreach ($candidate in $duplicateCandidates) {
    $knownGroup = Get-KnownDistinctGroup -NormalizedName $candidate.Name -Members $candidate.Group
    if ($knownGroup) {
        $knownDistinctGroups += [pscustomobject]@{
            normalizedName = $candidate.Name
            reason = $knownGroup.reason
            members = @($candidate.Group | Select-Object name, relativePath, fullPath)
        }
    } else {
        $duplicateGroups +=
            [pscustomobject]@{
                normalizedName = $candidate.Name
                members = @($candidate.Group | Select-Object name, relativePath, fullPath)
            }
    }
}

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
        knownDistinctNameGroups = $knownDistinctGroups.Count
        largeWalFiles = $largeWalFiles.Count
        walCheckpointsAttempted = @($records | Where-Object { $_.checkpoint }).Count
    }
    duplicates = $duplicateGroups
    knownDistinctNameGroups = $knownDistinctGroups
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
Write-Host "  Known distinct names: $($knownDistinctGroups.Count)"
Write-Host "  Large WALs: $($largeWalFiles.Count)"
Write-Host "  Report:     $OutputPath"

if ($duplicateGroups.Count -gt 0) {
    Write-Host "`nPotential duplicate-name groups:" -ForegroundColor Yellow
    foreach ($group in $duplicateGroups) {
        $members = ($group.members | ForEach-Object { $_.relativePath }) -join ', '
        Write-Host "  $($group.normalizedName): $members" -ForegroundColor Yellow
    }
}

if ($knownDistinctGroups.Count -gt 0) {
    Write-Host "`nKnown distinct basename groups:" -ForegroundColor DarkGray
    foreach ($group in $knownDistinctGroups) {
        $members = ($group.members | ForEach-Object { $_.relativePath }) -join ', '
        Write-Host "  $($group.normalizedName): $members" -ForegroundColor DarkGray
    }
}

if ($largeWalFiles.Count -gt 0) {
    Write-Host "`nLarge WAL files:" -ForegroundColor Yellow
    foreach ($item in $largeWalFiles) {
        Write-Host "  $($item.relativePath) ($($item.walMB) MB)" -ForegroundColor Yellow
    }
}
