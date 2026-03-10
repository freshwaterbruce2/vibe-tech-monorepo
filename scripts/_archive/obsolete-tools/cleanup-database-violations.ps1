#!/usr/bin/env pwsh
# Database Path Policy Cleanup Script
# Migrates databases from C:\dev to D:\databases and removes test artifacts

param(
    [switch]$DryRun = $true,  # Default to dry run for safety
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Database Path Policy Cleanup" -ForegroundColor Cyan
Write-Host "Mode: $(if ($DryRun) { 'DRY RUN (no changes)' } else { 'LIVE (will make changes)' })" -ForegroundColor $(if ($DryRun) { 'Yellow' } else { 'Red' })
Write-Host ""

# Ensure D:\databases exists
if (-not (Test-Path "D:\databases")) {
    Write-Host "Creating D:\databases directory..." -ForegroundColor Yellow
    if (-not $DryRun) {
        New-Item -Path "D:\databases" -ItemType Directory -Force | Out-Null
    }
}

# Track statistics
$script:DeletedCount = 0
$script:MovedCount = 0
$script:SkippedCount = 0

function Remove-Database {
    param([string]$Path, [string]$Reason)

    if (Test-Path $Path) {
        Write-Host "DELETE: $Path" -ForegroundColor Red
        Write-Host "  Reason: $Reason" -ForegroundColor Gray
        if (-not $DryRun) {
            Remove-Item $Path -Force
            Write-Host "  ✓ Deleted" -ForegroundColor Green
        }
        $script:DeletedCount++
    }
}

function Move-Database {
    param([string]$SourcePath, [string]$DestName, [string]$Reason)

    if (Test-Path $SourcePath) {
        $destPath = "D:\databases\$DestName"

        Write-Host "MOVE: $SourcePath" -ForegroundColor Yellow
        Write-Host "  To: $destPath" -ForegroundColor Gray
        Write-Host "  Reason: $Reason" -ForegroundColor Gray

        if (Test-Path $destPath) {
            Write-Host "  ⚠ Destination exists - comparing sizes..." -ForegroundColor Yellow
            $sourceSize = (Get-Item $SourcePath).Length
            $destSize = (Get-Item $destPath).Length

            if ($destSize -ge $sourceSize) {
                Write-Host "  → Destination is newer/larger - deleting source only" -ForegroundColor Cyan
                if (-not $DryRun) {
                    Remove-Item $SourcePath -Force
                }
            } else {
                Write-Host "  → Source is newer - backing up destination and replacing" -ForegroundColor Yellow
                if (-not $DryRun) {
                    $backupPath = "$destPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
                    Move-Item $destPath $backupPath -Force
                    Move-Item $SourcePath $destPath -Force
                }
            }
        } else {
            if (-not $DryRun) {
                Move-Item $SourcePath $destPath -Force
                Write-Host "  ✓ Moved" -ForegroundColor Green
            }
        }
        $script:MovedCount++
    }
}

# 1. Remove empty placeholder (crypto-enhanced)
Write-Host "`n=== crypto-enhanced/trading.db ===" -ForegroundColor Cyan
Remove-Database "C:\dev\apps\crypto-enhanced\trading.db" "Empty placeholder (0 bytes) - real DB at D:\databases\trading.db"

# 2. Remove all test databases (nova-agent)
Write-Host "`n=== nova-agent test databases ===" -ForegroundColor Cyan
$testDbs = Get-ChildItem "C:\dev\apps\nova-agent\test-db" -Filter "*.db" -ErrorAction SilentlyContinue
foreach ($db in $testDbs) {
    Remove-Database $db.FullName "Test artifact from Oct/Nov 2025"
}

# 3. Move digital-content-builder database (has data)
Write-Host "`n=== digital-content-builder/database.sqlite ===" -ForegroundColor Cyan
Move-Database "C:\dev\apps\digital-content-builder\database.sqlite" "digital-content-builder.db" "Contains data (68KB) - migrate to D:\databases"

# 4. Move vibe-subscription-guard database
Write-Host "`n=== vibe-subscription-guard/data/app.db ===" -ForegroundColor Cyan
Move-Database "C:\dev\apps\vibe-subscription-guard\data\app.db" "vibe-subscription-guard.db" "App database - should be on D:\databases"

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Databases deleted: $script:DeletedCount" -ForegroundColor $(if ($script:DeletedCount -gt 0) { 'Red' } else { 'Gray' })
Write-Host "Databases moved: $script:MovedCount" -ForegroundColor $(if ($script:MovedCount -gt 0) { 'Yellow' } else { 'Gray' })
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN COMPLETE - No changes made" -ForegroundColor Yellow
    Write-Host "Run with -DryRun:`$false to execute cleanup" -ForegroundColor Yellow
} else {
    Write-Host "CLEANUP COMPLETE" -ForegroundColor Green
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update code references to use D:\databases paths"
Write-Host "  2. Add environment variables for database paths"
Write-Host "  3. Run integration test: .\scripts\test-memory-system.ps1"
Write-Host ""
