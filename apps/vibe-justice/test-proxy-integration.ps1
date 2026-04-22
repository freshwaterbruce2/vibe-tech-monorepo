# Test OpenRouter Proxy Integration with Vibe-Justice
# Run this script to verify the complete stack

Write-Host "🧪 Testing Vibe-Justice + OpenRouter Proxy Integration" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if proxy is running
Write-Host "1️⃣  Checking OpenRouter Proxy..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    Write-Host "   ✅ Proxy is healthy (uptime: $($health.uptime)s)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Proxy is not running!" -ForegroundColor Red
    Write-Host "   Start with: cd backend\openrouter-proxy && pnpm dev" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check available models
Write-Host "2️⃣  Checking available models..." -ForegroundColor Yellow
try {
    $root = Invoke-RestMethod -Uri "http://localhost:3001/" -Method Get
    Write-Host "   ✅ API Version: $($root.version)" -ForegroundColor Green
    Write-Host "   📦 Supported Projects:" -ForegroundColor Cyan
    $root.projects | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
} catch {
    Write-Host "   ⚠️  Could not fetch models" -ForegroundColor Yellow
}

# Step 3: Test chat endpoint
Write-Host "3️⃣  Testing chat endpoint..." -ForegroundColor Yellow
$testPayload = @{
    model = "anthropic/claude-3.5-sonnet"
    messages = @(
        @{
            role = "user"
            content = "Say 'OpenRouter proxy is working!' in one sentence."
        }
    )
    max_tokens = 50
} | ConvertTo-Json -Depth 10

try {
    $chatResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/openrouter/chat" `
        -Method Post `
        -ContentType "application/json" `
        -Body $testPayload

    $message = $chatResponse.choices[0].message.content
    Write-Host "   ✅ Chat Response: $message" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Chat test failed: $_" -ForegroundColor Red
    Write-Host "   Check OPENROUTER_API_KEY in backend/openrouter-proxy/.env" -ForegroundColor Yellow
}

# Step 4: Check Vibe-Justice frontend config
Write-Host "4️⃣  Checking Vibe-Justice frontend..." -ForegroundColor Yellow
$openrouterConfig = Get-Content "C:\dev\apps\vibe-justice\frontend\src\services\openrouter.ts" | Select-String -Pattern "localhost:3001"
if ($openrouterConfig) {
    Write-Host "   ✅ Frontend correctly configured for localhost:3001" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Frontend may not be configured correctly" -ForegroundColor Yellow
}

# Step 5: Summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Integration Test Complete" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start Vibe-Justice: pnpm nx tauri:dev vibe-justice" -ForegroundColor Gray
Write-Host "  2. Start backend: cd apps/vibe-justice/backend; uvicorn main:app --reload" -ForegroundColor Gray
Write-Host "  3. Open app and test AI chat features" -ForegroundColor Gray
Write-Host ""
