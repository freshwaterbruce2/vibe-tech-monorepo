<#
.SYNOPSIS
    Quick D:\ Drive Analysis - Root Level Only
#>

param (
  [string]$RootPath = "D:\",
  [string]$ReportPath = "C:\dev\admin_scripts\quick_drive_report.txt"
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "`nQuick D:\ Analysis Starting..." -ForegroundColor Cyan

# Root Level Files
Write-Host "[1/3] Root Level Files..." -ForegroundColor Yellow
$RootFiles = Get-ChildItem -Path $RootPath -File -Force -ErrorAction SilentlyContinue
$RootReport = $RootFiles | Select-Object Name, @{N = 'SizeMB'; E = { "{0:N2}" -f ($_.Length / 1MB) } }, LastWriteTime

# Root Level Directories with Sizes
Write-Host "[2/3] Root Level Directory Sizes..." -ForegroundColor Yellow
$Dirs = Get-ChildItem -Path $RootPath -Directory -Force -ErrorAction SilentlyContinue
$DirSizes = @()
foreach ($dir in $Dirs) {
  if ($dir.Name -notin @('$Recycle.Bin', 'System Volume Information', 'databases', 'learning-system')) {
    Write-Host "  Calculating: $($dir.Name)" -ForegroundColor Gray
    $size = (Get-ChildItem -Path $dir.FullName -Recurse -File -Force -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum / 1GB
    $DirSizes += [PSCustomObject]@{
      Name         = $dir.Name
      SizeGB       = "{0:N2}" -f $size
      LastModified = $dir.LastWriteTime
    }
  }
}

# Largest Root Directories
Write-Host "[3/3] Compiling Report..." -ForegroundColor Yellow
$TopDirs = $DirSizes | Sort-Object { [double]$_.SizeGB } -Descending | Select-Object -First 20

# Generate Report
$report = @"
=================================================
D:\ DRIVE QUICK ANALYSIS REPORT
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
=================================================

ROOT LEVEL FILES (Clutter):
$(if ($RootFiles.Count -eq 0) { "  [None - Clean!]" } else { $RootReport | Format-Table -AutoSize | Out-String })

TOP 20 SPACE-CONSUMING DIRECTORIES:
$($TopDirs | Format-Table -AutoSize | Out-String)

SUMMARY:
- Root Files: $($RootFiles.Count)
- Root Directories: $($Dirs.Count)
- Protected/Skipped: databases, learning-system, System folders

=================================================
"@

$report | Out-File -FilePath $ReportPath -Encoding UTF8
Write-Host "`nReport saved to: $ReportPath" -ForegroundColor Green
Write-Host $report
