#Requires -Version 7
<#
.SYNOPSIS
    Configures the optimal pnpm store and linking strategy for the current drive layout.
.DESCRIPTION
    Detects whether V:\ and D:\ are ReFS/Dev Drive or NTFS. If both volumes support
    Copy-on-Write (ReFS), it keeps the store on D:\ and uses clone (CoW reflink).
    Otherwise it moves the store to V:\monorepo\.pnpm-store-v2 and uses copy to avoid
    cross-volume hard-link failures.
.PARAMETER WhatIf
    Preview changes without writing to .npmrc.
#>
param([switch]$WhatIf)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$npmrcPath = Join-Path $repoRoot ".npmrc"

function Get-VolumeFileSystem {
    param([string]$DriveLetter)
    $volume = Get-Volume -DriveLetter $DriveLetter -ErrorAction SilentlyContinue
    if (-not $volume) {
        return $null
    }
    return $volume.FileSystem
}

function Read-Npmrc {
    if (-not (Test-Path $npmrcPath)) {
        return @()
    }
    return Get-Content $npmrcPath
}

function Set-NpmrcValue {
    param(
        [string[]]$Lines,
        [string]$Key,
        [string]$Value
    )
    $pattern = "^$([regex]::Escape($Key))\s*=.*"
    $updated = $false
    $result = $Lines | ForEach-Object {
        if ($_ -match $pattern) {
            $updated = $true
            "$Key=$Value"
        } else {
            $_
        }
    }
    if (-not $updated) {
        $result = @($result) + "$Key=$Value"
    }
    return $result
}

$vFs = Get-VolumeFileSystem "V"
$dFs = Get-VolumeFileSystem "D"

Write-Host "Detected filesystems: V:\ = $vFs, D:\ = $dFs"

$bothReFS = ($vFs -eq "ReFS") -and ($dFs -eq "ReFS")

$lines = Read-Npmrc
if ($bothReFS) {
    Write-Host "Both volumes are ReFS. Using CoW clone linking with D:\pnpm-store-v2."
    $lines = Set-NpmrcValue $lines "package-import-method" "clone"
    $lines = Set-NpmrcValue $lines "store-dir" "D:\pnpm-store-v2"
} else {
    Write-Host "At least one volume is NTFS. Using same-volume copy linking on V:\."
    $lines = Set-NpmrcValue $lines "package-import-method" "copy"
    $lines = Set-NpmrcValue $lines "store-dir" "V:\monorepo\.pnpm-store-v2"
}

if ($WhatIf) {
    Write-Host "WhatIf: would write the following .npmrc:"
    $lines | Write-Host
} else {
    $lines | Set-Content $npmrcPath -Encoding utf8
    Write-Host "Updated $npmrcPath"
}
