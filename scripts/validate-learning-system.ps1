#!/usr/bin/env pwsh
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$learningRoot = 'D:\learning-system'
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
    param([string]$Path, [string]$Label)

    if (Test-Path -LiteralPath $Path) {
        Write-Host "  OK  $Label" -ForegroundColor Green
        return
    }

    Add-Issue "Missing required path: $Label ($Path)"
    Write-Host "  ERR $Label" -ForegroundColor Red
}

function Get-ReferenceCount {
    param([string]$Literal)

    $rg = Get-Command rg -ErrorAction SilentlyContinue
    if ($rg) {
        $result = & $rg.Source -n --hidden -F `
            --glob '!**/.git/**' `
            --glob '!**/node_modules/**' `
            --glob '!**/dist/**' `
            --glob '!**/.nx/**' `
            $Literal `
            $workspaceRoot 2>$null

        if (-not $result) {
            return 0
        }

        return @($result).Count
    }

    return @(
        Get-ChildItem -Path $workspaceRoot -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension -in @('.ps1', '.psm1', '.ts', '.tsx', '.js', '.mjs', '.md', '.json') } |
            Select-String -SimpleMatch $Literal
    ).Count
}

Write-Host "Learning System Validation" -ForegroundColor Cyan
Write-Host "  Root: $learningRoot"

Write-Host "`n[1/5] Checking required directories..." -ForegroundColor Yellow
foreach ($path in @(
        @{ Path = $learningRoot; Label = 'learning-system root' },
        @{ Path = 'D:\learning-system\logs'; Label = 'logs' },
        @{ Path = 'D:\learning-system\scripts'; Label = 'scripts' },
        @{ Path = 'D:\learning-system\backups'; Label = 'backups' }
    )) {
    Test-RequiredPath -Path $path.Path -Label $path.Label
}

Write-Host "`n[2/5] Checking runtime databases..." -ForegroundColor Yellow
foreach ($path in @(
        @{ Path = 'D:\learning-system\agent_learning.db'; Label = 'learning-system agent DB' },
        @{ Path = 'D:\learning-system\learning.db'; Label = 'learning.db' },
        @{ Path = 'D:\learning-system\monitoring.db'; Label = 'monitoring.db' },
        @{ Path = 'D:\learning-system\events.db'; Label = 'events.db' }
    )) {
    Test-RequiredPath -Path $path.Path -Label $path.Label
}

Write-Host "`n[3/5] Checking canonical documentation..." -ForegroundColor Yellow
foreach ($path in @(
        @{ Path = 'D:\learning-system\README.md'; Label = 'README' },
        @{ Path = 'D:\learning-system\COMPLETE_GUIDE.md'; Label = 'COMPLETE_GUIDE' },
        @{ Path = 'D:\learning-system\DOCUMENTATION_INDEX.md'; Label = 'DOCUMENTATION_INDEX' },
        @{ Path = 'D:\learning-system\enhanced_agent_guidelines.md'; Label = 'enhanced_agent_guidelines' }
    )) {
    Test-RequiredPath -Path $path.Path -Label $path.Label
}

Write-Host "`n[4/5] Checking environment and hooks..." -ForegroundColor Yellow
if (-not (Test-Path -LiteralPath 'D:\learning-system\.venv')) {
    Add-Warning 'No D:\learning-system\.venv directory found.'
    Write-Host '  WARN Python virtual environment missing' -ForegroundColor Yellow
} else {
    Write-Host '  OK  Python virtual environment found' -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath 'C:\dev\.claude\hooks')) {
    Add-Warning 'C:\dev\.claude\hooks is missing.'
    Write-Host '  WARN Hook directory missing' -ForegroundColor Yellow
} else {
    Write-Host '  OK  Hook directory found' -ForegroundColor Green
}

Write-Host "`n[5/5] Checking split authority..." -ForegroundColor Yellow
$learningDbRefs = Get-ReferenceCount -Literal 'D:\learning-system\agent_learning.db'
$databaseDbRefs = Get-ReferenceCount -Literal 'D:\databases\agent_learning.db'

if ($learningDbRefs -gt 0 -and $databaseDbRefs -gt 0) {
    Add-Warning "Both D:\learning-system\agent_learning.db ($learningDbRefs refs) and D:\databases\agent_learning.db ($databaseDbRefs refs) are referenced in the workspace."
    Write-Host "  WARN Split authority for agent_learning.db ($learningDbRefs vs $databaseDbRefs refs)" -ForegroundColor Yellow
} else {
    Write-Host '  OK  No split authority detected for agent_learning.db references' -ForegroundColor Green
}

$rootDocFiles = Get-ChildItem -Path $learningRoot -File -ErrorAction SilentlyContinue
$reportLikeDocs = @(
    $rootDocFiles |
        Where-Object {
            $_.Extension -eq '.md' -and
            $_.Name -match '(SUMMARY|REPORT|CHECKLIST|CHANGELOG|IMPLEMENTATION|COMPLETE|GUIDE)'
        }
)

if ($reportLikeDocs.Count -gt 12) {
    Add-Warning "D:\learning-system root still contains $($reportLikeDocs.Count) report-style markdown files. Consider archiving historical writeups."
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

    throw 'Learning system validation failed.'
}

Write-Host "`nLearning system validation passed." -ForegroundColor Green
