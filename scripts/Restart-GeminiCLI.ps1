# Restart Gemini CLI Completely
# Fixes function calling errors by clearing cache and restarting all processes

Write-Host "🔄 Restarting Gemini CLI..." -ForegroundColor Cyan

# Step 1: Kill all Gemini processes
Write-Host "1. Stopping Gemini processes..." -ForegroundColor Yellow
$geminiProcesses = Get-Process | Where-Object { $_.Name -like "*gemini*" -or $_.Name -like "*google*" }
if ($geminiProcesses) {
    $geminiProcesses | Stop-Process -Force
    Write-Host "   ✓ Stopped $($geminiProcesses.Count) process(es)" -ForegroundColor Green
} else {
    Write-Host "   ℹ No Gemini processes running" -ForegroundColor Gray
}

# Step 2: Wait for complete shutdown
Write-Host "2. Waiting for cleanup..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 3: Clear cache (optional)
$clearCache = Read-Host "Clear Gemini cache? (y/N)"
if ($clearCache -eq "y") {
    Write-Host "3. Clearing cache..." -ForegroundColor Yellow
    $cachePaths = @(
        "$env:APPDATA\Gemini\cache",
        "$env:LOCALAPPDATA\Gemini\cache",
        "$env:TEMP\gemini-*"
    )
    foreach ($path in $cachePaths) {
        if (Test-Path $path) {
            Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "   ✓ Cleared: $path" -ForegroundColor Green
        }
    }
} else {
    Write-Host "3. Skipped cache clearing" -ForegroundColor Gray
}

# Step 4: Verify configuration
Write-Host "4. Verifying configuration..." -ForegroundColor Yellow
$configPath = "C:\dev\.gemini\settings.json"
if (Test-Path $configPath) {
    $config = Get-Content $configPath | ConvertFrom-Json
    $mcpCount = ($config.mcpServers | Get-Member -MemberType NoteProperty).Count
    Write-Host "   ✓ Found $mcpCount MCP servers configured" -ForegroundColor Green

    # Check for transport fields
    $missingTransport = @()
    foreach ($server in $config.mcpServers.PSObject.Properties) {
        if (-not $server.Value.transport) {
            $missingTransport += $server.Name
        }
    }

    if ($missingTransport.Count -gt 0) {
        Write-Host "   ⚠ Warning: Missing 'transport' field in: $($missingTransport -join ', ')" -ForegroundColor Red
        Write-Host "   Run: Edit C:\dev\.gemini\settings.json and add 'transport': 'stdio'" -ForegroundColor Yellow
    } else {
        Write-Host "   ✓ All servers have transport configured" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠ Config not found: $configPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Restart complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open Gemini CLI in a new terminal" -ForegroundColor White
Write-Host "  2. Test with a simple command first" -ForegroundColor White
Write-Host "  3. If errors persist, see: C:\dev\GEMINI_CLI_FIX_GUIDE.md" -ForegroundColor White
Write-Host ""
