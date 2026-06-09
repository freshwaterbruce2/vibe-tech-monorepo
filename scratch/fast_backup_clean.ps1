$staging = "D:\tmp\backup-obsolete"
if (Test-Path $staging) {
    Remove-Item -Path $staging -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$commonXD = @("node_modules", "dist", ".venv", ".mypy_cache", ".pytest_cache", "__pycache__", "coverage_html", "htmlcov", "target", "dist-electron", "_backups", "docs", "archive", "FEATURE_SPECS")
$commonXF = @("*.tsbuildinfo", "*.log", "*.db", "*.coverage")

function Copy-Source {
    param($src, $destName)
    $dest = "$staging\$destName"
    robocopy $src $dest /S /XD $commonXD /XF $commonXF /NFL /NDL /NJH /NJS /R:1 /W:1 | Out-Null
    Write-Output "Staged $src -> $dest"
}

Copy-Source "C:\dev\apps\desktop-commander-v3" "desktop-commander-v3"
Copy-Source "C:\dev\apps\crypto-enhanced" "crypto-enhanced"
Copy-Source "C:\dev\apps\prompt-engineer" "prompt-engineer"
Copy-Source "C:\dev\apps\vibe-justice" "vibe-justice"
Copy-Source "C:\dev\apps\symptom-tracker-api" "symptom-tracker-api"

$backupDir = "C:\dev\_backups"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$zipPath = "$backupDir\Backup_Obsolete_Apps_$timestamp.zip"
Compress-Archive -Path $staging -DestinationPath $zipPath -Force
Write-Output "Created backup at $zipPath"

Remove-Item -Path $staging -Recurse -Force -ErrorAction SilentlyContinue
