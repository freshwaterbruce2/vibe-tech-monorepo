# Find files exceeding 500-line limit (improved version)
$ErrorActionPreference = 'SilentlyContinue'
$maxLines = 500
$results = @()

Write-Host "Scanning for files exceeding $maxLines lines..." -ForegroundColor Cyan

Get-ChildItem -Path "C:\dev" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch 'node_modules|dist|build|\.nx|coverage|\.pnpm|\.vscode|\.git'
  } |
  ForEach-Object {
    try {
      $lineCount = @(Get-Content $_.FullName -ErrorAction Stop).Count
      if ($lineCount -gt $maxLines) {
        $results += [PSCustomObject]@{
          Path = $_.FullName.Replace("C:\dev\", "")
          Lines = $lineCount
          Violation = $lineCount - $maxLines
        }
      }
    }
    catch {
      # Silently skip files that can't be read
    }
  }

Write-Host "`n=== Files Exceeding $maxLines Lines ===" -ForegroundColor Yellow
$results | Sort-Object -Property Lines -Descending | Format-Table -AutoSize
Write-Host "`nTotal violations: $($results.Count)" -ForegroundColor $(if ($results.Count -gt 0) { 'Red' } else { 'Green' })

# Export to JSON for further analysis
$results | ConvertTo-Json | Out-File "C:\dev\large-files-report.json" -Encoding UTF8
Write-Host "Report exported to: C:\dev\large-files-report.json" -ForegroundColor Cyan
