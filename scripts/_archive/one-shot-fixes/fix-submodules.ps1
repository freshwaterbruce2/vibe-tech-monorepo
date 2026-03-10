# Fix Git Submodule Issues - Convert to Regular Directories
# This script converts Git submodules to regular directories for proper monorepo management

$ErrorActionPreference = "Stop"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Git Submodule to Directory Conversion" -ForegroundColor Cyan
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

# Warning
Write-Host "WARNING:" -ForegroundColor Red
Write-Host "This will convert submodules to regular directories." -ForegroundColor Yellow
Write-Host "Any local changes in these directories will be preserved." -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Aborted." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Creating backups..." -ForegroundColor Cyan

# Create backup directory
$backupDir = "C:\dev\.git-submodule-backups-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "  Backup directory: $backupDir" -ForegroundColor Green

foreach ($submodule in $submodules) {
    $fullPath = "C:\dev\$submodule"
    $submoduleName = $submodule.Replace('/', '-')
    $backupPath = Join-Path $backupDir $submoduleName

    if (Test-Path $fullPath) {
        Write-Host "  Backing up: $submodule" -ForegroundColor Yellow
        Copy-Item -Path $fullPath -Destination $backupPath -Recurse -Force
    } else {
        Write-Host "  Skipping (not found): $submodule" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Step 2: Removing submodules from Git index..." -ForegroundColor Cyan

foreach ($submodule in $submodules) {
    Write-Host "  Processing: $submodule" -ForegroundColor Yellow

    # Remove from Git index (but keep files)
    git rm --cached $submodule 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Removed from Git index" -ForegroundColor Green
    } else {
        Write-Host "    Warning: Could not remove from index" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Step 3: Removing .git directories from submodules..." -ForegroundColor Cyan

foreach ($submodule in $submodules) {
    $fullPath = "C:\dev\$submodule"
    $gitPath = Join-Path $fullPath ".git"

    if (Test-Path $gitPath) {
        Write-Host "  Removing: $submodule/.git" -ForegroundColor Yellow
        Remove-Item -Path $gitPath -Recurse -Force
        Write-Host "    Removed .git directory" -ForegroundColor Green
    } else {
        Write-Host "  Skipping (no .git): $submodule" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Step 4: Adding directories as regular files..." -ForegroundColor Cyan

foreach ($submodule in $submodules) {
    $fullPath = "C:\dev\$submodule"

    if (Test-Path $fullPath) {
        Write-Host "  Adding: $submodule" -ForegroundColor Yellow
        git add $submodule 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "    Added as regular directory" -ForegroundColor Green
        } else {
            Write-Host "    Warning: Could not add to Git" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Step 5: Cleaning up .gitmodules (if exists)..." -ForegroundColor Cyan

if (Test-Path "C:\dev\.gitmodules") {
    Write-Host "  Removing .gitmodules file" -ForegroundColor Yellow
    Remove-Item "C:\dev\.gitmodules" -Force
    git rm -f .gitmodules 2>&1 | Out-Null
    Write-Host "    Removed .gitmodules" -ForegroundColor Green
} else {
    Write-Host "  No .gitmodules file found (good)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 6: Verifying Git status..." -ForegroundColor Cyan

$gitStatus = git status --short
Write-Host $gitStatus

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Conversion Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  - Submodules converted to regular directories" -ForegroundColor Green
Write-Host "  - Backups saved to: $backupDir" -ForegroundColor Green
Write-Host "  - All changes staged and ready to commit" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review changes: git status" -ForegroundColor White
Write-Host "  2. Commit changes: git commit -m 'fix: Convert submodules to regular directories'" -ForegroundColor White
Write-Host "  3. If issues occur, restore from: $backupDir" -ForegroundColor White
Write-Host ""
Write-Host "Note: The original submodule history is preserved in backups." -ForegroundColor Cyan
