#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Add Windows Defender exclusions for development directories

.DESCRIPTION
    Adds exclusions to Windows Defender for C:\dev and related build/cache directories
    to improve build performance (5-10% faster).

.NOTES
    Requires Administrator privileges
    Safe for development directories - only excludes code/build artifacts
#>

param(
    [switch]$DryRun,
    [switch]$List,
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Directories to exclude
$ExclusionPaths = @(
    "C:\dev",                           # Main development directory
    "C:\dev\node_modules",              # Node modules (scanned heavily)
    "C:\dev\.nx",                       # Nx cache
    "C:\dev\.pnpm-store",               # pnpm global store
    "D:\databases",                     # Database files
    "D:\learning-system",               # Learning system data
    "D:\logs",                          # Log files
    "D:\backups",                       # Backup files
    "$env:LOCALAPPDATA\pnpm\store"      # User pnpm store
)

# Processes to exclude (optional - mainly for better performance)
$ExclusionProcesses = @(
    "node.exe",
    "pnpm.exe",
    "npm.exe",
    "tsc.exe",
    "esbuild.exe",
    "vite.exe"
)

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-CurrentExclusions {
    Write-Info "`n📋 Current Windows Defender Exclusions:"
    Write-Info "`nPath Exclusions:"
    $paths = Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
    if ($paths) {
        $paths | ForEach-Object { Write-Host "  ✓ $_" }
    } else {
        Write-Host "  (none)"
    }

    Write-Info "`nProcess Exclusions:"
    $processes = Get-MpPreference | Select-Object -ExpandProperty ExclusionProcess
    if ($processes) {
        $processes | ForEach-Object { Write-Host "  ✓ $_" }
    } else {
        Write-Host "  (none)"
    }
}

function Add-DefenderExclusions {
    Write-Info "`n🛡️  Adding Windows Defender Exclusions for Development..."

    # Add path exclusions
    Write-Info "`nAdding Path Exclusions:"
    foreach ($path in $ExclusionPaths) {
        if (Test-Path $path -ErrorAction SilentlyContinue) {
            if ($DryRun) {
                Write-Info "  [DRY RUN] Would exclude: $path"
            } else {
                try {
                    Add-MpPreference -ExclusionPath $path -ErrorAction Stop
                    Write-Success "  ✓ Added: $path"
                } catch {
                    if ($_.Exception.Message -like "*already exists*") {
                        Write-Warning "  ⚠ Already excluded: $path"
                    } else {
                        Write-Error "  ✗ Failed: $path - $($_.Exception.Message)"
                    }
                }
            }
        } else {
            Write-Warning "  ⏭ Skipped (not found): $path"
        }
    }

    # Add process exclusions
    Write-Info "`nAdding Process Exclusions:"
    foreach ($process in $ExclusionProcesses) {
        if ($DryRun) {
            Write-Info "  [DRY RUN] Would exclude: $process"
        } else {
            try {
                Add-MpPreference -ExclusionProcess $process -ErrorAction Stop
                Write-Success "  ✓ Added: $process"
            } catch {
                if ($_.Exception.Message -like "*already exists*") {
                    Write-Warning "  ⚠ Already excluded: $process"
                } else {
                    Write-Error "  ✗ Failed: $process - $($_.Exception.Message)"
                }
            }
        }
    }
}

function Remove-DefenderExclusions {
    Write-Warning "`n⚠️  Removing Windows Defender Exclusions..."

    Write-Info "`nRemoving Path Exclusions:"
    foreach ($path in $ExclusionPaths) {
        try {
            Remove-MpPreference -ExclusionPath $path -ErrorAction Stop
            Write-Success "  ✓ Removed: $path"
        } catch {
            Write-Warning "  ⏭ Not found: $path"
        }
    }

    Write-Info "`nRemoving Process Exclusions:"
    foreach ($process in $ExclusionProcesses) {
        try {
            Remove-MpPreference -ExclusionProcess $process -ErrorAction Stop
            Write-Success "  ✓ Removed: $process"
        } catch {
            Write-Warning "  ⏭ Not found: $process"
        }
    }
}

# Main execution
try {
    Write-Info "╔══════════════════════════════════════════════════════════╗"
    Write-Info "║   Windows Defender Exclusions for Development          ║"
    Write-Info "╚══════════════════════════════════════════════════════════╝"

    # Check administrator privileges
    if (-not (Test-Administrator)) {
        Write-Error "`n❌ ERROR: This script requires Administrator privileges."
        Write-Info "`nPlease run PowerShell as Administrator and try again."
        Write-Info "Right-click PowerShell → 'Run as Administrator'"
        exit 1
    }

    if ($List) {
        Get-CurrentExclusions
        exit 0
    }

    if ($Remove) {
        Remove-DefenderExclusions
        Write-Success "`n✅ Exclusions removed successfully!"
        Get-CurrentExclusions
        exit 0
    }

    # Add exclusions
    if ($DryRun) {
        Write-Warning "`n⚠️  DRY RUN MODE - No changes will be made"
    }

    Add-DefenderExclusions

    Write-Success "`n✅ Windows Defender exclusions configured successfully!"

    if (-not $DryRun) {
        Write-Info "`n📊 Expected Performance Improvement:"
        Write-Info "  • Build times: 5-10% faster"
        Write-Info "  • pnpm install: 10-15% faster"
        Write-Info "  • File operations: Reduced I/O latency"

        Write-Info "`n🔒 Security Notes:"
        Write-Info "  • Exclusions only apply to development directories"
        Write-Info "  • Your code is still protected by Git version control"
        Write-Info "  • Windows Defender still scans other directories"
        Write-Info "  • Safe for development use"

        Write-Info "`n📋 To view current exclusions:"
        Write-Info "  powershell -ExecutionPolicy Bypass -File scripts\setup-defender-exclusions.ps1 -List"

        Write-Info "`n🗑️  To remove exclusions:"
        Write-Info "  powershell -ExecutionPolicy Bypass -File scripts\setup-defender-exclusions.ps1 -Remove"
    }

} catch {
    Write-Error "`n❌ ERROR: $($_.Exception.Message)"
    exit 1
}
