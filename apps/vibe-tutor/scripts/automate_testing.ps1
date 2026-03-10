# Automated Testing Script for Vibe-Tutor v1.0.14
# What CAN be automated vs what requires manual testing

Write-Host "===== Vibe-Tutor v1.0.14 Automated Testing =====" -ForegroundColor Cyan
Write-Host ""

# 1. ✅ AUTOMATED: Version Verification
Write-Host "[1/8] Verifying app version..." -ForegroundColor Yellow
$version = adb shell dumpsys package com.vibetech.tutor | Select-String "versionCode"
if ($version -match "versionCode=15") {
    Write-Host "  ✅ Version correct: versionCode=15" -ForegroundColor Green
} else {
    Write-Host "  ❌ Version mismatch: $version" -ForegroundColor Red
    exit 1
}
Start-Sleep -Seconds 1

# 2. ✅ AUTOMATED: App Installation Check
Write-Host "[2/8] Checking app installation..." -ForegroundColor Yellow
$installed = adb shell pm list packages | Select-String "com.vibetech.tutor"
if ($installed) {
    Write-Host "  ✅ App installed successfully" -ForegroundColor Green
} else {
    Write-Host "  ❌ App not found on device" -ForegroundColor Red
    exit 1
}
Start-Sleep -Seconds 1

# 3. ✅ AUTOMATED: Launch App
Write-Host "[3/8] Launching Vibe-Tutor app..." -ForegroundColor Yellow
adb shell am start -n com.vibetech.tutor/.MainActivity -W | Out-Null
Start-Sleep -Seconds 5  # Wait for app to fully load
Write-Host "  ✅ App launched" -ForegroundColor Green

# 4. ✅ AUTOMATED: Screenshot Capture
Write-Host "[4/8] Capturing screenshot..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
adb exec-out screencap -p > "test_screenshots/automated_test_$timestamp.png"
Write-Host "  ✅ Screenshot saved: test_screenshots/automated_test_$timestamp.png" -ForegroundColor Green
Start-Sleep -Seconds 1

# 5. ✅ AUTOMATED: Check for JavaScript Errors
Write-Host "[5/8] Checking for JavaScript errors..." -ForegroundColor Yellow
adb logcat -d -s chromium:E Capacitor:E | Out-File -FilePath "test_screenshots/error_log_$timestamp.txt"
$errorCount = (Get-Content "test_screenshots/error_log_$timestamp.txt" | Where-Object { $_ -match "ERROR" }).Count
if ($errorCount -eq 0) {
    Write-Host "  ✅ No JavaScript errors found" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Found $errorCount potential errors - review log file" -ForegroundColor Yellow
}
Start-Sleep -Seconds 1

# 6. ⚠️ SEMI-AUTOMATED: Navigate to Dashboard (tap coordinates)
Write-Host "[6/8] Attempting to navigate to dashboard..." -ForegroundColor Yellow
Write-Host "  ⚠️  Requires manual verification of tap location" -ForegroundColor Yellow
# These coordinates are estimates - would need to be calibrated for Samsung Galaxy A54
# adb shell input tap 200 200  # Example: tap dashboard button
Write-Host "  ℹ️  Manual step: Ensure app is on Dashboard view" -ForegroundColor Cyan

# 7. ❌ CANNOT AUTOMATE: localStorage Inspection
Write-Host "[7/8] LocalStorage inspection..." -ForegroundColor Yellow
Write-Host "  ❌ Cannot automate - requires Chrome DevTools" -ForegroundColor Red
Write-Host "  ℹ️  Manual step: Use chrome://inspect to check:" -ForegroundColor Cyan
Write-Host "     - localStorage.getItem('user-goals')" -ForegroundColor White
Write-Host "     - localStorage.getItem('focusStats')" -ForegroundColor White

# 8. ❌ CANNOT AUTOMATE: Visual UI Element Verification
Write-Host "[8/8] Goals Panel visual verification..." -ForegroundColor Yellow
Write-Host "  ❌ Cannot automate - requires human visual inspection" -ForegroundColor Red
Write-Host "  ℹ️  Manual step: Check screenshot for:" -ForegroundColor Cyan
Write-Host "     - Goals Panel visible next to WeekProgress" -ForegroundColor White
Write-Host "     - 4 default goals displayed" -ForegroundColor White
Write-Host "     - Progress bars render correctly" -ForegroundColor White

Write-Host ""
Write-Host "===== Automated Tests Complete =====" -ForegroundColor Cyan
Write-Host ""
Write-Host "RESULTS:" -ForegroundColor White
Write-Host "  ✅ Automated: Version check, installation, launch, screenshot, error logs" -ForegroundColor Green
Write-Host "  ⚠️  Semi-automated: Navigation (needs coordinate calibration)" -ForegroundColor Yellow
Write-Host "  ❌ Manual required: localStorage inspection, visual verification, functional testing" -ForegroundColor Red
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor White
Write-Host "  1. Review screenshot: test_screenshots/automated_test_$timestamp.png" -ForegroundColor White
Write-Host "  2. Open chrome://inspect to check localStorage" -ForegroundColor White
Write-Host "  3. Manually test - Complete focus session, complete homework task" -ForegroundColor White
Write-Host "  4. Verify Goals Panel updates in real-time" -ForegroundColor White
Write-Host ""
