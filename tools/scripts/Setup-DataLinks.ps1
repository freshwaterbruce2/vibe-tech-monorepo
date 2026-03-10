# Setup symbolic links between C:\dev and D:\ for large data files
# Run as Administrator for symlink creation

param(
    [switch]$DryRun = $false
)

$links = @(
    @{
        Link = "C:\dev\apps\crypto-enhanced\logs"
        Target = "D:\logs\crypto-enhanced"
    },
    @{
        Link = "C:\dev\apps\crypto-enhanced\databases"
        Target = "D:\databases\crypto-enhanced"
    },
    @{
        Link = "C:\dev\logs"
        Target = "D:\logs\monorepo"
    },
    @{
        Link = "C:\dev\data"
        Target = "D:\data"
    }
)

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin -and -not $DryRun) {
    Write-Warning "This script requires Administrator privileges for creating symbolic links"
    Write-Host "Please run: Start-Process powershell -Verb RunAs -ArgumentList '-File $PSCommandPath'"
    exit 1
}

Write-Host "🔗 Setting up symbolic links for data storage" -ForegroundColor Cyan
Write-Host "=" * 50

foreach ($item in $links) {
    $link = $item.Link
    $target = $item.Target

    Write-Host "`nProcessing: $link -> $target"

    # Check if link already exists
    if (Test-Path $link) {
        $existing = Get-Item $link
        if ($existing.LinkType -eq "SymbolicLink") {
            Write-Host "  ✅ Link already exists" -ForegroundColor Green
            continue
        } else {
            Write-Warning "  Path exists but is not a symlink. Skipping."
            continue
        }
    }

    # Ensure target directory exists
    if (-not (Test-Path $target)) {
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would create directory: $target" -ForegroundColor Yellow
        } else {
            New-Item -ItemType Directory -Path $target -Force | Out-Null
            Write-Host "  📁 Created target directory" -ForegroundColor Gray
        }
    }

    # Create symbolic link
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would create symlink: $link -> $target" -ForegroundColor Yellow
    } else {
        try {
            New-Item -ItemType SymbolicLink -Path $link -Target $target -Force | Out-Null
            Write-Host "  ✅ Created symlink" -ForegroundColor Green
        } catch {
            Write-Error "  ❌ Failed to create symlink: $_"
        }
    }
}

Write-Host "`n✨ Symlink setup complete!" -ForegroundColor Green

# Add to .gitignore if needed
$gitignorePath = "C:\dev\.gitignore"
$ignoreEntries = @(
    "# Symbolic links to D:\ drive",
    "logs",
    "data",
    "databases"
)

Write-Host "`nChecking .gitignore..."
$gitignore = Get-Content $gitignorePath -ErrorAction SilentlyContinue

foreach ($entry in $ignoreEntries) {
    if ($entry -eq "# Symbolic links to D:\ drive" -or $gitignore -contains $entry) {
        continue
    }
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would add to .gitignore: $entry" -ForegroundColor Yellow
    } else {
        Add-Content -Path $gitignorePath -Value $entry
        Write-Host "  Added to .gitignore: $entry" -ForegroundColor Gray
    }
}