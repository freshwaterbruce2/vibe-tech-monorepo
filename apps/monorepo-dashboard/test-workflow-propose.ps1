# Test script for /api/workflow/propose endpoint
Write-Host "Testing /api/workflow/propose endpoint..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5177/api/workflow/propose" -Method Post -ContentType "application/json"

    Write-Host "✓ Proposal generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor Yellow
    Write-Host ""

    # Summary
    Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
    Write-Host "Total Actions: $($response.summary.totalActions)"
    Write-Host "  Critical: $($response.summary.criticalActions)" -ForegroundColor Red
    Write-Host "  Recommended: $($response.summary.recommendedActions)" -ForegroundColor Yellow
    Write-Host "  Optional: $($response.summary.optionalActions)" -ForegroundColor Gray
    Write-Host ""

    # Actions breakdown
    Write-Host "=== PROPOSED ACTIONS ===" -ForegroundColor Cyan

    # Critical actions first
    $criticalActions = $response.actions | Where-Object { $_.severity -eq "critical" }
    if ($criticalActions.Count -gt 0) {
        Write-Host ""
        Write-Host "CRITICAL ($($criticalActions.Count)):" -ForegroundColor Red
        $criticalActions | Select-Object -First 5 | ForEach-Object {
            Write-Host "  • $($_.title)" -ForegroundColor Red
            Write-Host "    $($_.description)" -ForegroundColor Gray
            Write-Host "    Command: $($_.command)" -ForegroundColor Cyan
            if ($_.affectedProjects) {
                Write-Host "    Affects: $($_.affectedProjects.Count) projects" -ForegroundColor Gray
            }
            Write-Host ""
        }
    }

    # Recommended actions
    $recommendedActions = $response.actions | Where-Object { $_.severity -eq "recommended" }
    if ($recommendedActions.Count -gt 0) {
        Write-Host "RECOMMENDED ($($recommendedActions.Count)):" -ForegroundColor Yellow
        $recommendedActions | Select-Object -First 3 | ForEach-Object {
            Write-Host "  • $($_.title)" -ForegroundColor Yellow
            Write-Host "    $($_.description)" -ForegroundColor Gray
            Write-Host "    Command: $($_.command)" -ForegroundColor Cyan
            Write-Host ""
        }
    }

    # Optional actions (just count)
    $optionalActions = $response.actions | Where-Object { $_.severity -eq "optional" }
    if ($optionalActions.Count -gt 0) {
        Write-Host "OPTIONAL: $($optionalActions.Count) actions available" -ForegroundColor Gray
        Write-Host ""
    }

    Write-Host "Actionable proposal generated!" -ForegroundColor Green

} catch {
    Write-Host "✗ Failed to generate proposal" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend is running:" -ForegroundColor Yellow
    Write-Host "  pnpm --filter monorepo-dashboard dev:server" -ForegroundColor Cyan
}