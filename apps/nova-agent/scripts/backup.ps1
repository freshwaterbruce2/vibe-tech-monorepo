$timestamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$source = ".\src"
$dest = ".\_backups\Backup_$timestamp.zip"
if (!(Test-Path ".\_backups")) { New-Item -ItemType Directory -Force -Path ".\_backups" }
Compress-Archive -Path $source -DestinationPath $dest
Write-Host "✅ Backup Secure: $dest" -ForegroundColor Green
