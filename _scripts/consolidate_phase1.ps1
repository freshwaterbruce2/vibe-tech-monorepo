Get-ChildItem "D:\databases\backups\" -Directory |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 3 |
  ForEach-Object {
    Write-Output "Backup: $($_.FullName)"
    Get-ChildItem $_.FullName | Select-Object Name, Length
  }
