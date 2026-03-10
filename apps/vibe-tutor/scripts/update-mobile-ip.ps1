# Script to update mobile API URL with your computer's IP address

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   UPDATE MOBILE IP ADDRESS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the local IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1).IPAddress

if (-not $ipAddress) {
    Write-Host "[ERROR] Could not determine local IP address" -ForegroundColor Red
    Write-Host "Please update src/config.ts manually with your computer's IP" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Found IP Address: $ipAddress" -ForegroundColor Green

# Update the config file
$configFile = "src\config.ts"
$content = Get-Content $configFile -Raw

# Replace the IP address in the config
$pattern = "const MOBILE_API_URL = 'http://[\d\.]+:3001';"
$replacement = "const MOBILE_API_URL = 'http://$ipAddress`:3001';"

$newContent = $content -replace $pattern, $replacement

# Save the updated config
Set-Content $configFile $newContent

Write-Host "[OK] Updated $configFile with IP: $ipAddress" -ForegroundColor Green
Write-Host ""

# Also update the server CORS settings to allow this IP
$serverFile = "server.mjs"
if (Test-Path $serverFile) {
    $serverContent = Get-Content $serverFile -Raw

    # Check if the IP is in the CORS origins
    if ($serverContent -notmatch "http://$ipAddress") {
        Write-Host "[INFO] Adding $ipAddress to CORS allowed origins" -ForegroundColor Yellow

        # Update CORS origins
        $corsPattern = "origin: process\.env\.NODE_ENV === 'production'\s*\?\s*\[([^\]]+)\]\s*:\s*\[([^\]]+)\]"

        $newCorsProduction = "'https://your-app-domain.com', 'capacitor://localhost', 'http://$ipAddress`:5173'"
        $newCorsDev = "'http://localhost:5173', 'http://localhost:3000', 'capacitor://localhost', 'http://$ipAddress`:5173'"

        $replacement = @"
origin: process.env.NODE_ENV === 'production'
    ? [$newCorsProduction]
    : [$newCorsDev]
"@

        $serverContent = $serverContent -replace $corsPattern, $replacement
        Set-Content $serverFile $serverContent

        Write-Host "[OK] Updated CORS settings in server.mjs" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   CONFIGURATION UPDATED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mobile devices will connect to:" -ForegroundColor Cyan
Write-Host "  >>> http://$ipAddress`:3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "Make sure:" -ForegroundColor Cyan
Write-Host "1. Your phone is on the same WiFi network" -ForegroundColor White
Write-Host "2. Windows Firewall allows Node.js connections" -ForegroundColor White
Write-Host "3. The backend server is running (port 3001)" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  npm run build" -ForegroundColor Gray
Write-Host "  npx cap sync android" -ForegroundColor Gray
Write-Host "  npx cap run android" -ForegroundColor Gray