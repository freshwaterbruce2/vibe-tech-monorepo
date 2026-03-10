# Script to prepare native modules for electron-builder
# Copies prebuilt native modules to avoid electron-rebuild npm/workspace conflicts

$ErrorActionPreference = "Stop"

Write-Host "📦 Preparing native modules for packaging..." -ForegroundColor Cyan

# Create native-modules directory
$nativeModulesPath = Join-Path $PSScriptRoot ".." "native-modules"
if (-not (Test-Path $nativeModulesPath)) {
    New-Item -ItemType Directory -Force -Path $nativeModulesPath | Out-Null
}

# Source path for node_modules (monorepo root)
$nodeModulesPath = Join-Path $PSScriptRoot ".." ".." ".." "node_modules"

# Modules to copy
$modules = @("better-sqlite3", "bindings", "file-uri-to-path")

foreach ($module in $modules) {
    $src = Join-Path $nodeModulesPath $module
    $dest = Join-Path $nativeModulesPath $module

    if (Test-Path $src) {
        Write-Host "  Copying $module..." -ForegroundColor Gray
        if (Test-Path $dest) {
            Remove-Item -Recurse -Force $dest
        }
        Copy-Item -Recurse -Force $src $dest
    } else {
        Write-Host "  ⚠️ Module $module not found at $src" -ForegroundColor Yellow
    }
}

Write-Host "✅ Native modules prepared successfully!" -ForegroundColor Green
