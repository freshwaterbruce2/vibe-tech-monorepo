# Pre-Build Verification for Vibe Code Studio
# Checks all requirements before building

$environmentScript = Join-Path $PSScriptRoot '..\..\..\scripts\Initialize-DevProcessEnvironment.ps1'
. $environmentScript
$null = Initialize-DevProcessEnvironment
Push-Location (Join-Path $PSScriptRoot '..')

try {
    Write-Host "Pre-Build Verification Checklist" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host ""

    $allChecks = $true

    # Check 1: Node.js version
    Write-Host "[1] Checking Node.js version..." -ForegroundColor Yellow
    try {
        $nodeVersion = node --version
        Write-Host "   OK Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR Node.js not found!" -ForegroundColor Red
        $allChecks = $false
    }

    # Check 2: npm version
    Write-Host "[2] Checking npm version..." -ForegroundColor Yellow
    try {
        $npmVersion = npm --version
        Write-Host "   OK npm: v$npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "   ERROR npm not found!" -ForegroundColor Red
        $allChecks = $false
    }

    # Check 3: package.json exists
    Write-Host "[3] Checking package.json..." -ForegroundColor Yellow
    if (Test-Path "C:\dev\apps\vibe-code-studio\package.json") {
        Write-Host "   OK package.json found" -ForegroundColor Green
    } else {
        Write-Host "   ERROR package.json missing!" -ForegroundColor Red
        $allChecks = $false
    }

    # Check 4: electron-builder config
    Write-Host "[4] Checking electron-builder.yml..." -ForegroundColor Yellow
    if (Test-Path "C:\dev\apps\vibe-code-studio\electron-builder.yml") {
        Write-Host "   OK electron-builder.yml found" -ForegroundColor Green
    } else {
        Write-Host "   ERROR electron-builder.yml missing!" -ForegroundColor Red
        $allChecks = $false
    }

    # Check 5: Source files exist
    Write-Host "[5] Checking source files..." -ForegroundColor Yellow
    if (Test-Path "C:\dev\apps\vibe-code-studio\src") {
        Write-Host "   OK src directory found" -ForegroundColor Green
    } else {
        Write-Host "   ERROR src directory missing!" -ForegroundColor Red
        $allChecks = $false
    }

    # Check 6: Node modules installed
    Write-Host "[6] Checking node_modules..." -ForegroundColor Yellow
    if (Test-Path "C:\dev\apps\vibe-code-studio\node_modules") {
        Write-Host "   OK node_modules found" -ForegroundColor Green
    } else {
        Write-Host "   ERROR node_modules missing - run 'npm install' first!" -ForegroundColor Red
        $allChecks = $false
    }

    # Check 7: Intelligence Engine files
    Write-Host "[7] Checking Intelligence Engine..." -ForegroundColor Yellow
    if (Test-Path "C:\dev\apps\vibe-code-studio\electron\services\intelligence.ts") {
        Write-Host "   OK Intelligence Engine files found" -ForegroundColor Green
    } else {
        Write-Host "   ERROR Intelligence Engine missing!" -ForegroundColor Red
        $allChecks = $false
    }

    # Check 8: Settings component verification
    Write-Host "[8] Verifying Settings implementation..." -ForegroundColor Yellow
    if (Test-Path "C:\dev\apps\vibe-code-studio\src\components\Settings.tsx") {
        Write-Host "   OK Settings.tsx found (active)" -ForegroundColor Green

        # Check if SettingsModal is being used (should not be)
        $appLayoutContent = Get-Content "C:\dev\apps\vibe-code-studio\src\app\AppLayout.tsx" -Raw
        if ($appLayoutContent -match "LazySettings") {
            Write-Host "   OK Using LazySettings (correct)" -ForegroundColor Green
        } else {
            Write-Host "   WARNING LazySettings not found in AppLayout" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ERROR Settings.tsx missing!" -ForegroundColor Red
        $allChecks = $false
    }

    # Final summary
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Cyan
    if ($allChecks) {
        Write-Host "SUCCESS All checks passed! Ready to build." -ForegroundColor Green
        Write-Host ""
        Write-Host "Run: .\build-and-package.ps1" -ForegroundColor Yellow
    } else {
        Write-Host "FAILED Some checks failed. Fix issues before building." -ForegroundColor Red
    }
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host ""
} finally {
    Pop-Location
}
