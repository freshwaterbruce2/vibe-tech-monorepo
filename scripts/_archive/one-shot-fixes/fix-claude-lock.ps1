# Fix Claude Code Lock File Issue
# This script removes the corrupted history.jsonl.lock file

$lockFile = "$env:USERPROFILE\.claude\history.jsonl.lock"

Write-Host "Checking for corrupted lock file..." -ForegroundColor Cyan

if (Test-Path $lockFile) {
    Write-Host "Found lock file: $lockFile" -ForegroundColor Yellow

    try {
        Remove-Item $lockFile -Force -ErrorAction Stop
        Write-Host "Successfully removed corrupted lock file" -ForegroundColor Green
    } catch {
        Write-Host "Error removing lock file: $_" -ForegroundColor Red
        Write-Host "Try running this script as Administrator" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "No lock file found - issue may be resolved" -ForegroundColor Green
}

# Check for other potential lock files
$claudeDir = "$env:USERPROFILE\.claude"
$otherLocks = Get-ChildItem -Path $claudeDir -Filter "*.lock" -ErrorAction SilentlyContinue

if ($otherLocks) {
    Write-Host "`nFound other lock files:" -ForegroundColor Yellow
    $otherLocks | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor Gray
    }

    $response = Read-Host "`nRemove all lock files? (y/n)"
    if ($response -eq 'y') {
        $otherLocks | ForEach-Object {
            Remove-Item $_.FullName -Force
            Write-Host "Removed: $($_.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "`nDone! You can now restart Claude Code." -ForegroundColor Green
Write-Host "Run: claude" -ForegroundColor Cyan
