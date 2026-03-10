<#
.SYNOPSIS
    Final Fix for D:\ Drive Organization
#>

$ErrorActionPreference = "Continue"

Write-Host "Starting Final Fix..." -ForegroundColor Cyan

# 1. Fix Users
# Ensure Destination
if (-not (Test-Path "D:\Dev\Users")) { New-Item -ItemType Directory -Path "D:\Dev\Users" -Force | Out-Null }

# Move from Dev Root
if (Test-Path "D:\Dev\fresh_zxae3v6") {
  Write-Host "Moving D:\Dev\fresh_zxae3v6 -> D:\Dev\Users"
  Move-Item -Path "D:\Dev\fresh_zxae3v6" -Destination "D:\Dev\Users" -Force -ErrorAction Continue
}
# Move from Drive Root (if exists)
if (Test-Path "D:\fresh_zxae3v6") {
  Write-Host "Moving D:\fresh_zxae3v6 -> D:\Dev\Users"
  Move-Item -Path "D:\fresh_zxae3v6" -Destination "D:\Dev\Users" -Force -ErrorAction Continue
}

# 2. Fix Workspace
# Ensure Destination
if (-not (Test-Path "D:\Dev\Workspace")) { New-Item -ItemType Directory -Path "D:\Dev\Workspace" -Force | Out-Null }

# Move Config
if (Test-Path "D:\Dev\config.yaml") {
  Move-Item "D:\Dev\config.yaml" "D:\Dev\Workspace" -Force
}

# Move Root Clutter -> D:\Dev\Workspace
$workspaceFolders = @(
  "deployments",
  "cache",
  "config",
  "custom",
  "scripts",
  "walmart_organized",
  "windows",
  "_build",
  "MapData",
  "VibeJusticeData",
  ".trading_bot",
  ".vscode"
)

foreach ($folder in $workspaceFolders) {
  if (Test-Path "D:\$folder") {
    Write-Host "Moving D:\$folder -> D:\Dev\Workspace"
    Move-Item -Path "D:\$folder" -Destination "D:\Dev\Workspace" -Force -ErrorAction Continue
  }
}

Write-Host "Fix Complete." -ForegroundColor Cyan
