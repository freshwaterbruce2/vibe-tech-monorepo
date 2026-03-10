# OpenRouter Proxy Connection Test
# Tests if the proxy is running and accessible

Write-Host "🔍 Testing OpenRouter Proxy Connection..." -ForegroundColor Cyan
Write-Host ""

$proxyUrl = "http://localhost:3001"

# Test 1: Health Check
Write-Host "[1/3] Testing health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$proxyUrl/health" -UseBasicParsing -TimeoutSec 5
    $health = $response.Content | ConvertFrom-Json
    
    if ($health.status -eq "ok") {
        Write-Host "✅ Health check passed" -ForegroundColor Green
        Write-Host "   Uptime: $([math]::Round($health.uptime, 2))s" -ForegroundColor Gray
    } else {
        Write-Host "❌ Health check failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Cannot connect to proxy at $proxyUrl" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Start the proxy with: pnpm nx dev openrouter-proxy" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Root Endpoint
Write-Host "[2/3] Testing root endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$proxyUrl/" -UseBasicParsing -TimeoutSec 5
    $info = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Root endpoint accessible" -ForegroundColor Green
    Write-Host "   Name: $($info.name)" -ForegroundColor Gray
    Write-Host "   Version: $($info.version)" -ForegroundColor Gray
    Write-Host "   Status: $($info.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Root endpoint failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Models Endpoint (requires API key)
Write-Host "[3/3] Testing models endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$proxyUrl/api/openrouter/models" -UseBasicParsing -TimeoutSec 10
    $models = $response.Content | ConvertFrom-Json
    
    if ($models.data -and $models.data.Count -gt 0) {
        Write-Host "✅ Models endpoint working" -ForegroundColor Green
        Write-Host "   Available models: $($models.data.Count)" -ForegroundColor Gray
        
        # Show a few example models
        Write-Host "   Examples:" -ForegroundColor Gray
        $models.data | Select-Object -First 5 | ForEach-Object {
            Write-Host "     - $($_.id)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "⚠️  Models endpoint returned no data" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Message -like "*401*" -or $_.Exception.Message -like "*OPENROUTER_API_KEY*") {
        Write-Host "⚠️  API key not configured" -ForegroundColor Yellow
        Write-Host "   Add OPENROUTER_API_KEY to backend/openrouter-proxy/.env" -ForegroundColor Gray
    } else {
        Write-Host "❌ Models endpoint failed" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "✅ Proxy connection test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Ensure .env file has OPENROUTER_API_KEY set" -ForegroundColor Gray
Write-Host "   2. Test chat endpoint with: .\test-api.ps1" -ForegroundColor Gray
Write-Host "   3. Integrate with Nova Agent or other apps" -ForegroundColor Gray
Write-Host ""

