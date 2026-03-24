#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [switch]$FixPermissions
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$script:issues = New-Object System.Collections.Generic.List[object]
$script:warnings = New-Object System.Collections.Generic.List[object]

if ($FixPermissions) {
    $script:warnings.Add([pscustomobject]@{
            Policy = 'fix-permissions'
            File = $null
            Line = $null
            Match = '-FixPermissions is no longer supported by this validator. Review the report manually.'
        })
}

$approvedRoots = @(
    'D:\databases',
    'D:\logs',
    'D:\data',
    'D:\learning-system'
)

$deprecatedRoots = @(
    'C:\dev\data',
    'C:\dev\logs',
    'C:\dev\databases'
)

function Add-Issue {
    param(
        [string]$Policy,
        [string]$File,
        [Nullable[int]]$Line,
        [string]$Match
    )

    $script:issues.Add([pscustomobject]@{
            Policy = $Policy
            File = $File
            Line = $Line
            Match = $Match
        })
}

function Add-Warning {
    param(
        [string]$Policy,
        [string]$File,
        [Nullable[int]]$Line,
        [string]$Match
    )

    $script:warnings.Add([pscustomobject]@{
            Policy = $Policy
            File = $File
            Line = $Line
            Match = $Match
        })
}

function Search-WorkspaceText {
    param([string]$Literal)

    $rg = Get-Command rg -ErrorAction SilentlyContinue
    if ($rg) {
        $args = @(
            '-n',
            '--hidden',
            '-F',
            '--glob', '!**/.git/**',
            '--glob', '!**/node_modules/**',
            '--glob', '!**/dist/**',
            '--glob', '!**/coverage/**',
            '--glob', '!**/.nx/**',
            '--glob', '!**/playwright-report/**',
            '--glob', '!**/test-results/**',
            '--glob', '!**/.codex/**',
            '--glob', '!**/.playwright-cli/**',
            '--glob', '!**/.playwright-mcp/**',
            $Literal,
            $workspaceRoot
        )

        $raw = & $rg.Source @args 2>$null
        if (-not $raw) {
            return @()
        }

        $lines = if ($raw -is [System.Array]) { $raw } else { @($raw) }

        return @($lines | ForEach-Object {
                $parsed = [regex]::Match($_, '^(?<file>[A-Za-z]:.+?):(?<line>\d+):(?<match>.*)$')
                if ($parsed.Success) {
                    $filePath = $parsed.Groups['file'].Value
                    if ($filePath -ne $PSCommandPath) {
                        [pscustomobject]@{
                            File = $filePath
                            Line = [int]$parsed.Groups['line'].Value
                            Match = $parsed.Groups['match'].Value
                        }
                    }
                }
            })
    }

    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) {
        $origPwd = (Get-Location).Path
        Set-Location $workspaceRoot
        $raw = & $git.Source grep -n -I -F $Literal 2>$null
        Set-Location $origPwd

        if (-not $raw) { return @() }
        
        $lines = if ($raw -is [System.Array]) { $raw } else { @($raw) }
        return @($lines | ForEach-Object {
            $parsed = [regex]::Match($_, '^(?<file>.+?):(?<line>\d+):(?<match>.*)$')
            if ($parsed.Success) {
                $filePath = Join-Path $workspaceRoot $parsed.Groups['file'].Value
                if ($filePath -ne $PSCommandPath) {
                    [pscustomobject]@{
                        File = $filePath
                        Line = [int]$parsed.Groups['line'].Value
                        Match = $parsed.Groups['match'].Value
                    }
                }
            }
        })
    }

    throw "Neither rg nor git grep are available. Searching falls back to slow mechanism. Install ripgrep or use git bash."
}

