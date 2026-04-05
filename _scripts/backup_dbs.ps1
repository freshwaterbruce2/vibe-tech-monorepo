$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = "D:\databases\backups\pre-consolidation_$ts"
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item "D:\databases\agent_learning.db" "$backup\agent_learning.db" -Force
Copy-Item "D:\databases\nova_shared.db" "$backup\nova_shared.db" -Force
Write-Output "Backup at: $backup"
Get-ChildItem $backup | Select-Object Name, Length
