$backupDir = "V:\monorepo\apps\nova-agent\_backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupPath = Join-Path $backupDir "Backup_$timestamp.zip"

Compress-Archive -Path "V:\monorepo\apps\nova-agent\src", "V:\monorepo\apps\nova-agent\src-tauri" -DestinationPath $backupPath -Force

Write-Host "Backup created successfully: $backupPath"
