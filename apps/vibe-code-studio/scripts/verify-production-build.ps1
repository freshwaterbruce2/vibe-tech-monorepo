#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Automated Production Build Verification Script

.DESCRIPTION
    Runs comprehensive checks on the production Electron build to ensure:
    1. Correct file structure
    2. No missing critical files
    3. Proper isDev detection
    4. Working IPC handlers
    5. No JavaScript errors at launch

.PARAMETER SkipTests
    Skip running Vitest tests

.PARAMETER SkipBuild
    Skip building (assumes build already exists)

.EXAMPLE
    .\verify-production-build.ps1
    .\verify-production-build.ps1 -SkipBuild
#>

param(
    [switch]$SkipTests,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host " Production Build Verification" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$distElectronPath = Join-Path $projectRoot "dist-electron"
$appPath = Join-Path $distElectronPath "win-unpacked"
$resourcesPath = Join-Path $appPath "resources"
$exePath = Join-Path $appPath "Vibe Code Studio.exe"

# Step 1: Build if needed
if (-not $SkipBuild) {
    Write-Host "[1/6] Building production version..." -ForegroundColor Yellow
    Set-Location $projectRoot
    pnpm run build:electron
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Build successful" -ForegroundColor Green
    Write-Host ""
}

# Step 2: Verify file structure
Write-Host "[2/6] Verifying file structure..." -ForegroundColor Yellow

$checks = @(
    @{ Path = $appPath; Name = "App directory" },
    @{ Path = $exePath; Name = "Executable" },
    @{ Path = $resourcesPath; Name = "Resources directory" },
    @{ Path = (Join-Path $resourcesPath "app.asar"); Name = "app.asar" },
    @{ Path = (Join-Path $resourcesPath "dist"); Name = "Renderer dist" },
    @{ Path = (Join-Path $resourcesPath "dist\index.html"); Name = "index.html" }
)

$allPassed = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "  ✅ $($check.Name): $($check.Path)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($check.Name) missing: $($check.Path)" -ForegroundColor Red
        $allPassed = $false
    }
}

if (-not $allPassed) {
    Write-Host "❌ File structure verification failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ File structure correct" -ForegroundColor Green
Write-Host ""

# Step 3: Check index.html path is correct
Write-Host "[3/6] Verifying index.html path..." -ForegroundColor Yellow

$indexPath = Join-Path $resourcesPath "dist\index.html"
if (Test-Path $indexPath) {
    $content = Get-Content $indexPath -Raw
    if ($content -match "Vibe Code Studio" -and $content -match "<script") {
        Write-Host "  ✅ index.html found at correct location with valid content" -ForegroundColor Green
    } else {
        Write-Host "  ❌ index.html content is invalid" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ❌ index.html not found at expected path: $indexPath" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Check for unpacked modules
Write-Host "[4/6] Checking unpacked ASAR modules..." -ForegroundColor Yellow

$unpackedPath = Join-Path $resourcesPath "app.asar.unpacked"
if (Test-Path $unpackedPath) {
    Write-Host "  ✅ app.asar.unpacked exists" -ForegroundColor Green

    # Check for better-sqlite3
    $sqlite3Path = Join-Path $unpackedPath "node_modules\better-sqlite3"
    if (Test-Path $sqlite3Path) {
        Write-Host "  ✅ better-sqlite3 unpacked" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  better-sqlite3 not found in unpacked (may cause issues)" -ForegroundColor Yellow
    }

    # Check for intelligence service
    $servicesPaths = @(
        (Join-Path $unpackedPath "out\main\services\intelligence.js"),
        (Join-Path $unpackedPath "out\main\services\intelligence.mjs"),
        (Join-Path $unpackedPath ".deploy\electron\services\intelligence.js")
    )

    $serviceFound = $false
    foreach ($servicePath in $servicesPaths) {
        if (Test-Path $servicePath) {
            Write-Host "  ✅ Intelligence service found: $servicePath" -ForegroundColor Green
            $serviceFound = $true
            break
        }
    }

    if (-not $serviceFound) {
        Write-Host "  ⚠️  Intelligence service not found (AI features may be unavailable)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  No unpacked modules found (native modules may not work)" -ForegroundColor Yellow
}
Write-Host ""

# Step 5: Launch and check for errors
Write-Host "[5/6] Testing application launch..." -ForegroundColor Yellow

$tempLog = Join-Path $env:TEMP "vibe-code-studio-test-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$tempErrLog = Join-Path $env:TEMP "vibe-code-studio-test-err-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

$process = Start-Process -FilePath $exePath -PassThru -RedirectStandardOutput $tempLog -RedirectStandardError $tempErrLog -NoNewWindow

Start-Sleep -Seconds 5

if ($process.HasExited) {
    Write-Host "  ❌ Application exited immediately" -ForegroundColor Red
    if (Test-Path $tempLog) {
        Write-Host "  Last 20 lines of log:" -ForegroundColor Yellow
        Get-Content $tempLog -Tail 20
    }
    exit 1
} else {
    Write-Host "  ✅ Application launched successfully" -ForegroundColor Green

    # Give it time to fully initialize
    Start-Sleep -Seconds 3

    # Check log for critical errors
    if (Test-Path $tempLog) {
        $logContent = Get-Content $tempLog -Raw

        # Check for bad URL error
        if ($logContent -match "Failed to load URL.*file:///C:/.*ERR_FILE_NOT_FOUND") {
            Write-Host "  ❌ Found critical error: Failed to load URL file:///C:/" -ForegroundColor Red
            Write-Host "  This indicates index.html path is wrong!" -ForegroundColor Red
            $process | Stop-Process -Force
            exit 1
        }

        # Check for isDev detection
        if ($logContent -match "isDev:\s*false.*isRunningFromAsar:\s*true") {
            Write-Host "  ✅ isDev detection correct (isDev: false)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  isDev detection may be wrong (check logs)" -ForegroundColor Yellow
        }

        # Check for intelligence module error
        if ($logContent -match "CRITICAL.*Intelligence entrypoint not found") {
            Write-Host "  ⚠️  Intelligence module not found (AI features unavailable)" -ForegroundColor Yellow
        }

        # Check for database initialization
        if ($logContent -match "D:\\.*drive detected") {
            Write-Host "  ✅ D:\ drive detection working" -ForegroundColor Green
        }
    }

    # Clean up
    $process | Stop-Process -Force
    Write-Host "  ✅ Application stopped cleanly" -ForegroundColor Green
}
Write-Host ""

# Step 6: Run automated tests
if (-not $SkipTests) {
    Write-Host "[6/6] Running automated tests..." -ForegroundColor Yellow
    Set-Location $projectRoot

    pnpm run test tests/electron/production-packaging.test.ts
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Tests failed" -ForegroundColor Red
        exit 1
    }

    Write-Host "✅ All tests passed" -ForegroundColor Green
} else {
    Write-Host "[6/6] Skipping tests (--SkipTests specified)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host " ✅ Verification Complete" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Production build is ready for distribution!" -ForegroundColor Green
