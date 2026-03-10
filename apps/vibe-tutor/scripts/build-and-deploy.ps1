#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build and deploy Vibe-Tutor to Android device (A54)

.DESCRIPTION
    Complete build pipeline with cache clearing, APK generation, and device installation.
    Automatically increments versionCode and handles all cleanup.

.PARAMETER SkipVersionIncrement
    Skip automatic versionCode increment (use current version)

.PARAMETER SkipUninstall
    Skip uninstalling old app (faster but may cause cache issues)

.EXAMPLE
    .\build-and-deploy.ps1
    Full build with version increment

.EXAMPLE
    .\build-and-deploy.ps1 -SkipVersionIncrement
    Build without incrementing version
#>

param(
    [switch]$SkipVersionIncrement,
    [switch]$SkipUninstall
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Vibe-Tutor Build & Deploy Pipeline ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# Check we're in Vibe-Tutor directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: Must run from Vibe-Tutor directory" -ForegroundColor Red
    exit 1
}

# Step 1: Increment versionCode
if (-not $SkipVersionIncrement) {
    Write-Host "[Step 1/7] Incrementing versionCode..." -ForegroundColor Yellow

    $gradlePath = "android\app\build.gradle"
    $gradleContent = Get-Content $gradlePath -Raw

    if ($gradleContent -match 'versionCode\s+(\d+)') {
        $currentVersion = [int]$matches[1]
        $newVersion = $currentVersion + 1
        $gradleContent = $gradleContent -replace "versionCode\s+\d+", "versionCode $newVersion"
        Set-Content -Path $gradlePath -Value $gradleContent
        Write-Host "  ✓ Version: $currentVersion → $newVersion" -ForegroundColor Green
    } else {
        Write-Host "  ! Could not find versionCode, skipping..." -ForegroundColor Yellow
    }
} else {
    Write-Host "[Step 1/7] Skipping version increment (as requested)" -ForegroundColor Gray
}

# Step 2: Clean build artifacts
Write-Host "`n[Step 2/7] Cleaning build artifacts..." -ForegroundColor Yellow

$pathsToClean = @(
    "dist",
    "android\app\build",
    "android\build",
    "android\.gradle",
    ".capacitor"
)

foreach ($path in $pathsToClean) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "  ✓ Removed: $path" -ForegroundColor Green
    }
}

# Step 3: Build web assets
Write-Host "`n[Step 3/7] Building web assets..." -ForegroundColor Yellow
pnpm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Web build complete" -ForegroundColor Green

# Step 4: Sync to Android
Write-Host "`n[Step 4/7] Syncing to Android..." -ForegroundColor Yellow
pnpm exec cap sync android

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Capacitor sync complete" -ForegroundColor Green

# Step 5: Build APK
Write-Host "`n[Step 5/7] Building APK (clean build)..." -ForegroundColor Yellow
Push-Location android
.\gradlew.bat clean assembleDebug
$buildResult = $LASTEXITCODE
Pop-Location

if ($buildResult -ne 0) {
    Write-Host "  ✗ APK build failed!" -ForegroundColor Red
    exit 1
}

$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "  ✓ APK built successfully ($($apkSize.ToString('F2')) MB)" -ForegroundColor Green
} else {
    Write-Host "  ✗ APK file not found at $apkPath" -ForegroundColor Red
    exit 1
}

# Step 6: Uninstall old version
if (-not $SkipUninstall) {
    Write-Host "`n[Step 6/7] Uninstalling old version..." -ForegroundColor Yellow

    # Check if device is connected
    $devices = adb devices | Select-String -Pattern "device$"
    if ($devices.Count -eq 0) {
        Write-Host "  ! No Android device connected" -ForegroundColor Yellow
        Write-Host "  Connect device via USB and enable USB debugging" -ForegroundColor Yellow
        exit 1
    }

    adb uninstall com.vibetech.tutor 2>$null
    Write-Host "  ✓ Old version uninstalled (if existed)" -ForegroundColor Green
} else {
    Write-Host "`n[Step 6/7] Skipping uninstall (as requested)" -ForegroundColor Gray
}

# Step 7: Install new version
Write-Host "`n[Step 7/7] Installing new version..." -ForegroundColor Yellow
adb install $apkPath

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Installation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Installation complete" -ForegroundColor Green

# Success summary
Write-Host "`n=== Build & Deploy Complete ===" -ForegroundColor Cyan
Write-Host "APK Location: $apkPath" -ForegroundColor White
Write-Host "APK Size: $($apkSize.ToString('F2')) MB" -ForegroundColor White
Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Open app on device" -ForegroundColor White
Write-Host "  2. Test Word Hunt: Brain Games → Word Search → Math" -ForegroundColor White
Write-Host "  3. Verify grid fits screen (no overflow)" -ForegroundColor White
Write-Host "  4. Test touch selection across letters" -ForegroundColor White
Write-Host "  5. Check console logs: chrome://inspect/#devices" -ForegroundColor White
Write-Host ""
