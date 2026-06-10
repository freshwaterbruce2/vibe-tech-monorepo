#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [switch]$FixPermissions
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$script:issues = New-Object System.Collections.Generic.List[string]
$script:warnings = New-Object System.Collections.Generic.List[string]

function Add-Issue {
    param([string]$Message)
    $script:issues.Add($Message)
}

function Add-Warning {
    param([string]$Message)
    $script:warnings.Add($Message)
}

function Test-RequiredPath {
    param(
        [string]$Path,
        [string]$Label
    )

    if (Test-Path -LiteralPath $Path) {
        Write-Host "  OK   $Label" -ForegroundColor Green
        return
    }

    Add-Issue "Missing required path: $Label ($Path)"
    Write-Host "  ERR  $Label" -ForegroundColor Red
}

function Test-DeprecatedPathMissing {
    param(
        [string]$Path,
        [string]$Label
    )

    if (Test-Path -LiteralPath $Path) {
        Add-Issue "Deprecated path still exists: $Label ($Path)"
        Write-Host "  ERR  $Label still exists" -ForegroundColor Red
        return
    }

    Write-Host "  OK   $Label not present" -ForegroundColor Green
}

function Get-ScanFiles {
    $scanRoots = @(
        (Join-Path $workspaceRoot 'apps'),
        (Join-Path $workspaceRoot 'packages'),
        (Join-Path $workspaceRoot 'backend'),
        (Join-Path $workspaceRoot 'scripts'),
        (Join-Path $workspaceRoot '.claude')
    ) | Where-Object { Test-Path -LiteralPath $_ }

    $extensions = @(
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json',
        '.ps1', '.py', '.rs', '.toml', '.yaml', '.yml', '.env'
    )

    $rootFiles = Get-ChildItem -Path $workspaceRoot -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension.ToLowerInvariant() -in $extensions }

    function Get-FilesFast {
        param([string]$Path)
        $files = Get-ChildItem -Path $Path -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension.ToLowerInvariant() -in $extensions }
        $dirs = Get-ChildItem -Path $Path -Directory -ErrorAction SilentlyContinue | Where-Object {
            $_.Name -notin @(
                'node_modules', '.git', 'dist', 'coverage', 'tmp', '.nx', 
                'worktrees', 'docs', '_archive', 'archive', 'tools'
            )
        }
        $results = [System.Collections.Generic.List[System.IO.FileInfo]]::new()
        foreach ($f in $files) { $results.Add($f) }
        foreach ($d in $dirs) {
            $subFiles = Get-FilesFast -Path $d.FullName
            foreach ($sf in $subFiles) { $results.Add($sf) }
        }
        return $results
    }

    $nestedFiles = foreach ($scanRoot in $scanRoots) {
        Get-FilesFast -Path $scanRoot
    }

    @($rootFiles + $nestedFiles) | Where-Object {
        $fullName = $_.FullName
        $fullName -notlike "$PSScriptRoot\check-vibe-paths.ps1"
    }
}

