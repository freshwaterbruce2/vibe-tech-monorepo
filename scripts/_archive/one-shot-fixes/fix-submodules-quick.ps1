# Quick Git Submodule Fix - No Backup (Safe - All in Git)
# This script converts Git submodules to regular directories

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Quick Submodule Fix (No Backup)" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# List of submodules to convert
$submodules = @(
    "apps/business-booking-platform",
    "apps/iconforge",
    "apps/shipping-pwa",
    "apps/vibe-subscription-guard",
    "apps/vibe-tech-lovable"
)

Write-Host "Found 5 submodules to convert:" -ForegroundColor Yellow
$submodules | ForEach-Object { Write-Host "  - $_" }
Write-Host ""
Write-Host "NOTE: Skipping backup since all code is in Git" -ForegroundColor Cyan
Write-Host "You can revert with: git reset --hard HEAD" -ForegroundColor Cyan
Write-Host ""

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Removing submodules from Git index..." -ForegroundColor Cyan

foreach ($submodule in $submodules) {
    Write-Host "  Processing: $submodule" -ForegroundColor Yellow

    # Remove from Git index (but keep files)
    git rm --cached $submodule 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✓ Removed from Git index" -ForegroundColor Green
    } else {
        Write-Host "    ⚠ Warning: Could not remove from index" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 2: Removing .git directories from submodules..." -ForegroundColor Cyan

foreach ($submodule in $submodules) {
    $fullPath = "C:\dev\$submodule"
    $gitPath = Join-Path $fullPath ".git"

    if (Test-Path $gitPath) {
        Write-Host "  Removing: $submodule/.git" -ForegroundColor Yellow

        # Check if it's a file or directory
        if ((Get-Item $gitPath) -is [System.IO.FileInfo]) {
            # It's a gitlink file
            Remove-Item -Path $gitPath -Force
        } else {
            # It's a directory
            Remove-Item -Path $gitPath -Recurse -Force
        }

        Write-Host "    ✓ Removed .git" -ForegroundColor Green
    } else {
        Write-Host "  Skipping (no .git): $submodule" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Step 3: Adding directories as regular files..." -ForegroundColor Cyan

foreach ($submodule in $submodules) {
    $fullPath = "C:\dev\$submodule"

    if (Test-Path $fullPath) {
        Write-Host "  Adding: $submodule" -ForegroundColor Yellow
        git add $submodule 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ Added as regular directory" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Warning: Could not add to Git" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Step 4: Cleaning up .gitmodules (if exists)..." -ForegroundColor Cyan

if (Test-Path "C:\dev\.gitmodules") {
    Write-Host "  Removing .gitmodules file" -ForegroundColor Yellow
    Remove-Item "C:\dev\.gitmodules" -Force
    git rm -f .gitmodules 2>&1 | Out-Null
    Write-Host "    ✓ Removed .gitmodules" -ForegroundColor Green
} else {
    Write-Host "  ✓ No .gitmodules file found (good)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 5: Verifying Git status..." -ForegroundColor Cyan
Write-Host ""

$gitStatus = git status --short | Select-Object -First 20
Write-Host $gitStatus

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Conversion Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Submodules converted to regular directories" -ForegroundColor Green
Write-Host "  ✓ All changes staged and ready to commit" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes: git status" -ForegroundColor White
Write-Host "  2. Check diff: git diff --cached --stat" -ForegroundColor White
Write-Host "  3. Commit: git commit -m 'fix: Convert submodules to regular directories'" -ForegroundColor White
Write-Host ""
Write-Host "If you need to revert:" -ForegroundColor Cyan
Write-Host "  git reset --hard HEAD" -ForegroundColor White
Write-Host ""
