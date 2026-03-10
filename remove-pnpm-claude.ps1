# Remove pnpm Claude Code installations

Write-Host "=== Removing pnpm Claude Code Installations ===" -ForegroundColor Cyan
Write-Host ""

$pnpmPath = "$env:USERPROFILE\AppData\Local\pnpm"
$claudeFiles = @(
    "$pnpmPath\claude",
    "$pnpmPath\claude.CMD"
)

$found = $false
foreach ($file in $claudeFiles) {
    if (Test-Path $file) {
        $found = $true
        Write-Host "Found: $file" -ForegroundColor Yellow
        try {
            Remove-Item -Path $file -Force
            Write-Host "  ✓ Removed" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed: $_" -ForegroundColor Red
        }
    }
}

if (-not $found) {
    Write-Host "✓ No pnpm installations found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verifying remaining installations..." -ForegroundColor Yellow
$remaining = where.exe claude 2>$null
if ($remaining) {
    Write-Host $remaining -ForegroundColor White
} else {
    Write-Host "No claude found in PATH!" -ForegroundColor Red
}
Write-Host ""