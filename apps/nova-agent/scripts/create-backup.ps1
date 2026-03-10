$backupDir = "C:\dev\apps\nova-agent\_backups"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupPath = Join-Path $backupDir "Backup_$timestamp.zip"

Compress-Archive -Path "C:\dev\apps\nova-agent\src", "C:\dev\apps\nova-agent\src-tauri" -DestinationPath $backupPath -Force

Write-Host "Backup created successfully: $backupPath"
