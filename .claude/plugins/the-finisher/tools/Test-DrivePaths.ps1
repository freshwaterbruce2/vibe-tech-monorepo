# Test-DrivePaths.ps1
# Validates that all D:\ paths referenced in config files exist

<#
.SYNOPSIS
    Validates D:\ drive paths for The Finisher plugin.

.DESCRIPTION
    Scans project configuration files for D:\ path references and verifies they exist.
    Reports missing paths as CRITICAL BLOCKERS.

.PARAMETER ProjectRoot
    Path to project root directory. Defaults to current directory.

.EXAMPLE
    .\Test-DrivePaths.ps1 -ProjectRoot "C:\dev\apps\nova-agent"
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

Write-Host "🔍 Validating D:\ paths for project: $ProjectRoot" -ForegroundColor Cyan
Write-Host ""

# Initialize results
$results = @{
    DatabasePaths = @()
    LearningSystem = @()
    LogPaths = @()
    MissingPaths = @()
    ValidPaths = @()
}

# Function to check if path exists
function Test-PathExists {
    param([string]$Path)

    if (Test-Path $Path) {
        return $true
    }

    # Try parent directory if specific file doesn't exist
    $parentDir = Split-Path $Path -Parent
    if ($parentDir -and (Test-Path $parentDir)) {
        return $true
    }

    return $false
}

# Function to extract D:\ paths from file content
function Get-DrivePaths {
    param(
        [string]$FilePath,
        [string]$Content
    )

    $paths = @()

    # Pattern: D:\... or D:/...
    $matches = [regex]::Matches($Content, '[Dd]:[\\\/][^\s"''<>]+')

    foreach ($match in $matches) {
        $path = $match.Value
        # Normalize path
        $path = $path -replace '/', '\'
        # Remove trailing characters that might be part of syntax
        $path = $path -replace '[,;)}\]]+$', ''

        if ($path -and $path.Length -gt 3) {
            $paths += $path
        }
    }

    return $paths
}

# Scan common config files
$configFiles = @(
    '.env',
    '.env.local',
    '.env.production',
    'config.py',
    'config.ts',
    'config.js',
    'tsconfig.json',
    'package.json'
)

Write-Host "📂 Scanning configuration files..." -ForegroundColor Yellow

foreach ($configFile in $configFiles) {
    $filePath = Join-Path $ProjectRoot $configFile

    if (Test-Path $filePath) {
        Write-Host "  ✓ Found: $configFile" -ForegroundColor Gray

        $content = Get-Content $filePath -Raw
        $paths = Get-DrivePaths -FilePath $configFile -Content $content

        foreach ($path in $paths) {
            # Categorize by type
            if ($path -like "*databases*") {
                $results.DatabasePaths += $path
            }
            elseif ($path -like "*learning-system*") {
                $results.LearningSystem += $path
            }
            elseif ($path -like "*logs*") {
                $results.LogPaths += $path
            }

            # Check existence
            if (Test-PathExists $path) {
                $results.ValidPaths += $path
                Write-Host "    ✅ Valid: $path" -ForegroundColor Green
            }
            else {
                $results.MissingPaths += $path
                Write-Host "    ❌ Missing: $path" -ForegroundColor Red
            }
        }
    }
}

Write-Host ""

# Check standard D:\ locations
Write-Host "📂 Checking standard D:\ locations..." -ForegroundColor Yellow

$standardPaths = @{
    "D:\databases" = "Database storage"
    "D:\learning-system" = "Learning system knowledge base"
    "D:\logs" = "Application logs"
}

foreach ($pathEntry in $standardPaths.GetEnumerator()) {
    $path = $pathEntry.Key
    $description = $pathEntry.Value

    if (Test-Path $path) {
        Write-Host "  ✅ $path - $description" -ForegroundColor Green
        $results.ValidPaths += $path
    }
    else {
        Write-Host "  ⚠️  $path - $description (not found, may not be needed)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "📊 VALIDATION SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

Write-Host "Database Paths Found: $($results.DatabasePaths.Count)" -ForegroundColor White
Write-Host "Learning System Paths Found: $($results.LearningSystem.Count)" -ForegroundColor White
Write-Host "Log Paths Found: $($results.LogPaths.Count)" -ForegroundColor White
Write-Host ""
Write-Host "Valid Paths: $($results.ValidPaths.Count)" -ForegroundColor Green
Write-Host "Missing Paths: $($results.MissingPaths.Count)" -ForegroundColor $(if ($results.MissingPaths.Count -gt 0) { "Red" } else { "Green" })

if ($results.MissingPaths.Count -gt 0) {
    Write-Host ""
    Write-Host "🚨 CRITICAL BLOCKERS DETECTED" -ForegroundColor Red
    Write-Host ""
    Write-Host "The following D:\ paths are referenced but do not exist:" -ForegroundColor Red
    foreach ($missingPath in $results.MissingPaths | Select-Object -Unique) {
        Write-Host "  - $missingPath" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "🔧 Recommended Actions:" -ForegroundColor Yellow
    Write-Host "  1. Create missing directories:" -ForegroundColor Gray
    foreach ($missingPath in $results.MissingPaths | Select-Object -Unique) {
        $dir = Split-Path $missingPath -Parent
        if ($dir) {
            Write-Host "     New-Item -Path '$dir' -ItemType Directory -Force" -ForegroundColor Gray
        }
    }
    Write-Host "  2. Update config files with correct paths" -ForegroundColor Gray
    Write-Host "  3. Verify .env files are properly configured" -ForegroundColor Gray

    exit 1
}
else {
    Write-Host ""
    Write-Host "✅ All D:\ path validations passed!" -ForegroundColor Green
    exit 0
}
