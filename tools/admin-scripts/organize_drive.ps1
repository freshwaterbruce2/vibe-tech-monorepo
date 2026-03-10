<#
.SYNOPSIS
    Organizes D:\ drive based on the approved strategy.

.DESCRIPTION
    Moves folders into categorizes: Dev, Data, Media, Archives.
    CRITICAL: Does NOT touch protected system folders.

.PARAMETER WhatIf
    If set, only shows what would happen without moving files.

.EXAMPLE
    .\organize_drive.ps1 -WhatIf
    .\organize_drive.ps1
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param()

$root = "D:\"
$logFile = "C:\dev\admin_scripts\organization_log.txt"

function Log-Message {
  param([string]$Message)
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$ts] $Message"
  Write-Host $Message
  Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue
}

Log-Message "Starting Drive Organization..."
if ($PSCmdlet.ShouldProcess("D:\", "Organize Folders")) {
  Log-Message "Mode: Active Execution"
}
else {
  Log-Message "Mode: WhatIf / Dry Run"
}

# ----------------------------------------------------------------
# CONFIGURATION - TARGET STRUCTURE
# ----------------------------------------------------------------

# 1. Define Destinations
$destinations = @{
  "Dev"      = "D:\Dev"
  "Data"     = "D:\Data"
  "Media"    = "D:\Media"
  "Archives" = "D:\Archives"
  "Logs"     = "D:\Logs"
}

# 2. Define Moves (Source Name -> Destination Key)
$moves = @{
  # Dev
  "repositories"            = "Dev"
  "dev"                     = "Dev"
  "fresh_zxae3v6"           = "Dev"

  # Data
  "models"                  = "Data"
  "pnpm-store"              = "Data"

  # Media
  "camera_roll"             = "Media"
  "cameraroll"              = "Media"
  "screenshots"             = "Media"
  "Attachments"             = "Media"
  "uploads"                 = "Media"
  "christopher_coming_home" = "Media"

  # Archives
  "backups"                 = "Archives"
  "installers"              = "Archives"
  "exports"                 = "Archives"
  "SCDEW"                   = "Archives"
  "New folder"              = "Archives" # Needs manual sorting later

  # Logs
  "logs"                    = "Logs"
  "logsopenrouter-proxy"    = "Logs"
}

# 3. Explicit Protection List (Just in case logic fails)
$protected = @(
  "databases",
  "learning-system",
  "WindowsApps",
  "WpSystem",
  "Program Files",
  "`$Recycle.Bin",
  "System Volume Information"
)

# ----------------------------------------------------------------
# EXECUTION
# ----------------------------------------------------------------

# Create Destinations
foreach ($key in $destinations.Keys) {
  $path = $destinations[$key]
  if (-not (Test-Path $path)) {
    if ($PSCmdlet.ShouldProcess($path, "Create Directory")) {
      New-Item -ItemType Directory -Path $path -Force | Out-Null
      Log-Message "Created: $path"
    }
  }
}

# Execute Moves
foreach ($folderName in $moves.Keys) {
  $sourcePath = Join-Path $root $folderName
  $targetCategory = $moves[$folderName]
  $targetRoot = $destinations[$targetCategory]
  $destinationPath = Join-Path $targetRoot $folderName

  # Check Protection
  if ($protected -contains $folderName) {
    Write-Warning "SKIPPING PROTECTED: $sourcePath"
    continue
  }

  if (Test-Path $sourcePath) {
    # Check Collision
    if (Test-Path $destinationPath) {
      Write-Warning "COLLISION: $destinationPath already exists. Skipping $sourcePath."
      Log-Message "Skipped (Collision): $sourcePath -> $destinationPath"
      continue
    }

    # Move
    if ($PSCmdlet.ShouldProcess("$sourcePath -> $destinationPath", "Move Directory")) {
      try {
        Move-Item -Path $sourcePath -Destination $targetRoot -ErrorAction Stop
        Log-Message "Moved: $sourcePath -> $targetRoot"
      }
      catch {
        Write-Error "Failed to move $sourcePath : $_"
        Log-Message "ERROR: Failed to move $sourcePath"
      }
    }
  }
}

# Cleanup Root Files (Optional: Move loose files to Archives\RootClutter)
$clutterDir = "D:\Archives\RootClutter"
$rootFiles = Get-ChildItem -Path $root -File -Force -ErrorAction SilentlyContinue

foreach ($file in $rootFiles) {
  if ($file.Name -in @("DumpStack.log", "DumpStack.log.tmp", "DUMP2838.tmp")) {
    # Safe trash
    if ($PSCmdlet.ShouldProcess($file.FullName, "Remove System Dump/Log")) {
      Remove-Item $file.FullName -Force
      Log-Message "Deleted: $($file.Name)"
    }
  }
  elseif ($file.Name -notmatch "^WinPEpge.sys$") {
    # Move others to cluttered
    if (-not (Test-Path $clutterDir)) {
      if ($PSCmdlet.ShouldProcess($clutterDir, "Create Directory")) { New-Item -ItemType Directory -Path $clutterDir | Out-Null }
    }
    if ($PSCmdlet.ShouldProcess($file.FullName, "Move to $clutterDir")) {
      Move-Item $file.FullName $clutterDir
      Log-Message "Moved File: $($file.Name) -> $clutterDir"
    }
  }
}

Log-Message "Organization Complete."
