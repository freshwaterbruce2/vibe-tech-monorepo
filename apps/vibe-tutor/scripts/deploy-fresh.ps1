# Vibe-Tutor: Clean Build & Deploy to Android A54
# This script performs a complete clean build and deployment
# Run from C:\dev\Vibe-Tutor directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vibe-Tutor Fresh Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ensure we're in the correct directory
$currentDir = Get-Location
if ($currentDir.Path -notlike "*Vibe-Tutor") {
    Write-Host "ERROR: Must run from C:\dev\Vibe-Tutor directory" -ForegroundColor Red
    Write-Host "Current directory: $currentDir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run this command first:" -ForegroundColor Yellow
    Write-Host "  cd C:\dev\Vibe-Tutor" -ForegroundColor White
    exit 1
}

Write-Host "Step 1: Cleaning old build artifacts..." -ForegroundColor Yellow
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .capacitor -ErrorAction SilentlyContinue
Write-Host "  Clean complete!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Building web assets..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Build failed! Check errors above." -ForegroundColor Red
    exit 1
}
Write-Host "  Build successful!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Syncing to Android..." -ForegroundColor Yellow
npm run android:sync
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Sync failed! Check errors above." -ForegroundColor Red
    exit 1
}
Write-Host "  Sync complete!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 4: Building Android APK..." -ForegroundColor Yellow
cd android
.\gradlew.bat clean assembleDebug
$gradleExit = $LASTEXITCODE
cd ..
if ($gradleExit -ne 0) {
    Write-Host "  APK build failed! Check Gradle errors above." -ForegroundColor Red
    exit 1
}
Write-Host "  APK built successfully!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 5: Deploying to device..." -ForegroundColor Yellow
Write-Host "  Uninstalling old version..." -ForegroundColor Gray
adb uninstall com.vibetech.tutor 2>$null
Write-Host "  Installing new version..." -ForegroundColor Gray
adb install android\app\build\outputs\apk\debug\app-debug.apk
if ($LASTEXITCODE -ne 0) {
    Write-Host "  Install failed! Is device connected?" -ForegroundColor Red
    Write-Host "  Check: adb devices" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Successful!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open Vibe-Tutor on your Galaxy A54" -ForegroundColor White
Write-Host "  2. Test Music section (radio streams)" -ForegroundColor White
Write-Host "  3. Look for chevron button in bottom nav to collapse it" -ForegroundColor White
Write-Host ""
Write-Host "To debug on device:" -ForegroundColor Yellow
Write-Host "  chrome://inspect in Chrome browser" -ForegroundColor White
Write-Host "  or run: adb logcat | findstr Capacitor" -ForegroundColor White
Write-Host ""
