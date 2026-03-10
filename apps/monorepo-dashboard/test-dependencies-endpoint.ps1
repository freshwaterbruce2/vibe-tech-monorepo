# Test Dependencies Endpoint
# Quick validation script for /api/dependencies/check

Write-Host "Testing /api/dependencies/check endpoint..." -ForegroundColor Cyan
Write-Host ""

$url = "http://localhost:5177/api/dependencies/check"

try {
    Write-Host "Fetching: $url" -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 30

    Write-Host "Success! Found $($response.Length) dependency updates" -ForegroundColor Green
    Write-Host ""

    # Show first 5 updates
    Write-Host "Sample Updates (first 5):" -ForegroundColor Cyan
    $response | Select-Object -First 5 | Format-Table name, current, latest, severity, category -AutoSize

    # Show severity breakdown
    $critical = ($response | Where-Object { $_.severity -eq "critical" }).Count
    $recommended = ($response | Where-Object { $_.severity -eq "recommended" }).Count
    $optional = ($response | Where-Object { $_.severity -eq "optional" }).Count

    Write-Host ""
    Write-Host "Severity Breakdown:" -ForegroundColor Cyan
    Write-Host "  Critical:    $critical" -ForegroundColor Red
    Write-Host "  Recommended: $recommended" -ForegroundColor Yellow
    Write-Host "  Optional:    $optional" -ForegroundColor Gray

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend is running:" -ForegroundColor Yellow
    Write-Host "  pnpm --filter monorepo-dashboard dev:server" -ForegroundColor Gray
}