function Test-RequiredRoots {
    Write-Host "`n[1/3] Checking required D:\ roots..." -ForegroundColor Yellow

    foreach ($path in $approvedRoots) {
        if (Test-Path -LiteralPath $path) {
            Write-Host "  OK  $path" -ForegroundColor Green
        } else {
            Add-Issue -Policy 'missing-approved-root' -File $path -Line $null -Match 'Required workspace root is missing.'
            Write-Host "  ERR $path" -ForegroundColor Red
        }
    }

    foreach ($path in $deprecatedRoots) {
        if (Test-Path -LiteralPath $path) {
            Add-Warning -Policy 'deprecated-root-present' -File $path -Line $null -Match 'Deprecated C:\dev data root still exists.'
            Write-Host "  WARN $path" -ForegroundColor Yellow
        }
    }
}

function Test-DeprecatedReferences {
    Write-Host "`n[2/3] Searching for deprecated path references..." -ForegroundColor Yellow

    $deprecatedLearning = Search-WorkspaceText -Literal 'D:\learning'
    foreach ($match in $deprecatedLearning) {
        if ($match.Match -match 'D:\\learning-system' -or $match.File -like "*.md" -or $match.File -like "*\scripts\*" -or $match.File -like "*\tools\*") {
            continue
        }

        Add-Issue -Policy 'deprecated-learning-path' -File $match.File -Line $match.Line -Match $match.Match
    }

    foreach ($literal in @('C:\dev\data', 'C:\dev\logs', 'C:\dev\databases')) {
        $matches = Search-WorkspaceText -Literal $literal
        foreach ($match in $matches) {
            if ($match.File -like "*.md" -or $match.File -like "*\scripts\*" -or $match.File -like "*\tools\*") {
                continue
            }
            Add-Issue -Policy 'deprecated-c-drive-data-root' -File $match.File -Line $match.Line -Match $match.Match
        }
    }

    Write-Host "  Deprecated learning references: $($script:issues | Where-Object Policy -eq 'deprecated-learning-path' | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Gray
    Write-Host "  Deprecated C:\dev data references: $($script:issues | Where-Object Policy -eq 'deprecated-c-drive-data-root' | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Gray
}

function Test-CanonicalGuidance {
    Write-Host "`n[3/3] Checking canonical guidance files..." -ForegroundColor Yellow

    $guidanceFiles = @(
        'C:\dev\AI.md',
        'C:\dev\docs\reference\PATH_CHANGE_RULES.md'
    )

    foreach ($path in $guidanceFiles) {
        if (Test-Path -LiteralPath $path) {
            Write-Host "  OK  $path" -ForegroundColor Green
        } else {
            Add-Issue -Policy 'missing-guidance-file' -File $path -Line $null -Match 'Required guidance file is missing.'
            Write-Host "  ERR $path" -ForegroundColor Red
        }
    }
}

function Write-Results {
    $issueCount = $script:issues.Count
    $warningCount = $script:warnings.Count

    Write-Host "`n==============================================" -ForegroundColor Cyan
    Write-Host "Path Policy Summary" -ForegroundColor Cyan
    Write-Host "==============================================" -ForegroundColor Cyan
    Write-Host "Issues:   $issueCount"
    Write-Host "Warnings: $warningCount"

    if ($warningCount -gt 0) {
        Write-Host "`nWarnings" -ForegroundColor Yellow
        foreach ($warning in $script:warnings) {
            Write-Host "  [$($warning.Policy)] $($warning.File) $($warning.Match)" -ForegroundColor Yellow
        }
    }

    if ($issueCount -gt 0) {
        Write-Host "`nIssues" -ForegroundColor Red
        foreach ($issue in $script:issues | Select-Object -First 30) {
            $location = if ($issue.Line) { "$($issue.File):$($issue.Line)" } else { $issue.File }
            Write-Host "  [$($issue.Policy)] $location" -ForegroundColor Red
            Write-Host "    $($issue.Match)" -ForegroundColor DarkGray
        }

        if ($issueCount -gt 30) {
            Write-Host "  ... and $($issueCount - 30) more issues" -ForegroundColor DarkGray
        }

        throw 'Path policy validation failed.'
    }

    Write-Host "`nNo blocking path policy issues found." -ForegroundColor Green
}

Test-RequiredRoots
Test-DeprecatedReferences
Test-CanonicalGuidance
Write-Results