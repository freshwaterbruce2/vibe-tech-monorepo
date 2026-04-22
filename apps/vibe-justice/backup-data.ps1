# backup-data.ps1
$Source = "D:\learning-system\vibe-justice"
$BackupRoot = "D:\vibe-justice-backups"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$Destination = Join-Path $BackupRoot "backup_$Timestamp"

Write-Host "💾 Starting local backup from $Source to $Destination" -ForegroundColor Cyan

if (-not (Test-Path $Source)) {
    Write-Host "❌ Source directory not found: $Source" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $BackupRoot)) {
    New-Item -ItemType Directory -Path $BackupRoot | Out-Null
}

Copy-Item -Path $Source -Destination $Destination -Recurse -Force

Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
