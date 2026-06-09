$archiveRoot = "C:\dev\docs\archive"

function Safe-Copy-Item {
    param(
        [string]$Source,
        [string]$Destination
    )
    if (Test-Path $Source) {
        $parent = Split-Path $Destination -Parent
        if (!(Test-Path $parent)) {
            New-Item -ItemType Directory -Force -Path $parent | Out-Null
        }
        Copy-Item -Path $Source -Destination $Destination -Force -Recurse
        Write-Output "Copied $Source -> $Destination"
    } else {
        Write-Warning "Source not found: $Source"
    }
}

# 1. desktop-commander-v3
Safe-Copy-Item "C:\dev\apps\desktop-commander-v3\AI.md" "$archiveRoot\desktop-commander-v3\AI.md"
Safe-Copy-Item "C:\dev\apps\desktop-commander-v3\GEMINI.md" "$archiveRoot\desktop-commander-v3\GEMINI.md"
Safe-Copy-Item "C:\dev\apps\desktop-commander-v3\README.md" "$archiveRoot\desktop-commander-v3\README.md"
Safe-Copy-Item "C:\dev\apps\desktop-commander-v3\RELEASE_READY.md" "$archiveRoot\desktop-commander-v3\RELEASE_READY.md"

# 2. crypto-enhanced
Safe-Copy-Item "C:\dev\apps\crypto-enhanced\AI.md" "$archiveRoot\crypto-enhanced\AI.md"
Safe-Copy-Item "C:\dev\apps\crypto-enhanced\GEMINI.md" "$archiveRoot\crypto-enhanced\GEMINI.md"
Safe-Copy-Item "C:\dev\apps\crypto-enhanced\README.md" "$archiveRoot\crypto-enhanced\README.md"
Safe-Copy-Item "C:\dev\apps\crypto-enhanced\RELEASE_READY.md" "$archiveRoot\crypto-enhanced\RELEASE_READY.md"
Safe-Copy-Item "C:\dev\apps\crypto-enhanced\data\TIMESTAMP_SAFETY_GUIDE.md" "$archiveRoot\crypto-enhanced\data\TIMESTAMP_SAFETY_GUIDE.md"

# 3. prompt-engineer (prompt-engineer-app)
Safe-Copy-Item "C:\dev\apps\prompt-engineer\AI.md" "$archiveRoot\prompt-engineer\AI.md"
Safe-Copy-Item "C:\dev\apps\prompt-engineer\GEMINI.md" "$archiveRoot\prompt-engineer\GEMINI.md"
Safe-Copy-Item "C:\dev\apps\prompt-engineer\README.md" "$archiveRoot\prompt-engineer\README.md"
Safe-Copy-Item "C:\dev\apps\prompt-engineer\RELEASE_READY.md" "$archiveRoot\prompt-engineer\RELEASE_READY.md"

# 4. vibe-justice
Safe-Copy-Item "C:\dev\apps\vibe-justice\AI.md" "$archiveRoot\vibe-justice\AI.md"
Safe-Copy-Item "C:\dev\apps\vibe-justice\GEMINI.md" "$archiveRoot\vibe-justice\GEMINI.md"
Safe-Copy-Item "C:\dev\apps\vibe-justice\README.md" "$archiveRoot\vibe-justice\README.md"
Safe-Copy-Item "C:\dev\apps\vibe-justice\RELEASE_READY.md" "$archiveRoot\vibe-justice\RELEASE_READY.md"
Safe-Copy-Item "C:\dev\apps\vibe-justice\docs\tauri-signing-updater-decision.md" "$archiveRoot\vibe-justice\docs\tauri-signing-updater-decision.md"
Safe-Copy-Item "C:\dev\apps\vibe-justice\docs\archive" "$archiveRoot\vibe-justice\docs\archive"
Safe-Copy-Item "C:\dev\apps\vibe-justice\FEATURE_SPECS\DOCUMENT_ANALYSIS_2025.md" "$archiveRoot\vibe-justice\FEATURE_SPECS\DOCUMENT_ANALYSIS_2025.md"

# 5. symptom-tracker-api
Safe-Copy-Item "C:\dev\apps\symptom-tracker-api\AI.md" "$archiveRoot\symptom-tracker-api\AI.md"
Safe-Copy-Item "C:\dev\apps\symptom-tracker-api\GEMINI.md" "$archiveRoot\symptom-tracker-api\GEMINI.md"
Safe-Copy-Item "C:\dev\apps\symptom-tracker-api\README.md" "$archiveRoot\symptom-tracker-api\README.md"
Safe-Copy-Item "C:\dev\apps\symptom-tracker-api\RELEASE_READY.md" "$archiveRoot\symptom-tracker-api\RELEASE_READY.md"

# Make zip backups of target directories under C:\dev\_backups\
$backupDir = "C:\dev\_backups"
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$zipPath = "$backupDir\Backup_Obsolete_Apps_$timestamp.zip"
Compress-Archive -Path "C:\dev\apps\desktop-commander-v3", "C:\dev\apps\crypto-enhanced", "C:\dev\apps\prompt-engineer", "C:\dev\apps\vibe-justice", "C:\dev\apps\symptom-tracker-api" -DestinationPath $zipPath
Write-Output "Created backup at $zipPath"
