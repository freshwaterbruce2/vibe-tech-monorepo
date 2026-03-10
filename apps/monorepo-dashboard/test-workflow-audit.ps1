# Test script for /api/workflow/audit endpoint
Write-Host "Testing /api/workflow/audit endpoint..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5177/api/workflow/audit" -Method Post -ContentType "application/json"

    Write-Host "✓ Audit completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor Yellow
    Write-Host ""

    # Summary
    Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Total Issues: $($response.summary.totalIssues)" -ForegroundColor $(if ($response.summary.totalIssues -gt 0) { "Yellow" } else { "Green" })
    Write-Host "Critical Issues: $($response.summary.criticalIssues)" -ForegroundColor $(if ($response.summary.criticalIssues -gt 0) { "Red" } else { "Green" })
    Write-Host ""

    # Dependencies
    Write-Host "=== DEPENDENCIES ===" -ForegroundColor Cyan
    Write-Host "Total Updates: $($response.summary.dependencies.totalUpdates)"
    Write-Host "  Critical: $($response.summary.dependencies.critical)" -ForegroundColor Red
    Write-Host "  Recommended: $($response.summary.dependencies.recommended)" -ForegroundColor Yellow
    Write-Host "  Optional: $($response.summary.dependencies.optional)" -ForegroundColor Gray
    Write-Host ""

    # Configs
    Write-Host "=== CONFIGS ===" -ForegroundColor Cyan
    Write-Host "Total Drifts: $($response.summary.configs.totalDrifts)"
    Write-Host "  Major Drifts: $($response.summary.configs.majorDrifts)" -ForegroundColor Red
    Write-Host "  Minor Drifts: $($response.summary.configs.minorDrifts)" -ForegroundColor Yellow
    Write-Host ""

    # Sample dependency updates (first 3)
    if ($response.dependencies.Count -gt 0) {
        Write-Host "=== SAMPLE DEPENDENCY UPDATES (first 3) ===" -ForegroundColor Cyan
        $response.dependencies | Select-Object -First 3 | ForEach-Object {
            $color = switch ($_.severity) {
                "critical" { "Red" }
                "recommended" { "Yellow" }
                "optional" { "Gray" }
            }
            Write-Host "  [$($_.severity.ToUpper())] $($_.name): $($_.current) → $($_.latest)" -ForegroundColor $color
        }
        Write-Host ""
    }

    # Sample config drifts
    if ($response.configs.Count -gt 0) {
        Write-Host "=== CONFIG FILES ANALYZED ===" -ForegroundColor Cyan
        $response.configs | ForEach-Object {
            $status = if ($_.driftingProjects -eq 0) { "✓ ALIGNED" } else { "⚠ DRIFT" }
            $color = if ($_.driftingProjects -eq 0) { "Green" } else { "Yellow" }
            Write-Host "  $status $($_.configFile) ($($_.driftingProjects) drifting, $($_.alignedProjects) aligned)" -ForegroundColor $color
        }
        Write-Host ""
    }

    Write-Host "Full audit data returned successfully!" -ForegroundColor Green

} catch {
    Write-Host "✗ Failed to fetch audit data" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend is running:" -ForegroundColor Yellow
    Write-Host "  pnpm --filter monorepo-dashboard dev:server" -ForegroundColor Cyan
}