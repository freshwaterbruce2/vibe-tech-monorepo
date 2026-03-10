#Requires -Version 7.0

<#
.SYNOPSIS
    Quick start guide for D:\ version control system

.DESCRIPTION
    Interactive setup and tutorial for the D:\ version control system.
    Initializes repository and creates first snapshot.

.EXAMPLE
    .\QUICK_START.ps1

.NOTES
    Run this script to get started with your local version control!
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "`n" -NoNewline
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║        D:\ Drive Version Control System                   ║" -ForegroundColor Cyan
Write-Host "║        Your Personal Local `"GitHub`" Without Git           ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n"

Write-Host "Welcome! This script will set up your local version control system.`n" -ForegroundColor White

# Check if already initialized
$repoPath = "D:\repositories\vibetech"
$isInitialized = Test-Path "$repoPath\.config\repository.json"

if ($isInitialized) {
    Write-Host "✓ Repository already initialized at: $repoPath`n" -ForegroundColor Green

    Write-Host "What would you like to do?`n" -ForegroundColor Cyan

    Write-Host "1. Create a new snapshot (like 'git commit')" -ForegroundColor White
    Write-Host "2. View snapshot history (like 'git log')" -ForegroundColor White
    Write-Host "3. Restore a snapshot (like 'git checkout')" -ForegroundColor White
    Write-Host "4. View documentation" -ForegroundColor White
    Write-Host "5. Repository status" -ForegroundColor White
    Write-Host "6. Exit`n" -ForegroundColor White

    $choice = Read-Host "Enter choice (1-6)"

    switch ($choice) {
        "1" {
            Write-Host "`nEnter a description for this snapshot:" -ForegroundColor Cyan
            $description = Read-Host "Description"

            if ([string]::IsNullOrWhiteSpace($description)) {
                $description = "Snapshot created at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            }

            & "$PSScriptRoot\Save-Snapshot.ps1" -Description $description
        }
        "2" {
            & "$PSScriptRoot\List-Snapshots.ps1"
        }
        "3" {
            & "$PSScriptRoot\List-Snapshots.ps1" -Limit 10
            Write-Host "`nEnter snapshot ID to restore:" -ForegroundColor Cyan
            $snapshotId = Read-Host "Snapshot ID (YYYYMMDD-HHMMSS)"

            if (-not [string]::IsNullOrWhiteSpace($snapshotId)) {
                & "$PSScriptRoot\Restore-Snapshot.ps1" -SnapshotId $snapshotId
            }
        }
        "4" {
            Write-Host "`nOpening documentation...`n" -ForegroundColor Cyan
            Start-Process "notepad" -ArgumentList "C:\dev\D_DRIVE_VERSION_CONTROL_GUIDE.md"
        }
        "5" {
            Write-Host "`n========================================" -ForegroundColor Cyan
            Write-Host "Repository Status" -ForegroundColor Cyan
            Write-Host "========================================`n" -ForegroundColor Cyan

            $status = Get-Content "$repoPath\.config\status.json" | ConvertFrom-Json

            Write-Host "Location:         " -NoNewline
            Write-Host $repoPath -ForegroundColor Yellow

            Write-Host "Current Branch:   " -NoNewline
            Write-Host $status.currentBranch -ForegroundColor Cyan

            Write-Host "Last Snapshot:    " -NoNewline
            Write-Host $status.lastSnapshot -ForegroundColor Yellow

            Write-Host "Snapshot Count:   " -NoNewline
            Write-Host $status.snapshotCount -ForegroundColor White

            Write-Host "Total Size:       " -NoNewline
            Write-Host $status.totalSize -ForegroundColor White

            Write-Host "Last Checked:     " -NoNewline
            Write-Host $status.lastChecked -ForegroundColor Gray

            Write-Host "`n"
        }
        "6" {
            Write-Host "`nGoodbye!`n" -ForegroundColor Green
            exit 0
        }
        default {
            Write-Host "`n❌ Invalid choice. Please run again.`n" -ForegroundColor Red
            exit 1
        }
    }

    exit 0
}

# First-time setup
Write-Host "This looks like your first time using the D:\ version control system.`n" -ForegroundColor Yellow

Write-Host "Here's what this system does:`n" -ForegroundColor White
Write-Host "  📸 Save snapshots of your workspace (like 'git commit')" -ForegroundColor Gray
Write-Host "  📚 Keep full history with descriptions" -ForegroundColor Gray
Write-Host "  ⏪ Restore to any previous state" -ForegroundColor Gray
Write-Host "  🏷️  Tag important versions (v1.0.0, production)" -ForegroundColor Gray
Write-Host "  📊 Automatic compression (97% smaller!)" -ForegroundColor Gray
Write-Host "  💾 All stored on D:\ drive (not in your workspace)`n" -ForegroundColor Gray

Write-Host "Think of it like GitHub, but local on your D:\ drive!`n" -ForegroundColor Cyan

$response = Read-Host "Ready to initialize? (Y/N)"

if ($response -ne 'Y') {
    Write-Host "`nSetup cancelled. Run this script again when ready.`n" -ForegroundColor Yellow
    exit 0
}

# Initialize repository
Write-Host "`n"
& "$PSScriptRoot\Initialize-LocalRepo.ps1"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Would you like to create your first snapshot now?`n" -ForegroundColor Cyan

$createSnapshot = Read-Host "Create first snapshot? (Y/N)"

if ($createSnapshot -eq 'Y') {
    Write-Host "`nGreat! Let's create your first snapshot.`n" -ForegroundColor Cyan

    Write-Host "This will save the current state of C:\dev to D:\repositories\vibetech\`n" -ForegroundColor Gray

    Write-Host "Enter a description (or press Enter for default):" -ForegroundColor Cyan
    $description = Read-Host "Description"

    if ([string]::IsNullOrWhiteSpace($description)) {
        $description = "Initial workspace state - first snapshot"
    }

    Write-Host "`n"
    & "$PSScriptRoot\Save-Snapshot.ps1" -Description $description

    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "🎉 Your First Snapshot is Complete!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
}

# Show next steps
Write-Host "Quick Reference:`n" -ForegroundColor Cyan

Write-Host "📸 Create snapshot:" -ForegroundColor White
Write-Host "   .\Save-Snapshot.ps1 -Description `"Your message`"`n" -ForegroundColor Gray

Write-Host "📚 View history:" -ForegroundColor White
Write-Host "   .\List-Snapshots.ps1`n" -ForegroundColor Gray

Write-Host "⏪ Restore snapshot:" -ForegroundColor White
Write-Host "   .\Restore-Snapshot.ps1 -SnapshotId `"20260114-153000`"`n" -ForegroundColor Gray

Write-Host "📖 Full documentation:" -ForegroundColor White
Write-Host "   C:\dev\D_DRIVE_VERSION_CONTROL_GUIDE.md`n" -ForegroundColor Gray

Write-Host "💡 Tip: Create snapshots before risky changes!" -ForegroundColor Yellow
Write-Host "   You can always restore to any previous state.`n" -ForegroundColor Gray

Write-Host "Enjoy your new version control system! 🚀`n" -ForegroundColor Green
