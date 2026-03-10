# Creates an ADB reverse proxy so your physical Android device
# can reach the local Nova Agent developing backend at localhost

$backendPort = 3000
$metroPort = 8081

Write-Host "Setting up ADB reverse proxy for ports $backendPort and $metroPort..." -ForegroundColor Cyan

# Check if adb is available
if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    Write-Host "Error: 'adb' command not found." -ForegroundColor Red
    Write-Host "Please ensure Android SDK Platform-Tools is installed" -ForegroundColor Yellow
    Write-Host "and added to your system PATH." -ForegroundColor Yellow
    exit 1
}

# Run the command
$result1 = adb reverse tcp:$backendPort tcp:$backendPort
$result2 = adb reverse tcp:$metroPort tcp:$metroPort

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ADB reverse proxy established successfully." -ForegroundColor Green
    Write-Host "Your physical Android device can now reach the Nova Agent backend at http://localhost:$backendPort" -ForegroundColor Green
    Write-Host "and the Expo Metro bundler at http://localhost:$metroPort" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to set up ADB reverse proxy." -ForegroundColor Red
    Write-Host "Make sure your device is connected via USB and USB debugging is enabled." -ForegroundColor Yellow
    Write-Host "Error details: $result1 $result2" -ForegroundColor Red
}
