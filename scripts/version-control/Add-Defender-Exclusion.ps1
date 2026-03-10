#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Add Windows Defender exclusions for D:\ version control system

.DESCRIPTION
    Adds exclusions so Windows Defender doesn't block snapshot creation.
    Must be run as Administrator.

.EXAMPLE
    Right-click PowerShell → Run as Administrator
    .\Add-Defender-Exclusion.ps1

.NOTES
    This is safe - only excludes the snapshots directory from scanning.
#>

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║        Windows Defender Exclusion Setup                   ║" -ForegroundColor Cyan
Write-Host "║        D:\ Version Control System                         ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`nThis script will add Windows Defender exclusions for:`n" -ForegroundColor White

Write-Host "  1. D:\repositories\vibetech\snapshots\" -ForegroundColor Yellow
Write-Host "     (Snapshot storage - safe to exclude)`n" -ForegroundColor Gray

Write-Host "  2. C:\dev\scripts\version-control\" -ForegroundColor Yellow
Write-Host "     (PowerShell scripts - safe to exclude)`n" -ForegroundColor Gray

Write-Host "Why is this needed?" -ForegroundColor Cyan
Write-Host "  Windows Defender sometimes flags snapshot files as suspicious" -ForegroundColor Gray
Write-Host "  during compression. This is a FALSE POSITIVE - your code is safe.`n" -ForegroundColor Gray

$confirm = Read-Host "Add these exclusions? (Y/N)"

if ($confirm -ne 'Y') {
    Write-Host "`nExclusions not added. You can run this script again anytime.`n" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n" -NoNewline

try {
    # Add exclusion for snapshots directory
    Write-Host "Adding exclusion for snapshots..." -ForegroundColor Cyan
    Add-MpPreference -ExclusionPath "D:\repositories\vibetech\snapshots"
    Write-Host "✓ Snapshots directory excluded" -ForegroundColor Green

    # Add exclusion for version-control scripts
    Write-Host "`nAdding exclusion for scripts..." -ForegroundColor Cyan
    Add-MpPreference -ExclusionPath "C:\dev\scripts\version-control"
    Write-Host "✓ Scripts directory excluded" -ForegroundColor Green

    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "║              Exclusions Added Successfully!                ║" -ForegroundColor Green
    Write-Host "║                                                            ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

    Write-Host "`nYou can now create snapshots without Defender interference.`n" -ForegroundColor White

    Write-Host "Verify exclusions with:" -ForegroundColor Cyan
    Write-Host "  Get-MpPreference | Select-Object -ExpandProperty ExclusionPath`n" -ForegroundColor Gray

} catch {
    Write-Host "`n❌ Error adding exclusions:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nMake sure you're running PowerShell as Administrator.`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "Press Enter to close..." -ForegroundColor DarkGray
Read-Host
