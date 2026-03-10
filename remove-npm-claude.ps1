# Remove npm-based Claude Code installation

Write-Host "=== Removing npm Claude Code Installation ===" -ForegroundColor Cyan
Write-Host ""

# Check if npm version exists
Write-Host "Checking for npm installation..." -ForegroundColor Yellow
$npmCheck = npm list -g @anthropic/claude-code --depth=0 2>&1 | Out-String

if ($npmCheck -match "@anthropic/claude-code") {
    Write-Host "Found npm installation. Removing..." -ForegroundColor Yellow
    Write-Host ""

    try {
        npm uninstall -g @anthropic/claude-code
        Write-Host ""
        Write-Host "✓ npm installation removed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to remove npm installation: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ No npm installation found (already clean)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Install the native version:" -ForegroundColor Yellow
Write-Host "  1. Download from: https://docs.anthropic.com/en/docs/claude-code/getting-started" -ForegroundColor White
Write-Host "  2. Run the installer" -ForegroundColor White
Write-Host "  3. Or use: claude install" -ForegroundColor White
Write-Host ""
Write-Host "Verify installation:" -ForegroundColor Yellow
Write-Host "  claude --version" -ForegroundColor White
Write-Host ""