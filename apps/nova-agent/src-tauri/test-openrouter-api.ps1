# ==========================================
# OpenRouter API Connectivity Test Script
# Updated: January 4, 2026
# Usage: .\test-openrouter-api.ps1
# ==========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "OpenRouter API Connectivity Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
$envPath = Join-Path $PSScriptRoot ".env"

if (Test-Path $envPath) {
    Write-Host "[✓] Loading .env file..." -ForegroundColor Green
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "[✗] .env file not found!" -ForegroundColor Red
    Write-Host "    Please copy .env.example to .env and add your API key" -ForegroundColor Yellow
    exit 1
}

# Get API key
$apiKey = $env:OPENROUTER_API_KEY

if (-not $apiKey -or $apiKey -eq "sk-or-v1-YOUR-KEY-HERE") {
    Write-Host "[✗] OPENROUTER_API_KEY not set!" -ForegroundColor Red
    Write-Host "    Get your key at: https://openrouter.ai/keys" -ForegroundColor Yellow
    exit 1
}

Write-Host "[✓] API Key found: $($apiKey.Substring(0, 15))..." -ForegroundColor Green
Write-Host ""

# Test models to try (free models first)
$testModels = @(
    @{Name="MiMo-V2-Flash (FREE)"; Model="xiaomi/mimo-v2-flash:free"; IsFree=$true},
    @{Name="Devstral 2 (FREE)"; Model="mistralai/devstral-2512:free"; IsFree=$true},
    @{Name="Llama 3.3 70B (FREE)"; Model="meta-llama/llama-3.3-70b-instruct:free"; IsFree=$true}
)

Write-Host "Testing models..." -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($testModel in $testModels) {
    Write-Host "Testing: $($testModel.Name)" -ForegroundColor Yellow
    
    # Prepare request body
    $body = @{
        model = $testModel.Model
        messages = @(
            @{
                role = "user"
                content = "Reply with just 'OK' if you can read this message."
            }
        )
        max_tokens = 10
        temperature = 0.3
    } | ConvertTo-Json -Depth 10

    # Make API request
    try {
        $response = Invoke-RestMethod -Uri "https://openrouter.ai/api/v1/chat/completions" `
            -Method Post `
            -Headers @{
                "Content-Type" = "application/json"
                "Authorization" = "Bearer $apiKey"
                "HTTP-Referer" = "https://nova-agent.local"
                "X-Title" = "Nova Agent Test"
            } `
            -Body $body `
            -TimeoutSec 30

        $content = $response.choices[0].message.content
        Write-Host "  [✓] Response: $content" -ForegroundColor Green
        Write-Host "  [✓] Model: $($testModel.Model)" -ForegroundColor Green
        
        if ($testModel.IsFree) {
            Write-Host "  [✓] Cost: FREE (zero tokens charged)" -ForegroundColor Green
        }
        
        $successCount++
        Write-Host ""
        
    } catch {
        Write-Host "  [✗] Error: $($_.Exception.Message)" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "  [✗] Details: $responseBody" -ForegroundColor Red
        }
        
        $failCount++
        Write-Host ""
    }
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($successCount -gt 0) {
    Write-Host "[✓] OpenRouter API is working!" -ForegroundColor Green
    Write-Host "    You can now use nova-agent with free models." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: pnpm tauri dev" -ForegroundColor White
    Write-Host "  2. Monitor usage: https://openrouter.ai/activity" -ForegroundColor White
    Write-Host "  3. View model stats: https://openrouter.ai/models" -ForegroundColor White
} else {
    Write-Host "[✗] All tests failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check API key: https://openrouter.ai/keys" -ForegroundColor White
    Write-Host "  2. Verify balance: https://openrouter.ai/credits" -ForegroundColor White
    Write-Host "  3. Check rate limits: https://openrouter.ai/activity" -ForegroundColor White
    Write-Host "  4. Test in browser: https://openrouter.ai/playground" -ForegroundColor White
}

Write-Host ""
