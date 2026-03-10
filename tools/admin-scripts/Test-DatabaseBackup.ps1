<#
.SYNOPSIS
    Test script for database backup system verification
.DESCRIPTION
    Performs dry-run and verification tests of the database backup system
    without modifying production data.
.EXAMPLE
    .\Test-DatabaseBackup.ps1
#>

[CmdletBinding()]
param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "Database Backup System Verification" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if required scripts exist
Write-Host "[1/5] Checking required scripts..." -ForegroundColor Yellow
$wrapperScript = "C:\dev\admin_scripts\Run-DatabaseBackup.ps1"
$robustScript = "C:\dev\scripts\database-backup.ps1"

if (Test-Path $wrapperScript) {
    Write-Host "  ✓ Wrapper script exists: $wrapperScript" -ForegroundColor Green
} else {
    Write-Host "  ✗ MISSING: $wrapperScript" -ForegroundColor Red
    exit 1
}

if (Test-Path $robustScript) {
    Write-Host "  ✓ Robust script exists: $robustScript" -ForegroundColor Green
} else {
    Write-Host "  ✗ MISSING: $robustScript" -ForegroundColor Red
    exit 1
}

# Test 2: Check if backup directory exists
Write-Host ""
Write-Host "[2/5] Checking backup directory..." -ForegroundColor Yellow
$backupRoot = "D:\backups"
if (Test-Path $backupRoot) {
    Write-Host "  ✓ Backup directory exists: $backupRoot" -ForegroundColor Green
    $diskSpace = (Get-PSDrive D).Free
    Write-Host "  ✓ Available space: $([math]::Round($diskSpace/1GB, 2)) GB" -ForegroundColor Green
} else {
    Write-Host "  ! Creating backup directory: $backupRoot" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    Write-Host "  ✓ Directory created" -ForegroundColor Green
}

# Test 3: Check if sqlite3 is available
Write-Host ""
Write-Host "[3/5] Checking SQLite availability..." -ForegroundColor Yellow
$sqlite = Get-Command sqlite3 -ErrorAction SilentlyContinue
if ($sqlite) {
    Write-Host "  ✓ sqlite3 found: $($sqlite.Source)" -ForegroundColor Green
} else {
    Write-Host "  ✗ sqlite3 NOT FOUND - Install SQLite tools" -ForegroundColor Red
    Write-Host "    Download from: https://www.sqlite.org/download.html" -ForegroundColor Yellow
}

# Test 4: Check critical databases
Write-Host ""
Write-Host "[4/5] Checking critical databases..." -ForegroundColor Yellow
$databases = @(
    'D:\databases\trading.db',
    'D:\databases\database.db',
    'D:\databases\agent_learning.db'
)

$foundCount = 0
foreach ($db in $databases) {
    if (Test-Path $db) {
        $foundCount++
        $size = (Get-Item $db).Length
        $walExists = Test-Path "$db-wal"
        $walIndicator = if ($walExists) { "(WAL mode)" } else { "" }
        Write-Host "  ✓ Found: $(Split-Path $db -Leaf) - $([math]::Round($size/1MB, 2)) MB $walIndicator" -ForegroundColor Green
    }
}

Write-Host "  Total: $foundCount databases found" -ForegroundColor $(if ($foundCount -gt 0) { 'Green' } else { 'Yellow' })

# Test 5: Perform dry-run test
Write-Host ""
Write-Host "[5/5] Performing dry-run test..." -ForegroundColor Yellow

if ($foundCount -gt 0 -and $sqlite) {
    $testDb = $databases | Where-Object { Test-Path $_ } | Select-Object -First 1
    $testBackupDir = Join-Path $env:TEMP "backup-test-$(Get-Date -Format 'yyyyMMddHHmmss')"
    New-Item -ItemType Directory -Path $testBackupDir -Force | Out-Null

    try {
        Write-Host "  Testing backup of: $(Split-Path $testDb -Leaf)" -ForegroundColor Gray

        # Test backup command
        $testDest = Join-Path $testBackupDir "test.db"
        & sqlite3 $testDb ".backup '$testDest'"

        if (Test-Path $testDest) {
            Write-Host "  ✓ Backup command successful" -ForegroundColor Green

            # Test integrity
            $integrity = & sqlite3 $testDest "PRAGMA integrity_check;"
            if ($integrity -eq "ok") {
                Write-Host "  ✓ Integrity check passed" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Integrity check failed" -ForegroundColor Red
            }
        } else {
            Write-Host "  ✗ Backup failed - file not created" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "  ✗ Error during dry-run: $_" -ForegroundColor Red
    }
    finally {
        Remove-Item $testBackupDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "  ⊘ Skipping dry-run (no databases or sqlite3 not found)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "Verification Summary" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host "Scripts:   " -NoNewline
Write-Host "READY" -ForegroundColor Green
Write-Host "Directory: " -NoNewline
Write-Host "READY" -ForegroundColor Green
Write-Host "SQLite:    " -NoNewline
if ($sqlite) { Write-Host "AVAILABLE" -ForegroundColor Green } else { Write-Host "MISSING" -ForegroundColor Red }
Write-Host "Databases: " -NoNewline
Write-Host "$foundCount found" -ForegroundColor $(if ($foundCount -gt 0) { 'Green' } else { 'Yellow' })

Write-Host ""
Write-Host "To run backup manually:" -ForegroundColor Cyan
Write-Host '  cd C:\dev\admin_scripts' -ForegroundColor White
Write-Host '  .\Run-DatabaseBackup.ps1' -ForegroundColor White
Write-Host ""
Write-Host "To run with visual feedback:" -ForegroundColor Cyan
Write-Host '  .\Run-DatabaseBackup.ps1 -Interactive' -ForegroundColor White
Write-Host ""