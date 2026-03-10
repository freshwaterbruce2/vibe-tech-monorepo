# Test script for Nx Cloud Service
# Tests all three endpoints and validates database creation

Write-Host "=== Nx Cloud Service Test ===" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
Write-Host "Checking if backend server is running..." -ForegroundColor Yellow
$backendRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5177/api/health" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "✓ Backend is running" -ForegroundColor Green
    }
} catch {
    Write-Host "✗ Backend is NOT running" -ForegroundColor Red
    Write-Host "  Start it with: pnpm --filter monorepo-dashboard dev:server" -ForegroundColor Gray
}

Write-Host ""

# Check database file
Write-Host "Checking database file..." -ForegroundColor Yellow
$dbPath = "C:\dev\apps\monorepo-dashboard\server\db\dashboard.db"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length
    Write-Host "✓ Database exists: $dbPath ($dbSize bytes)" -ForegroundColor Green
} else {
    Write-Host "✗ Database does not exist yet (will be created on first request)" -ForegroundColor Yellow
}

Write-Host ""

# Test endpoints
if ($backendRunning) {
    Write-Host "Testing Nx Cloud endpoints..." -ForegroundColor Yellow
    Write-Host ""

    # Test 1: Status
    Write-Host "1. GET /api/nx-cloud/status" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5177/api/nx-cloud/status" -Method GET
        Write-Host "   Response:" -ForegroundColor Gray
        Write-Host "   - Connected: $($response.connected)" -ForegroundColor Gray
        Write-Host "   - Auth Required: $($response.authenticationRequired)" -ForegroundColor Gray
        Write-Host "   - Builds in DB: $($response.buildsInDatabase)" -ForegroundColor Gray
        Write-Host "   - Last Sync: $($response.lastSync)" -ForegroundColor Gray
        if ($response.error) {
            Write-Host "   - Error: $($response.error)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""

    # Test 2: Builds
    Write-Host "2. GET /api/nx-cloud/builds?days=7" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5177/api/nx-cloud/builds?days=7" -Method GET
        $buildCount = $response.Count
        Write-Host "   ✓ Fetched $buildCount builds" -ForegroundColor Green
        if ($buildCount -gt 0) {
            Write-Host "   First build:" -ForegroundColor Gray
            Write-Host "   - ID: $($response[0].id)" -ForegroundColor Gray
            Write-Host "   - Branch: $($response[0].branch)" -ForegroundColor Gray
            Write-Host "   - Status: $($response[0].status)" -ForegroundColor Gray
            Write-Host "   - Duration: $($response[0].durationMs)ms" -ForegroundColor Gray
            Write-Host "   - Cache Hit Rate: $([math]::Round($response[0].cacheHitRate * 100, 2))%" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""

    # Test 3: Performance
    Write-Host "3. GET /api/nx-cloud/performance" -ForegroundColor Cyan
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5177/api/nx-cloud/performance" -Method GET
        Write-Host "   Response:" -ForegroundColor Gray
        Write-Host "   - Total Builds: $($response.totalBuilds)" -ForegroundColor Gray
        Write-Host "   - Avg Build Time: $([math]::Round($response.avgBuildTimeMs))ms" -ForegroundColor Gray
        Write-Host "   - Avg Cache Hit Rate: $([math]::Round($response.avgCacheHitRate * 100, 2))%" -ForegroundColor Gray
        Write-Host "   - Success Rate: $([math]::Round($response.successRate * 100, 2))%" -ForegroundColor Gray
        Write-Host "   - Fastest Build: $($response.fastestBuildMs)ms" -ForegroundColor Gray
        Write-Host "   - Slowest Build: $($response.slowestBuildMs)ms" -ForegroundColor Gray
    } catch {
        Write-Host "   ✗ Request failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
}

# Check environment variable
Write-Host "Checking NX_CLOUD_ACCESS_TOKEN..." -ForegroundColor Yellow
if ($env:NX_CLOUD_ACCESS_TOKEN) {
    Write-Host "✓ NX_CLOUD_ACCESS_TOKEN is set" -ForegroundColor Green
} else {
    Write-Host "✗ NX_CLOUD_ACCESS_TOKEN is NOT set" -ForegroundColor Yellow
    Write-Host "  Service will fall back to local .nx/cache" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
