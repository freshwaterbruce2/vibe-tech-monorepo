# OpenRouter API Test Script - Simple Version
# Updated: January 4, 2026

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OpenRouter API Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load .env file
$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "[X] .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and add your API key" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Loading .env file..." -ForegroundColor Green

Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$apiKey = $env:OPENROUTER_API_KEY

if (-not $apiKey -or $apiKey -eq "sk-or-v1-YOUR-KEY-HERE") {
    Write-Host "[X] API key not set!" -ForegroundColor Red
    Write-Host "Get your key at: https://openrouter.ai/keys" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] API Key: $($apiKey.Substring(0, 15))..." -ForegroundColor Green
Write-Host ""

# Test a single free model
Write-Host "Testing: xiaomi/mimo-v2-flash:free" -ForegroundColor Yellow
Write-Host ""

$body = @{
    model = "xiaomi/mimo-v2-flash:free"
    messages = @(
        @{
            role = "user"
            content = "Reply with just 'OK' if you can read this."
        }
    )
    max_tokens = 10
    temperature = 0.3
} | ConvertTo-Json -Depth 10

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $apiKey"
        "HTTP-Referer" = "https://nova-agent.local"
        "X-Title" = "Nova Agent Test"
    }
    
    $response = Invoke-RestMethod `
        -Uri "https://openrouter.ai/api/v1/chat/completions" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -TimeoutSec 30

    $content = $response.choices[0].message.content
    
    Write-Host "[OK] Response: $content" -ForegroundColor Green
    Write-Host "[OK] Model: xiaomi/mimo-v2-flash:free" -ForegroundColor Green
    Write-Host "[OK] Cost: FREE" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "[SUCCESS] OpenRouter API is working!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. cd C:\dev\apps\nova-agent" -ForegroundColor White
    Write-Host "  2. pnpm tauri dev" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "[X] Test failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Details: $responseBody" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check API key: https://openrouter.ai/keys" -ForegroundColor White
    Write-Host "  2. Verify balance: https://openrouter.ai/credits" -ForegroundColor White
    Write-Host "  3. Check status: https://status.openrouter.ai" -ForegroundColor White
    exit 1
}
