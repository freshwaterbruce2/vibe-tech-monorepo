param(
  [string]$RepoRoot = "C:\dev",
  [string]$LogPath = "D:\logs\dev-metrics.log",
  [int]$MaxLines = 360
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

if (-not (Test-Path $RepoRoot)) {
  Write-Error "Repo root not found: $RepoRoot"
  exit 1
}

$logDir = Split-Path $LogPath
if (-not (Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

function Write-Log($message) {
  Add-Content -Path $LogPath -Value $message
}

# VS Code extensions (optional)
$extensions = @()
try {
  $codeCmd = Get-Command code -ErrorAction Stop
  $extOutput = & $codeCmd.Source --list-extensions --show-versions 2>$null
  if ($extOutput) {
    $extensions = $extOutput | Sort-Object
  }
} catch {
  $extensions = @("code-cli-not-found")
}

# D: drive space
$drive = Get-PSDrive -Name D -ErrorAction SilentlyContinue
$freeGB = if ($drive) { [math]::Round($drive.Free / 1GB, 2) } else { 'n/a' }
$usedGB = if ($drive -and $drive.Used) { [math]::Round($drive.Used / 1GB, 2) } else { 'n/a' }

# Line-length offenders
$offenders = @()
$gitAvailable = $true
Push-Location $RepoRoot
try {
  try {
    $tracked = git ls-files *.ts *.tsx *.js *.jsx *.mjs *.cjs *.json *.md *.css *.scss *.sass *.ps1 *.py *.cs 2>$null
  } catch {
    $gitAvailable = $false
    $tracked = @()
  }

  foreach ($file in $tracked) {
    $path = Join-Path $RepoRoot $file
    if (-not (Test-Path $path)) { continue }
    $lineCount = ([System.IO.File]::ReadLines($path)).Count
    if ($lineCount -gt $MaxLines) {
      $offenders += [pscustomobject]@{ File = $file; Lines = $lineCount }
    }
  }
} finally {
  Pop-Location
}

# Write log
$summary = "$timestamp | D_Free_GB=$freeGB | D_Used_GB=$usedGB | VSCode_Extensions=$($extensions.Count) | Line_Offenders=$($offenders.Count)"
Write-Log $summary

if ($extensions.Count -gt 0 -and $extensions[0] -ne "code-cli-not-found") {
  Write-Log ("Extensions: " + ($extensions -join ", "))
} else {
  Write-Log "Extensions: code CLI not available"
}

if (-not $gitAvailable) {
  Write-Log "Line-length scan skipped: git CLI not available in PATH"
} elseif ($offenders.Count -gt 0) {
  $offenders |
    Sort-Object Lines -Descending |
    ForEach-Object { Write-Log ("{0} | {1} lines" -f $_.File, $_.Lines) }
} else {
  Write-Log "No files exceed $MaxLines lines"
}

Write-Log ("---")
