function Fmt { param($bytes)
  if ($bytes -ge 1GB) { return '{0:N1} GB' -f ($bytes/1GB) }
  if ($bytes -ge 1MB) { return '{0:N0} MB' -f ($bytes/1MB) }
  return '{0:N0} KB' -f ($bytes/1KB)
}

$freed = 0

# 1. User TEMP
Write-Host "Cleaning User TEMP ($env:TEMP)..."
$before = (Get-ChildItem $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
Get-ChildItem $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue |
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
$after = (Get-ChildItem $env:TEMP -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
$delta = $before - $after
$freed += $delta
Write-Host "  Freed: $(Fmt $delta)"

# 2. Claude tool-results cache
$claudeTemp = Join-Path $env:LOCALAPPDATA 'Temp\claude'
if (Test-Path $claudeTemp) {
  Write-Host "Cleaning Claude tool-results cache..."
  $before2 = (Get-ChildItem $claudeTemp -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  Remove-Item "$claudeTemp\*" -Recurse -Force -ErrorAction SilentlyContinue
  $freed += $before2
  Write-Host "  Freed: $(Fmt $before2)"
}

Write-Host ""
Write-Host "Total freed: $(Fmt $freed)"
