#Requires -Version 5.1
<#
.SYNOPSIS
    Safe D: drive cleanup assistant.
.DESCRIPTION
    Rotates old logs, removes orphaned WAL/SHM sidecars for retired DBs,
    and cleans temp/cache directories. Dry-run by default.
.PARAMETER Confirm
    Required switch to perform destructive operations.
.PARAMETER LogRetentionDays
    Days to keep logs before rotation. Default: 14
.PARAMETER TempRetentionDays
    Days to keep temp files. Default: 7
.PARAMETER IncludeCache
    Also clean D:\cache. Default: true
.EXAMPLE
    .\d-drive-cleanup.ps1 -WhatIf
    .\d-drive-cleanup.ps1 -Confirm -LogRetentionDays 7
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [switch]$Execute,
    [int]$LogRetentionDays = 14,
    [int]$TempRetentionDays = 7,
    [switch]$IncludeCache = $true
)

$ErrorActionPreference = 'Continue'
$whatIf = -not $Execute
$modeLabel = if ($whatIf) { 'DRY RUN' } else { 'LIVE' }

Write-Host "D: Drive Cleanup ($modeLabel)" -ForegroundColor Cyan
if ($whatIf) {
    Write-Host "  Use -Execute to perform destructive operations." -ForegroundColor Yellow
}

$actions = 0
$bytesReclaimed = 0

function Reclaim {
    param([long]$Bytes)
    $bytesReclaimed += $Bytes
    $actions++
}

function Fmt { param($bytes)
    if ($bytes -ge 1GB) { return '{0:N2} GB' -f ($bytes/1GB) }
    if ($bytes -ge 1MB) { return '{0:N1} MB' -f ($bytes/1MB) }
    return '{0:N0} KB' -f ($bytes/1KB)
}

# 1. Rotate old logs
Write-Host "`n1. Log rotation (retention: $LogRetentionDays days)" -ForegroundColor Cyan
$logRoot = 'D:\logs'
$cutoff = (Get-Date).AddDays(-$LogRetentionDays)

if (Test-Path $logRoot) {
    $logFiles = Get-ChildItem $logRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff -and $_.Extension -in @('.log','.txt','.json') }

    foreach ($file in $logFiles) {
        $compressed = $file.FullName + '.gz'
        if ($whatIf) {
            Write-Host "  [WOULD] Compress $($file.Name) ($($file.Length | Fmt))" -ForegroundColor DarkGray
            Reclaim -Bytes ($file.Length * 0.7) # estimate
        } else {
            try {
                $src = $file.FullName
                $fs = [System.IO.File]::OpenRead($src)
                $gs = [System.IO.Compression.GZipStream]::new(
                    [System.IO.File]::Create($compressed),
                    [System.IO.Compression.CompressionLevel]::Optimal
                )
                $fs.CopyTo($gs)
                $gs.Dispose(); $fs.Dispose()
                Remove-Item $src -Force
                $newSize = (Get-Item $compressed).Length
                Write-Host "  [COMPRESSED] $($file.Name) -> $($newSize | Fmt)" -ForegroundColor Green
                Reclaim -Bytes ($file.Length - $newSize)
            } catch {
                Write-Host "  [FAIL] $($file.Name): $_" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "  Log root missing." -ForegroundColor DarkGray
}

# 2. Remove orphaned WAL/SHM for retired DBs
Write-Host "`n2. Orphaned sidecar cleanup" -ForegroundColor Cyan
$inventoryPath = 'D:\databases\DB_INVENTORY.md'
$retiredNames = @()

if (Test-Path $inventoryPath) {
    # Parse retired section from markdown
    $content = Get-Content $inventoryPath -Raw
    if ($content -match '## Retired.*?\n## ') {
        $retiredSection = $Matches[0]
        $retiredNames = [regex]::Matches($retiredSection, "\|\s*`([^`]+)\.db`\s*\|") |
            ForEach-Object { $_.Groups[1].Value + '.db' }
    }
}

$orphans = @()
if ($retiredNames.Count -gt 0) {
    $dbRoot = 'D:\databases'
    foreach ($name in $retiredNames) {
        $wal = Join-Path $dbRoot "$name-wal"
        $shm = Join-Path $dbRoot "$name-shm"
        if (Test-Path $wal) { $orphans += $wal }
        if (Test-Path $shm) { $orphans += $shm }
    }
}

foreach ($path in $orphans) {
    $item = Get-Item $path
    if ($whatIf) {
        Write-Host "  [WOULD] Remove orphaned sidecar $($item.Name) ($($item.Length | Fmt))" -ForegroundColor DarkGray
        Reclaim -Bytes $item.Length
    } else {
        Remove-Item $path -Force
        Write-Host "  [REMOVED] $($item.Name)" -ForegroundColor Green
        Reclaim -Bytes $item.Length
    }
}

# 3. Temp cleanup
Write-Host "`n3. Temp cleanup (retention: $TempRetentionDays days)" -ForegroundColor Cyan
$tempRoot = 'D:\temp'
if (Test-Path $tempRoot) {
    $tempCutoff = (Get-Date).AddDays(-$TempRetentionDays)
    $tempFiles = Get-ChildItem $tempRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $tempCutoff }

    foreach ($file in $tempFiles) {
        if ($whatIf) {
            Write-Host "  [WOULD] Delete $($file.Name) ($($file.Length | Fmt))" -ForegroundColor DarkGray
            Reclaim -Bytes $file.Length
        } else {
            Remove-Item $file.FullName -Force
            Write-Host "  [DELETED] $($file.Name)" -ForegroundColor Green
            Reclaim -Bytes $file.Length
        }
    }
}

# 4. Cache cleanup
if ($IncludeCache) {
    Write-Host "`n4. Cache cleanup" -ForegroundColor Cyan
    $cacheRoot = 'D:\cache'
    if (Test-Path $cacheRoot) {
        $cacheCutoff = (Get-Date).AddDays(-$TempRetentionDays)
        $cacheFiles = Get-ChildItem $cacheRoot -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.LastWriteTime -lt $cacheCutoff }

        foreach ($file in $cacheFiles) {
            if ($whatIf) {
                Write-Host "  [WOULD] Delete $($file.Name) ($($file.Length | Fmt))" -ForegroundColor DarkGray
                Reclaim -Bytes $file.Length
            } else {
                Remove-Item $file.FullName -Force
                Write-Host "  [DELETED] $($file.Name)" -ForegroundColor Green
                Reclaim -Bytes $file.Length
            }
        }
    }
}

# Summary
Write-Host "`n=== Summary ($modeLabel) ===" -ForegroundColor Cyan
Write-Host "  Actions: $actions"
Write-Host "  Space reclaimed: $($bytesReclaimed | Fmt)"
