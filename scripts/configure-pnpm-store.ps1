#Requires -Version 7
<#
.SYNOPSIS
    Configures the optimal pnpm store and linking strategy for the current drive layout.
.DESCRIPTION
    pnpm can only hard-link (NTFS) or CoW-reflink (ReFS) when the store lives on the
    SAME volume as the code. A store on a different physical drive forces a full file
    COPY on every install. So this script always places the store on the SAME volume as
    the repo, just OUTSIDE the repo tree (e.g. V:\pnpm-store) so the 200k+ store files
    don't pollute git/ripgrep/nx scans, and picks the import method from that volume's
    filesystem:
      ReFS (Windows Dev Drive) -> hardlink (O(1) same-volume hard-links, fastest+reliable)
      NTFS                      -> auto    (hard-links on the same volume)
      other                     -> copy    (safe fallback)

    NOTE: ReFS uses 'hardlink', NOT 'clone'. pnpm's clone (reflink/CoW) path has
    repeatedly regressed on ReFS Dev Drives (pnpm#7186 corruption, pnpm#7554 reflink
    "file exists" error) and has NO fallback, so a wedged per-file reflink against the
    Defender WdFilter minifilter SILENTLY FREEZES the whole link phase. Same-volume
    hardlinks are just as O(1)-cheap without entering that buggy codepath.
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

# The store must live on the SAME volume as the code, or every install falls back to
# a full copy. Derive the repo's drive and place the store at <drive>:\pnpm-store
# (outside the repo so its 200k+ files don't slow git/ripgrep/nx).
$repoDrive = (Split-Path -Qualifier $repoRoot).TrimEnd(':')
$codeFs = Get-VolumeFileSystem $repoDrive
$storeDir = "${repoDrive}:\pnpm-store"

Write-Host "Repo drive: ${repoDrive}:\ ($codeFs). Store -> $storeDir"

switch ($codeFs) {
    "ReFS"  { $method = "hardlink" } # Dev Drive: O(1) same-volume hard-links (clone reflink hangs — pnpm#7186/#7554)
    "NTFS"  { $method = "auto" }    # same-volume hard-links
    default { $method = "copy" }    # safe fallback for unknown/cross-volume
}

Write-Host "Filesystem $codeFs -> package-import-method=$method"

$lines = Read-Npmrc
$lines = Set-NpmrcValue $lines "package-import-method" $method
$lines = Set-NpmrcValue $lines "store-dir" $storeDir

if ($WhatIf) {
    Write-Host "WhatIf: would write the following .npmrc:"
    $lines | Write-Host
} else {
    # Write only when content actually changes, so this is a clean no-op drift guard
    # when invoked from `prepare` on every install.
    $current = if (Test-Path $npmrcPath) { (Get-Content $npmrcPath) -join "`n" } else { "" }
    $next = ($lines -join "`n")
    if ($current -ne $next) {
        $lines | Set-Content $npmrcPath -Encoding utf8
        Write-Host "Updated $npmrcPath"
    } else {
        Write-Host ".npmrc already optimal (store=$storeDir, method=$method) — no change"
    }
}
