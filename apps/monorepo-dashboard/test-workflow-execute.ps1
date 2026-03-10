# Test script for /api/workflow/execute endpoint
Write-Host "Testing /api/workflow/execute endpoint..." -ForegroundColor Cyan
Write-Host ""

# Sample execution: try to execute first 3 dependency updates (indices 0, 1, 2)
$body = @{
    actionIndices = @(0, 1, 2)
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5177/api/workflow/execute" -Method Post -ContentType "application/json" -Body $body

    Write-Host "✓ Execution completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor Yellow
    Write-Host "Backup Created: $($response.backupCreated)" -ForegroundColor $(if ($response.backupCreated) { "Green" } else { "Yellow" })
    Write-Host ""

    # Summary
    Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Total Attempted: $($response.summary.totalAttempted)"
    Write-Host "Successful: $($response.summary.successful)" -ForegroundColor Green
    Write-Host "Failed: $($response.summary.failed)" -ForegroundColor $(if ($response.summary.failed -gt 0) { "Red" } else { "Gray" })
    Write-Host ""

    # Results
    Write-Host "=== RESULTS ===" -ForegroundColor Cyan
    foreach ($result in $response.results) {
        $status = if ($result.success) { "✓ SUCCESS" } else { "✗ FAILED" }
        $color = if ($result.success) { "Green" } else { "Red" }

        Write-Host "$status - $($result.action.title)" -ForegroundColor $color
        Write-Host "  Type: $($result.action.type)" -ForegroundColor Gray
        Write-Host "  Severity: $($result.action.severity)" -ForegroundColor Yellow

        if ($result.output) {
            Write-Host "  Output:" -ForegroundColor Cyan
            Write-Host "    $($result.output)" -ForegroundColor Gray
        }

        if ($result.error) {
            Write-Host "  Error:" -ForegroundColor Red
            Write-Host "    $($result.error)" -ForegroundColor Gray
        }

        Write-Host ""
    }

    Write-Host "NOTE: Actual command execution is disabled for safety." -ForegroundColor Yellow
    Write-Host "Commands are reported but not executed. Run them manually if needed." -ForegroundColor Yellow

} catch {
    Write-Host "✗ Failed to execute actions" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend is running:" -ForegroundColor Yellow
    Write-Host "  pnpm --filter monorepo-dashboard dev:server" -ForegroundColor Cyan
}