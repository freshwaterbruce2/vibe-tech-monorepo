function Get-FolderSize { param($path)
  if (!(Test-Path $path)) { return 0 }
  (Get-ChildItem $path -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
}
function Fmt { param($bytes)
  if ($bytes -ge 1GB) { return '{0:N1} GB' -f ($bytes/1GB) }
  if ($bytes -ge 1MB) { return '{0:N0} MB' -f ($bytes/1MB) }
  return '{0:N0} KB' -f ($bytes/1KB)
}

Write-Host '=== CLEANUP SURVEY ==='

$s1 = Get-FolderSize $env:TEMP
Write-Host "User TEMP ($($env:TEMP))`n  Size: $(Fmt $s1)"

$s2 = Get-FolderSize 'C:\Windows\Temp'
Write-Host "Windows TEMP`n  Size: $(Fmt $s2)"

$s3 = Get-FolderSize 'V:\monorepo\.nx\cache'
Write-Host "V:\monorepo .nx\cache`n  Size: $(Fmt $s3)"

$s4 = Get-FolderSize 'V:\monorepo\node_modules\.cache'
Write-Host "V:\monorepo node_modules\.cache`n  Size: $(Fmt $s4)"

$claudeTemp = Join-Path $env:LOCALAPPDATA 'Temp\claude'
$s5 = Get-FolderSize $claudeTemp
Write-Host "Claude tool-results cache ($claudeTemp)`n  Size: $(Fmt $s5)"

Write-Host 'Scanning V:\monorepo dist/ folders (skipping node_modules)...'
$distSize = 0
$distDirs = @()
Get-ChildItem V:\monorepo -Recurse -Filter 'dist' -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch 'node_modules' } |
  ForEach-Object {
    $sz = Get-FolderSize $_.FullName
    $distSize += $sz
    $distDirs += "  $($_.FullName) ($(Fmt $sz))"
  }
Write-Host "V:\monorepo dist/ folders: $(Fmt $distSize)"
$distDirs | ForEach-Object { Write-Host $_ }

$total = $s1 + $s2 + $s3 + $s4 + $s5 + $distSize
Write-Host "`nTOTAL ESTIMATE: $(Fmt $total)"
