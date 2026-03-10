# Test Config Drift Endpoint
# Quick validation script for /api/configs/drift

Write-Host "Testing /api/configs/drift endpoint..." -ForegroundColor Cyan
Write-Host ""

$url = "http://localhost:5177/api/configs/drift"

try {
    Write-Host "Fetching: $url" -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $url -Method GET -TimeoutSec 60

    Write-Host "Success! Found $($response.Length) config types analyzed" -ForegroundColor Green
    Write-Host ""

    # Show summary
    Write-Host "Config Drift Summary:" -ForegroundColor Cyan
    foreach ($config in $response) {
        $driftCount = $config.driftingProjects
        $alignedCount = $config.alignedProjects
        $totalCount = $config.totalProjects

        $status = if ($driftCount -eq 0) { "ALIGNED" } else { "DRIFT DETECTED" }
        $color = if ($driftCount -eq 0) { "Green" } else { "Yellow" }

        Write-Host ""
        Write-Host "  $($config.configFile):" -ForegroundColor White
        Write-Host "    Status: $status" -ForegroundColor $color
        Write-Host "    Total projects: $totalCount"
        Write-Host "    Aligned: $alignedCount" -ForegroundColor Green
        Write-Host "    Drifting: $driftCount" -ForegroundColor $(if ($driftCount -gt 0) { "Yellow" } else { "Gray" })

        # Show first drift details if any
        if ($driftCount -gt 0 -and $config.drifts.Count -gt 0) {
            $firstDrift = $config.drifts[0]
            Write-Host "    Example drift: $($firstDrift.projectName)" -ForegroundColor Gray
            Write-Host "      Differences: $($firstDrift.differences.Count)" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "Totals:" -ForegroundColor Cyan
    $totalDrifting = ($response | Measure-Object -Property driftingProjects -Sum).Sum
    $totalAligned = ($response | Measure-Object -Property alignedProjects -Sum).Sum
    Write-Host "  Aligned configs: $totalAligned" -ForegroundColor Green
    Write-Host "  Drifting configs: $totalDrifting" -ForegroundColor Yellow

} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend is running:" -ForegroundColor Yellow
    Write-Host "  pnpm --filter monorepo-dashboard dev:server" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Test specific config file:" -ForegroundColor Cyan
Write-Host "  Invoke-RestMethod -Uri 'http://localhost:5177/api/configs/drift/tsconfig.json'" -ForegroundColor Gray
