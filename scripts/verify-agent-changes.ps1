#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [switch]$SkipTests,
    [switch]$SkipTypecheck,
    [switch]$SkipLint
)

$ErrorActionPreference = 'Stop'
$workspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $workspaceRoot

# Source Environment Setup
$environmentScript = Join-Path $PSScriptRoot 'Initialize-DevProcessEnvironment.ps1'
if (Test-Path -LiteralPath $environmentScript) {
    Write-Host "Initializing dev process environment..." -ForegroundColor DarkGray
    . $environmentScript
    $null = Initialize-DevProcessEnvironment
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   VIBETECH MASTER VALIDATION HARNESS SCRIPT   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Workspace Root: $workspaceRoot"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "=============================================" -ForegroundColor Cyan

$results = [System.Collections.Generic.List[PSCustomObject]]::new()

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host "`n>>> Running: ${Name}..." -ForegroundColor Cyan
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $success = $false
    $errorMessage = $null

    try {
        $global:LASTEXITCODE = 0
        & $Action

        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        $success = $true
    }
    catch {
        $errorMessage = $_.Exception.Message
        Write-Host "  [FAIL] ${Name}: $errorMessage" -ForegroundColor Red
    }
    finally {
        $stopwatch.Stop()
    }

    if ($success) {
        Write-Host "  [OK] ${Name} completed in $($stopwatch.Elapsed.TotalSeconds.ToString("F2"))s" -ForegroundColor Green
    }

    $results.Add([pscustomobject]@{
        Name     = $Name
        Success  = $success
        Duration = "$([math]::Round($stopwatch.Elapsed.TotalSeconds, 2))s"
        Error    = $errorMessage
    })
}

# 1. Path Policy Validation
Run-Step -Name "Path Policy Validation" -Action {
    & (Join-Path $PSScriptRoot "check-vibe-paths.ps1")
}

# 2. Database Health Validation
Run-Step -Name "Database Health Validation" -Action {
    $dbHealthReport = Join-Path $workspaceRoot "tmp\database-health-report.json"
    & (Join-Path $PSScriptRoot "database-health.ps1") -OutputPath $dbHealthReport
}

# 3. TypeScript Typechecks
if (-not $SkipTypecheck) {
    Run-Step -Name "TypeScript Typecheck" -Action {
        pnpm run typecheck
    }
} else {
    Write-Host "`n>>> Skipped: TypeScript Typecheck" -ForegroundColor Yellow
}

# 4. Lints (ESLint / Biome checks)
if (-not $SkipLint) {
    Run-Step -Name "Lint & Formatting Checks" -Action {
        pnpm run lint
    }
} else {
    Write-Host "`n>>> Skipped: Lint & Formatting Checks" -ForegroundColor Yellow
}

# 5. Unit / Integration tests (Vitest)
if (-not $SkipTests) {
    Run-Step -Name "Unit & Integration Tests (Vitest)" -Action {
        pnpm run test:unit:all
    }
} else {
    Write-Host "`n>>> Skipped: Unit & Integration Tests" -ForegroundColor Yellow
}

# Summary Output
Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "               SUMMARY REPORT                " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$anyFailures = $false
foreach ($res in $results) {
    $status = if ($res.Success) { "PASS" } else { "FAIL" }
    $color = if ($res.Success) { "Green" } else { "Red" }
    Write-Host "  $status  - $($res.Name) ($($res.Duration))" -ForegroundColor $color
    if (-not $res.Success) {
        $anyFailures = $true
        Write-Host "         Reason: $($res.Error)" -ForegroundColor DarkRed
    }
}
Write-Host "=============================================" -ForegroundColor Cyan

if ($anyFailures) {
    Write-Host "Verification status: FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "Verification status: ALL PASSED" -ForegroundColor Green
    exit 0
}
