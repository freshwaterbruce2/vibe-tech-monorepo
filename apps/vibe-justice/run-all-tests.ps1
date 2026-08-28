# run-all-tests.ps1
# Comprehensive test runner for Vibe-Justice
# Runs frontend and backend tests with coverage reporting

param(
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Coverage,
    [switch]$Verbose,
    [switch]$Quick
)

$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🧪 VIBE-JUSTICE TEST SUITE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date
$results = @{
    Frontend = @{ Passed = 0; Failed = 0; Skipped = 0; Duration = 0 }
    Backend = @{ Passed = 0; Failed = 0; Skipped = 0; Duration = 0 }
}

# Determine which tests to run
$runFrontend = $Frontend -or (-not $Frontend -and -not $Backend)
$runBackend = $Backend -or (-not $Frontend -and -not $Backend)

# ============================================================================
# BACKEND TESTS
# ============================================================================
if ($runBackend) {
    Write-Host "`n📦 BACKEND TESTS (Python/pytest)" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    
    $backendStart = Get-Date
    Push-Location "$ProjectRoot\backend"
    
    # Activate virtual environment
    if (Test-Path ".venv\Scripts\Activate.ps1") {
        . .\.venv\Scripts\Activate.ps1
    }
    
    # Build pytest command
    $pytestArgs = @("vibe_justice/tests", "-v")
    
    if ($Coverage) {
        $pytestArgs += "--cov=vibe_justice"
        $pytestArgs += "--cov-report=term-missing"
        $pytestArgs += "--cov-report=html:coverage"
    }
    
    if ($Quick) {
        $pytestArgs += "-x"  # Stop on first failure
    }
    
    if ($Verbose) {
        $pytestArgs += "--tb=long"
    } else {
        $pytestArgs += "--tb=short"
    }
    
    Write-Host "Running: python -m pytest $($pytestArgs -join ' ')" -ForegroundColor DarkGray
    
    # Run pytest
    $pytestOutput = & python -m pytest @pytestArgs 2>&1
    $backendExitCode = $LASTEXITCODE
    
    # Display output
    $pytestOutput | ForEach-Object { Write-Host $_ }
    
    # Parse results (basic parsing)
    $passedMatch = $pytestOutput | Select-String -Pattern "(\d+) passed"
    $failedMatch = $pytestOutput | Select-String -Pattern "(\d+) failed"
    $skippedMatch = $pytestOutput | Select-String -Pattern "(\d+) skipped"
    
    if ($passedMatch) { $results.Backend.Passed = [int]$passedMatch.Matches[0].Groups[1].Value }
    if ($failedMatch) { $results.Backend.Failed = [int]$failedMatch.Matches[0].Groups[1].Value }
    if ($skippedMatch) { $results.Backend.Skipped = [int]$skippedMatch.Matches[0].Groups[1].Value }
    
    $backendEnd = Get-Date
    $results.Backend.Duration = ($backendEnd - $backendStart).TotalSeconds
    
    Pop-Location
    
    if ($backendExitCode -eq 0) {
        Write-Host "`n✅ Backend tests PASSED" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Backend tests FAILED (exit code: $backendExitCode)" -ForegroundColor Red
    }
}

# ============================================================================
# FRONTEND TESTS
# ============================================================================
if ($runFrontend) {
    Write-Host "`n🌐 FRONTEND TESTS (Vitest)" -ForegroundColor Yellow
    Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    
    $frontendStart = Get-Date
    Push-Location "$ProjectRoot\frontend"
    
    # Build vitest command
    $vitestArgs = @("run")
    
    if ($Coverage) {
        $vitestArgs += "--coverage"
    }
    
    if ($Verbose) {
        $vitestArgs += "--reporter=verbose"
    }
    
    Write-Host "Running: pnpm vitest $($vitestArgs -join ' ')" -ForegroundColor DarkGray
    
    # Run vitest
    $vitestOutput = & pnpm vitest @vitestArgs 2>&1
    $frontendExitCode = $LASTEXITCODE
    
    # Display output
    $vitestOutput | ForEach-Object { Write-Host $_ }
    
    # Parse results (basic parsing)
    $testMatch = $vitestOutput | Select-String -Pattern "Tests:\s+(\d+)\s+passed"
    if ($testMatch) { $results.Frontend.Passed = [int]$testMatch.Matches[0].Groups[1].Value }
    
    $frontendEnd = Get-Date
    $results.Frontend.Duration = ($frontendEnd - $frontendStart).TotalSeconds
    
    Pop-Location
    
    if ($frontendExitCode -eq 0) {
        Write-Host "`n✅ Frontend tests PASSED" -ForegroundColor Green
    } else {
        Write-Host "`n❌ Frontend tests FAILED (exit code: $frontendExitCode)" -ForegroundColor Red
    }
}

# ============================================================================
# SUMMARY
# ============================================================================
$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalSeconds

Write-Host "`n"
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($runBackend) {
    $backendStatus = if ($results.Backend.Failed -eq 0) { "✅" } else { "❌" }
    Write-Host "`n  Backend:  $backendStatus $($results.Backend.Passed) passed, $($results.Backend.Failed) failed, $($results.Backend.Skipped) skipped  ($([math]::Round($results.Backend.Duration, 2))s)"
}

if ($runFrontend) {
    $frontendStatus = if ($results.Frontend.Failed -eq 0) { "✅" } else { "❌" }
    Write-Host "  Frontend: $frontendStatus $($results.Frontend.Passed) passed, $($results.Frontend.Failed) failed  ($([math]::Round($results.Frontend.Duration, 2))s)"
}

Write-Host "`n  Total Duration: $([math]::Round($totalDuration, 2)) seconds" -ForegroundColor DarkGray

$totalFailed = $results.Backend.Failed + $results.Frontend.Failed
if ($totalFailed -eq 0) {
    Write-Host "`n  🎉 ALL TESTS PASSED!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n  ⚠️  $totalFailed test(s) failed" -ForegroundColor Red
    exit 1
}
