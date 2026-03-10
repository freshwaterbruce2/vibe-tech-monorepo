$apiKey = 'AIzaSyC7C8ygLq8DR77XXDOJV45_DnjLJVfnGlUY'
$model = 'gemini-1.5-flash'

Write-Host '🔍 Testing Google AI API Key...' -ForegroundColor Cyan
Write-Host ''

# Test 1: List available models
Write-Host '📋 Test 1: Fetching available models...' -ForegroundColor Yellow
try {
    $modelsResponse = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey" -Method Get
    Write-Host '✅ API Key is valid! Models available:' -ForegroundColor Green
    $modelsResponse.models | Select-Object -First 5 | ForEach-Object { Write-Host "  - $($_.name)" }
} catch {
    Write-Host '❌ Error fetching models:' -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

Write-Host ''

# Test 2: Try to generate content
Write-Host '💬 Test 2: Testing content generation with gemini-1.5-flash...' -ForegroundColor Yellow
try {
    $body = @{
        contents = @(
            @{
                parts = @(
                    @{ text = 'Say hello!' }
                )
            }
        )
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey" -Method Post -Body $body -ContentType 'application/json'

    Write-Host '✅ Content generation works!' -ForegroundColor Green
    Write-Host "   Response: $($response.candidates[0].content.parts[0].text)"
} catch {
    Write-Host '❌ Error generating content:' -ForegroundColor Red
    Write-Host $_.Exception.Message
}

Write-Host ''
Write-Host '✅ All tests complete!' -ForegroundColor Green