function Find-DeprecatedReferences {
    param(
        [System.IO.FileInfo[]]$Files,
        [string]$Literal,
        [string]$IgnoreLiteral
    )

    if (-not $Files -or @($Files).Count -eq 0) {
        return @()
    }

    $paths = [System.Collections.Generic.List[string]]::new()
    foreach ($file in $Files) {
        if ($file -and (Test-Path -LiteralPath $file.FullName -PathType Leaf)) {
            $paths.Add($file.FullName)
        }
    }

    if ($paths.Count -eq 0) {
        return @()
    }

    $matches = try {
        Select-String -LiteralPath $paths -SimpleMatch $Literal -ErrorAction SilentlyContinue
    }
    catch {
        @()
    }

    if ($IgnoreLiteral) {
        $matches = $matches | Where-Object { $_.Line -notlike "*$IgnoreLiteral*" }
    }

    return @(
        $matches | ForEach-Object {
            [pscustomobject]@{
                Path = $_.Path.Replace("$workspaceRoot\", '')
                LineNumber = $_.LineNumber
                Text = $_.Line.Trim()
            }
        }
    )
}

Write-Host 'Path Policy Validation' -ForegroundColor Cyan
Write-Host "  Workspace: $workspaceRoot"

if ($FixPermissions) {
    Add-Warning '-FixPermissions is deprecated; this script is now read-only and reports policy drift only.'
}

Write-Host "`n[1/3] Checking canonical storage roots..." -ForegroundColor Yellow
foreach ($entry in @(
        @{ Path = $workspaceRoot; Label = 'source root' },
        @{ Path = 'D:\learning-system'; Label = 'learning-system root' },
        @{ Path = 'D:\databases'; Label = 'databases root' },
        @{ Path = 'D:\logs'; Label = 'logs root' },
        @{ Path = 'D:\data'; Label = 'data root' }
    )) {
    Test-RequiredPath -Path $entry.Path -Label $entry.Label
}

Write-Host "`n[2/3] Verifying deprecated roots are absent..." -ForegroundColor Yellow
foreach ($entry in @(
        @{ Path = 'D:\learning'; Label = 'deprecated D:\learning root' },
        @{ Path = 'V:\monorepo\data'; Label = 'deprecated V:\monorepo\data root' },
        @{ Path = 'V:\monorepo\logs'; Label = 'deprecated V:\monorepo\logs root' },
        @{ Path = 'V:\monorepo\databases'; Label = 'deprecated V:\monorepo\databases root' },
        @{ Path = 'V:\monorepo\data'; Label = 'deprecated V:\monorepo\data root' },
        @{ Path = 'V:\monorepo\logs'; Label = 'deprecated V:\monorepo\logs root' },
        @{ Path = 'V:\monorepo\databases'; Label = 'deprecated V:\monorepo\databases root' }
    )) {
    Test-DeprecatedPathMissing -Path $entry.Path -Label $entry.Label
}

Write-Host "`n[3/3] Scanning workspace code and scripts for deprecated path literals..." -ForegroundColor Yellow
$scanFiles = @(Get-ScanFiles)
Write-Host "  Scanning $(@($scanFiles).Count) files" -ForegroundColor DarkGray

$deprecatedRules = @(
    @{
        Label = 'deprecated D:\learning path'
        Literal = 'D:\learning'
        IgnoreLiteral = 'D:\learning-system'
    },
    @{
        Label = 'deprecated V:\monorepo\data path'
        Literal = 'V:\monorepo\data'
        IgnoreLiteral = $null
    },
    @{
        Label = 'deprecated V:\monorepo\logs path'
        Literal = 'V:\monorepo\logs'
        IgnoreLiteral = $null
    },
    @{
        Label = 'deprecated V:\monorepo\databases path'
        Literal = 'V:\monorepo\databases'
        IgnoreLiteral = $null
    },
    @{
        Label = 'deprecated V:\monorepo\data path'
        Literal = 'V:\monorepo\data'
        IgnoreLiteral = $null
    },
    @{
        Label = 'deprecated V:\monorepo\logs path'
        Literal = 'V:\monorepo\logs'
        IgnoreLiteral = $null
    },
    @{
        Label = 'deprecated V:\monorepo\databases path'
        Literal = 'V:\monorepo\databases'
        IgnoreLiteral = $null
    }
)

foreach ($rule in $deprecatedRules) {
    $matches = @(Find-DeprecatedReferences -Files $scanFiles -Literal $rule.Literal -IgnoreLiteral $rule.IgnoreLiteral)
    if (@($matches).Count -eq 0) {
        Write-Host "  OK   $($rule.Label)" -ForegroundColor Green
        continue
    }

    Add-Issue "$($rule.Label): $(@($matches).Count) reference(s) found."
    Write-Host "  ERR  $($rule.Label) -> $(@($matches).Count) reference(s)" -ForegroundColor Red
    foreach ($match in $matches | Select-Object -First 5) {
        Write-Host "       $($match.Path):$($match.LineNumber)  $($match.Text)" -ForegroundColor DarkYellow
    }
}

Write-Host "`nValidation Summary" -ForegroundColor Cyan
Write-Host "  Issues:   $($script:issues.Count)"
Write-Host "  Warnings: $($script:warnings.Count)"

if ($script:warnings.Count -gt 0) {
    Write-Host "`nWarnings" -ForegroundColor Yellow
    foreach ($warning in $script:warnings) {
        Write-Host "  $warning" -ForegroundColor Yellow
    }
}

if ($script:issues.Count -gt 0) {
    Write-Host "`nIssues" -ForegroundColor Red
    foreach ($issue in $script:issues) {
        Write-Host "  $issue" -ForegroundColor Red
    }

    throw 'Path policy validation failed.'
}

Write-Host "`nPath policy validation passed." -ForegroundColor Green
