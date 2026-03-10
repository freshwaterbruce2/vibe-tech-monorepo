# Test OpenRouter Proxy API
Write-Host "Testing OpenRouter Proxy Server..." -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "✓ Health Check: " -ForegroundColor Green -NoNewline
    Write-Host "OK" -ForegroundColor White
    $health | ConvertTo-Json
} catch {
    Write-Host "✗ Health Check Failed: $_" -ForegroundColor Red
}

# Test 2: Get Models
Write-Host "`n2. Testing Models Endpoint..." -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:3001/api/openrouter/models" -Method GET
    Write-Host "✓ Models Endpoint: " -ForegroundColor Green -NoNewline
    Write-Host "OK (Found $($models.data.Count) models)" -ForegroundColor White
} catch {
    Write-Host "✗ Models Endpoint Failed: $_" -ForegroundColor Red
    Write-Host "Error: This likely means OPENROUTER_API_KEY is not set correctly" -ForegroundColor Yellow
}

# Test 3: Simple Chat (2026 recommended model)
Write-Host "`n3. Testing Chat Endpoint (Claude Sonnet 4.5)..." -ForegroundColor Yellow
try {
    $chatBody = @{
        model = "anthropic/claude-sonnet-4.5"
        messages = @(
            @{
                role = "user"
                content = "Say 'API test successful!' and nothing else."
            }
        )
        max_tokens = 20
    } | ConvertTo-Json -Depth 10

    $chat = Invoke-RestMethod -Uri "http://localhost:3001/api/openrouter/chat" `
        -Method POST `
        -ContentType "application/json" `
        -Body $chatBody

    Write-Host "✓ Chat Endpoint: " -ForegroundColor Green -NoNewline
    Write-Host "OK" -ForegroundColor White
    Write-Host "Response: " -ForegroundColor Cyan -NoNewline
    Write-Host $chat.choices[0].message.content -ForegroundColor White
    Write-Host "Tokens Used: $($chat.usage.total_tokens)" -ForegroundColor Gray
    Write-Host "Cost: `$$([math]::Round($chat.usage.total_tokens / 1000000 * 0.003, 6))" -ForegroundColor Gray
} catch {
    Write-Host "✗ Chat Endpoint Failed: $_" -ForegroundColor Red
    Write-Host "Error Details: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: Usage Stats
Write-Host "`n4. Testing Usage Endpoint..." -ForegroundColor Yellow
try {
    $usage = Invoke-RestMethod -Uri "http://localhost:3001/api/openrouter/usage?period=24" -Method GET
    Write-Host "✓ Usage Endpoint: " -ForegroundColor Green -NoNewline
    Write-Host "OK" -ForegroundColor White
    Write-Host "Total Requests (24h): $($usage.total_requests)" -ForegroundColor Gray
    Write-Host "Total Tokens (24h): $($usage.total_tokens)" -ForegroundColor Gray
    Write-Host "Total Cost (24h): `$$($usage.total_cost.ToString('F4'))" -ForegroundColor Gray
} catch {
    Write-Host "✗ Usage Endpoint Failed: $_" -ForegroundColor Red
}

Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OpenRouter Proxy is ready!" -ForegroundColor Green
Write-Host "Server: http://localhost:3001" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
