
# MoltBot Backup Automation
# Backs up configuration (.openclaw), memory database (D:\databases\moltbot_memory.sqlite), and hooks (.claude)
# Retention: 14 days (Config), 30 days (Memory/Deep Recall)

$BackupRoot = "D:\backups\moltbot"
$ConfigPath = "C:\Users\fresh_zxae3v6\.openclaw"
$MemoryPath = "D:\databases\moltbot_memory.sqlite"
$HooksPath  = "C:\dev\.claude"
$Date = Get-Date -Format "yyyyMMdd"

# Ensure backup directory
if (!(Test-Path $BackupRoot)) { New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null }

function Create-ZipBackup {
    param ($Source, $Name, $RetentionDays)

    $Dest = "$BackupRoot\${Name}_$Date.zip"

    if (Test-Path $Source) {
        Write-Host "Backing up $Name from $Source..."
        Compress-Archive -Path $Source -DestinationPath $Dest -Force

        # Cleanup old backups
        Get-ChildItem -Path $BackupRoot -Filter "${Name}_*.zip" | Where-Object {
            $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays)
        } | Remove-Item -Force -Verbose
    } else {
        Write-Host "Source not found: $Source"
    }
}

# 1. Backup Config (14 Days)
Create-ZipBackup -Source $ConfigPath -Name "config" -RetentionDays 14

# 2. Backup Memory DB (30 Days - Deep Recall)
Create-ZipBackup -Source $MemoryPath -Name "memory_db" -RetentionDays 30

# 3. Backup Hooks (30 Days - Core Infrastructure)
Create-ZipBackup -Source $HooksPath -Name "hooks_core" -RetentionDays 30
