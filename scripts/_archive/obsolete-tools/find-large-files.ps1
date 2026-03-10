# Find files exceeding 500-line limit
$maxLines = 500
$results = @()

Get-ChildItem -Path "C:\dev\apps", "C:\dev\packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" -File |
  Where-Object { $_.FullName -notmatch 'node_modules|dist|build|\.nx|coverage' } |
  ForEach-Object {
    $lineCount = (Get-Content $_.FullName).Count
    if ($lineCount -gt $maxLines) {
      $results += [PSCustomObject]@{
        Path = $_.FullName.Replace("C:\dev\", "")
        Lines = $lineCount
        Violation = $lineCount - $maxLines
      }
    }
  }

$results | Sort-Object -Property Lines -Descending | Format-Table -AutoSize
Write-Host "`nTotal files exceeding $maxLines lines: $($results.Count)" -ForegroundColor Yellow