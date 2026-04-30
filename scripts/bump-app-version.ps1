# Bump semantic version for a workspace app (package.json + Tauri/Cargo where applicable).
# Safe to run from repo root locally or in GitHub Actions ($GITHUB_WORKSPACE).

param(
    [Parameter(Mandatory = $true)]
    [string] $App,

    [Parameter(Mandatory = $true)]
    [string] $Version
)

$ErrorActionPreference = 'Stop'

$ver = $Version.Trim()
if ($ver.StartsWith('v', [StringComparison]::OrdinalIgnoreCase)) {
    $ver = $ver.Substring(1)
}

if ($ver -notmatch '^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$') {
    throw "Invalid version string: $Version (expected semver, e.g. 1.2.3)"
}

$root = if ($env:GITHUB_WORKSPACE -and (Test-Path $env:GITHUB_WORKSPACE)) {
    $env:GITHUB_WORKSPACE
} else {
    (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Set-JsonVersionField {
    <#
    .SYNOPSIS
        Replace the first top-level "version" value without re-serializing the file.
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $NewVersion
    )

    $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
    $regex = '"version"\s*:\s*"[^"]*"'
    if (-not [regex]::IsMatch($raw, $regex)) {
        throw "No `"version`" field found in $Path"
    }
    $updated = [regex]::Replace($raw, $regex, "`"version`": `"$NewVersion`"", 1)
    $normalized = ($updated -replace "`r`n", "`n").TrimEnd("`n") + "`n"
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $Path), $normalized, $utf8NoBom)
}

function Set-CargoPackageVersion {
    param([string] $Path, [string] $NewVersion)
    # @( ) ensures an array: single-line files otherwise return a bare string (.Count unreliable in for-loop).
    $lines = @(Get-Content -LiteralPath $Path -Encoding UTF8)
    $inPackage = $false
    $updated = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^\[package\]\s*$') {
            $inPackage = $true
            continue
        }
        if ($lines[$i] -match '^\[.+\]\s*$') {
            $inPackage = $false
            continue
        }
        if ($inPackage -and ($lines[$i] -match '^version\s*=')) {
            $lines[$i] = "version = `"$NewVersion`""
            $updated = $true
            break
        }
    }
    if (-not $updated) {
        throw "Could not find [package] version in $Path"
    }
    $lines | Set-Content -LiteralPath $Path -Encoding UTF8
}

switch -Regex ($App.ToLowerInvariant()) {
    '^gravity-claw$' {
        $base = Join-Path $root 'apps/gravity-claw'
        if (-not (Test-Path -LiteralPath $base)) {
            throw "App directory not found: $base"
        }
        Set-JsonVersionField -Path (Join-Path $base 'package.json') -NewVersion $ver
        Set-JsonVersionField -Path (Join-Path $base 'src-tauri/tauri.conf.json') -NewVersion $ver
        Set-CargoPackageVersion -Path (Join-Path $base 'src-tauri/Cargo.toml') -NewVersion $ver
        Write-Host "Set gravity-claw version to $ver"
        break
    }
    default {
        throw "Unknown app '$App'. Supported: gravity-claw"
    }
}
