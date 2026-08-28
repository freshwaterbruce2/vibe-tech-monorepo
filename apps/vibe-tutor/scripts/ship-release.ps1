# Vibe Tutor Android Release Playbook
# Run from V:\monorepo in PowerShell 7+.
#
# Prereqs:
#   - Node 22.x, pnpm 10.x
#   - Android Studio + JDK + Android SDK
#   - JAVA_HOME and ANDROID_HOME configured, or default Android Studio paths exist
#   - This script performs a local Capacitor 8 + Gradle build (NOT EAS)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Stage 0 - BACKUP android directory (always first, per workspace rules)
# ---------------------------------------------------------------------------
$backupRoot = 'V:\monorepo\_backups'
if (-not (Test-Path $backupRoot)) {
    New-Item -ItemType Directory -Path $backupRoot | Out-Null
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupPath = "$backupRoot\vibe-tutor-android-$stamp.zip"

Set-Location V:\monorepo\apps\vibe-tutor
if (-not (Test-Path .\android)) {
    throw "android directory not found at V:\monorepo\apps\vibe-tutor\android"
}

Compress-Archive -Path .\android -DestinationPath $backupPath -Force
Write-Host "BACKUP: $backupPath" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 1 - Validate workspace path policy
# ---------------------------------------------------------------------------
Set-Location V:\monorepo
pnpm run paths:check
if ($LASTEXITCODE -ne 0) {
    throw "paths:check failed with exit code $LASTEXITCODE"
}
Write-Host "PATHS: workspace path policy passed" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 2 - Type check and build the Vibe Tutor web bundle
# ---------------------------------------------------------------------------
pnpm --filter vibe-tutor typecheck
if ($LASTEXITCODE -ne 0) {
    throw "vibe-tutor typecheck failed with exit code $LASTEXITCODE"
}
Write-Host "TYPECHECK: passed" -ForegroundColor Green

pnpm --filter vibe-tutor build
if ($LASTEXITCODE -ne 0) {
    throw "vibe-tutor build failed with exit code $LASTEXITCODE"
}
Write-Host "BUILD: passed" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 3 - Sync Capacitor assets to the Android project
# ---------------------------------------------------------------------------
Set-Location V:\monorepo\apps\vibe-tutor
pnpm exec cap sync android
if ($LASTEXITCODE -ne 0) {
    throw "cap sync android failed with exit code $LASTEXITCODE"
}
Write-Host "CAP SYNC: completed" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 4 - Build the release Android App Bundle (AAB) with local Gradle
# ---------------------------------------------------------------------------
# run-gradle.cjs wraps android\gradlew.bat, sets default JAVA_HOME / ANDROID_HOME
# on Windows, and forwards the requested tasks.
node scripts/run-gradle.cjs clean bundleRelease
if ($LASTEXITCODE -ne 0) {
    throw "Gradle bundleRelease failed with exit code $LASTEXITCODE"
}
Write-Host "GRADLE: bundleRelease completed" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 5 - Verify the release AAB artifact
# ---------------------------------------------------------------------------
$aabPath = 'V:\monorepo\apps\vibe-tutor\android\app\build\outputs\bundle\release\app-release.aab'
if (-not (Test-Path $aabPath)) {
    throw "AAB not found at $aabPath"
}

$aab = Get-Item $aabPath
$sizeMB = [math]::Round($aab.Length / 1MB, 2)
Write-Host "AAB: $($aab.FullName)" -ForegroundColor Cyan
Write-Host "SIZE: $sizeMB MB" -ForegroundColor Cyan
Write-Host "SUCCESS: Vibe Tutor Android release AAB is ready." -ForegroundColor Green
