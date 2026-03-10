<#
.SYNOPSIS
    Analyzes User Profile for Cleanup Candidates
#>
$profilePath = "C:\Users\fresh_zxae3v6"
$reportPath = "C:\dev\admin_scripts\profile_report.txt"

Write-Host "Analyzing Profile: $profilePath..." -ForegroundColor Cyan

# 1. Root Files (Non-System)
$systemFiles = @("NTUSER.DAT", "ntuser.ini")
$rootFiles = Get-ChildItem -Path $profilePath -File -Force -ErrorAction SilentlyContinue |
Where-Object { $_.Name -notin $systemFiles -and $_.Name -notmatch "^NTUSER\.DAT" -and $_.Name -notmatch "^ntuser\.dat" } |
Select-Object Name, @{N = 'SizeMB'; E = { "{0:N2}" -f ($_.Length / 1MB) } }, LastWriteTime

# 2. Large Dev Folders
$devFolders = @(".pnpm-store", ".cargo", ".rustup", ".gradle", ".m2", ".cache", ".gemini", ".vscode", "go", ".bun", ".node_modules")
$folderReport = @()

foreach ($folder in $devFolders) {
  $path = Join-Path $profilePath $folder
  if (Test-Path $path) {
    Write-Host "  Scanning $folder..." -NoNewline
    $size = (Get-ChildItem -Path $path -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host " $([math]::Round($size,2)) MB" -ForegroundColor Gray
    $folderReport += [PSCustomObject]@{
      Name   = $folder
      SizeMB = "{0:N2}" -f $size
    }
  }
}

# 3. Downloads Check
$downloads = Join-Path $profilePath "Downloads"
$downloadsCount = (Get-ChildItem $downloads -Force -ErrorAction SilentlyContinue | Measure-Object).Count

# Output
$report = @"
PROFILE CLEANUP REPORT
======================
ROOT FILES (Potential Clutter):
$($rootFiles | Format-Table -AutoSize | Out-String)

HEAVY DEV FOLDERS:
$($folderReport | Format-Table -AutoSize | Out-String)

DOWNLOADS:
Files: $downloadsCount

"@

$report | Out-File $reportPath
Write-Host "Report saved to $reportPath" -ForegroundColor Green
Write-Host $report
