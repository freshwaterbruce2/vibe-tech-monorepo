# Finalize Jujutsu Setup
# Run this script after the D:\ snapshot completes

$ErrorActionPreference = "Stop"

Write-Host "=== Jujutsu Setup Finalization ===" -ForegroundColor Cyan
Write-Host ""

# Ensure jj is in PATH
$env:PATH = "C:\dev\tools\jujutsu;$env:PATH"

# Step 1: Check snapshot status
Write-Host "[1/5] Checking D:\ snapshot status..." -ForegroundColor Yellow
$snapshotMetadata = "D:\repositories\vibetech\snapshots\20260120-095025\metadata.json"
if (Test-Path $snapshotMetadata) {
    Write-Host "✓ Snapshot completed successfully!" -ForegroundColor Green
    $metadata = Get-Content $snapshotMetadata | ConvertFrom-Json
    Write-Host "  Files: $($metadata.fileCount)"
    Write-Host "  Size: $([math]::Round($metadata.compressedSize / 1MB, 2)) MB (compressed)"
} else {
    Write-Host "⚠ Snapshot still in progress. You can continue, but it's safer to wait." -ForegroundColor Yellow
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -ne 'y') {
        Write-Host "Exiting. Run this script again once snapshot completes." -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""

# Step 2: Remove Git lock
Write-Host "[2/5] Removing Git index lock..." -ForegroundColor Yellow
$lockFile = "C:\dev\.git\index.lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force
    Write-Host "✓ Lock file removed" -ForegroundColor Green
} else {
    Write-Host "✓ No lock file found" -ForegroundColor Green
}

Write-Host ""

# Step 3: Initialize Jujutsu
Write-Host "[3/5] Initializing Jujutsu in colocated mode..." -ForegroundColor Yellow
Set-Location "C:\dev"

$jjStatus = jj status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Initializing..." -ForegroundColor Cyan
    jj git init --colocate
    Write-Host "✓ Jujutsu initialized!" -ForegroundColor Green
} else {
    Write-Host "✓ Jujutsu already initialized" -ForegroundColor Green
}

Write-Host ""

# Step 4: Verify basic operations
Write-Host "[4/5] Testing basic operations..." -ForegroundColor Yellow

Write-Host "  Testing jj status..."
jj status | Select-Object -First 5

Write-Host "  Testing jj log..."
jj log -r 'ancestors(@, 3)' | Select-Object -First 10

Write-Host "✓ Basic operations working!" -ForegroundColor Green

Write-Host ""

# Step 5: Verify GitHub integration
Write-Host "[5/5] Verifying GitHub integration..." -ForegroundColor Yellow

Write-Host "  Fetching from GitHub..."
jj git fetch 2>&1 | Out-Null

Write-Host "  Checking remote..."
jj git remote -v

Write-Host "✓ GitHub integration verified!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""

Write-Host "Jujutsu is now ready to use. Try these commands:" -ForegroundColor Cyan
Write-Host "  jj status    - Check what changed"
Write-Host "  jj log       - View history (beautiful graph)"
Write-Host "  jj commit    - Commit changes (no 'add' needed)"
Write-Host "  jj git push  - Push to GitHub"
Write-Host "  jj undo      - Undo last operation (safe!)"
Write-Host ""

Write-Host "Documentation: .claude/rules/jujutsu-guide.md" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Read the quick reference guide"
Write-Host "2. Try a test commit: jj commit -m 'test: trying jujutsu'"
Write-Host "3. View the commit graph: jj log"
Write-Host "4. Undo the test: jj undo"
Write-Host ""

Write-Host "Happy coding with Jujutsu! 🚀" -ForegroundColor Green
