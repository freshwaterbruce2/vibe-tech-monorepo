# Fix Claude Code PATH Issue

Write-Host "=== Fixing Claude Code PATH ===" -ForegroundColor Cyan
Write-Host ""

# 1. Check what's in PATH
Write-Host "Current claude executables in PATH:" -ForegroundColor Yellow
$claudePaths = where.exe claude 2>$null
if ($claudePaths) {
    $claudePaths | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor White
        if (Test-Path $_) {
            Write-Host "    (exists)" -ForegroundColor Green
        } else {
            Write-Host "    (BROKEN - doesn't exist)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  No claude found in PATH" -ForegroundColor Red
}
Write-Host ""

# 2. Check if native version exists
Write-Host "Checking native installation..." -ForegroundColor Yellow
$nativePath = "$env:USERPROFILE\.local\bin\claude.exe"
if (Test-Path $nativePath) {
    Write-Host "  ✓ Found: $nativePath" -ForegroundColor Green

    # Get version
    $version = & $nativePath --version 2>&1
    Write-Host "  Version: $version" -ForegroundColor White
} else {
    Write-Host "  ✗ Not found: $nativePath" -ForegroundColor Red
    Write-Host "  Run: claude install" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# 3. Remove broken pnpm shims
Write-Host "Removing broken pnpm references..." -ForegroundColor Yellow
$pnpmPath = "$env:USERPROFILE\AppData\Local\pnpm"
$brokenFiles = @(
    "$pnpmPath\claude",
    "$pnpmPath\claude.CMD",
    "$pnpmPath\claude.ps1"
)

$removed = 0
foreach ($file in $brokenFiles) {
    if (Test-Path $file) {
        Write-Host "  Removing: $file" -ForegroundColor Yellow
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        $removed++
    }
}

if ($removed -gt 0) {
    Write-Host "  ✓ Removed $removed broken files" -ForegroundColor Green
} else {
    Write-Host "  ✓ No broken files found" -ForegroundColor Green
}
Write-Host ""

# 4. Check if .local\bin is in PATH
Write-Host "Checking PATH configuration..." -ForegroundColor Yellow
$localBin = "$env:USERPROFILE\.local\bin"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($userPath -like "*$localBin*") {
    Write-Host "  ✓ $localBin is in PATH" -ForegroundColor Green
} else {
    Write-Host "  ✗ $localBin is NOT in PATH" -ForegroundColor Red
    Write-Host "  Adding to PATH..." -ForegroundColor Yellow

    $newPath = "$localBin;$userPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")

    Write-Host "  ✓ Added to PATH (restart terminal to apply)" -ForegroundColor Green
}
Write-Host ""

# 5. Test claude command
Write-Host "Testing claude command..." -ForegroundColor Yellow
Write-Host "  Running: claude --version" -ForegroundColor Gray

# Refresh PATH in current session
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")

try {
    $testVersion = claude --version 2>&1
    Write-Host "  ✓ SUCCESS: $testVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ FAILED: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "=== Manual Fix Required ===" -ForegroundColor Yellow
    Write-Host "Close and reopen PowerShell, then run:" -ForegroundColor White
    Write-Host "  claude --version" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== Fix Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "If claude still doesn't work:" -ForegroundColor Yellow
Write-Host "  1. Close this terminal" -ForegroundColor White
Write-Host "  2. Open a new PowerShell window" -ForegroundColor White
Write-Host "  3. Run: claude --version" -ForegroundColor Cyan
Write-Host ""
