# Gemini API Quota Checker
# Check your current API usage and limits

Write-Host "🔍 Gemini API Quota Checker" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# Check Gemini CLI version
Write-Host "📦 Checking Gemini CLI version..." -ForegroundColor Yellow
$version = gemini --version 2>&1
Write-Host "Version: $version" -ForegroundColor White
Write-Host ""

# Test API connectivity
Write-Host "🌐 Testing API connectivity..." -ForegroundColor Yellow
try {
    $testQuery = "ping"
    $result = gemini chat $testQuery 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ API is accessible" -ForegroundColor Green
    } else {
        Write-Host "⚠️ API returned exit code: $LASTEXITCODE" -ForegroundColor Yellow
        Write-Host "Response: $result" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ API connection failed: $_" -ForegroundColor Red
}
Write-Host ""

# Check for quota errors
Write-Host "📊 Checking for recent quota errors..." -ForegroundColor Yellow
$geminiLogPath = "$env:USERPROFILE\.gemini\logs"
if (Test-Path $geminiLogPath) {
    $recentLogs = Get-ChildItem -Path $geminiLogPath -Filter "*.log" -ErrorAction SilentlyContinue |
                  Sort-Object LastWriteTime -Descending |
                  Select-Object -First 3

    if ($recentLogs) {
        foreach ($log in $recentLogs) {
            $quotaErrors = Select-String -Path $log.FullName -Pattern "quota|exhausted|rate limit" -ErrorAction SilentlyContinue
            if ($quotaErrors) {
                Write-Host "⚠️ Found quota errors in $($log.Name)" -ForegroundColor Yellow
                $quotaErrors | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            }
        }
    } else {
        Write-Host "ℹ️ No recent log files found" -ForegroundColor Cyan
    }
} else {
    Write-Host "ℹ️ Log directory not found: $geminiLogPath" -ForegroundColor Cyan
}
Write-Host ""

# Recommendations
Write-Host "💡 Quota Management Tips:" -ForegroundColor Cyan
Write-Host "  1. Free tier limits: ~60 requests per minute (RPM)" -ForegroundColor White
Write-Host "  2. Add 5-second delays between requests" -ForegroundColor White
Write-Host "  3. Use Gemini 1.5 Flash (higher limits than Pro)" -ForegroundColor White
Write-Host "  4. Check quota at: https://ai.google.dev/" -ForegroundColor White
Write-Host ""

Write-Host "🔗 Useful Commands:" -ForegroundColor Cyan
Write-Host "  Check API key: " -NoNewline -ForegroundColor White
Write-Host "`$env:GEMINI_API_KEY" -ForegroundColor Gray
Write-Host "  Rate-limited wrapper: " -NoNewline -ForegroundColor White
Write-Host ".\tools\gemini-rate-limited.ps1 'your query'" -ForegroundColor Gray
Write-Host "  Batch queries: " -NoNewline -ForegroundColor White
Write-Host ".\tools\gemini-batch-queries.ps1 -Queries @('q1','q2')" -ForegroundColor Gray
