# NOVA Mobile v1.0.0 Ship Playbook
# Run from C:\dev in PowerShell 7+. Copy-paste in stages; each stage is idempotent.
# Mirrors the release checklist in RELEASE_NOTES_v1.0.0.md.
#
# Prereqs:
#   - Node 22.x, pnpm 10.x
#   - eas-cli installed globally:  pnpm add -g eas-cli
#   - You are logged into EAS:     pnpm exec eas whoami
#   - gh CLI authenticated:        gh auth status
#   - For Android smoke test: a connected device OR running emulator

$ErrorActionPreference = 'Stop'
Set-Location C:\dev\apps\nova-mobile-app

# ---------------------------------------------------------------------------
# Stage 0 - BACKUP (always first, per .claude rules)
# ---------------------------------------------------------------------------
if (-not (Test-Path .\_backups)) { New-Item -ItemType Directory -Path .\_backups | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
Compress-Archive `
    -Path .\src,.\App.tsx,.\index.ts,.\package.json,.\app.json,.\eas.json,.\tsconfig.json,.\babel.config.js,.\metro.config.js,.\README.md,.\CLAUDE.md,.\STATUS.md,.\TESTING.md,.\SHIP_READY_REPORT.md,.\RELEASE_NOTES_v1.0.0.md,.\POST-MORTEM-console-patch.md,.\scripts,.\.env.example `
    -DestinationPath ".\_backups\Backup_$stamp.zip"
Write-Host "BACKUP: _backups\Backup_$stamp.zip" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 1 - Install deps (nova-mobile-app only)
# ---------------------------------------------------------------------------
Set-Location C:\dev
pnpm install --filter nova-mobile-app --frozen-lockfile=false

# ---------------------------------------------------------------------------
# Stage 2 - Quality pass (fail-fast before cloud build)
# ---------------------------------------------------------------------------
pnpm --filter nova-mobile-app run typecheck
pnpm --filter nova-mobile-app run lint
pnpm --filter nova-mobile-app run test

# ---------------------------------------------------------------------------
# Stage 3 - Verify env template exists and prod config is valid
# ---------------------------------------------------------------------------
Set-Location C:\dev\apps\nova-mobile-app
if (-not (Test-Path .\.env.example)) {
    throw ".env.example is missing — refusing to ship without the template"
}
# Confirm the config file still throws on missing token in prod builds.
$configGuard = Select-String -Path .\src\config.ts -Pattern 'EXPO_PUBLIC_BRIDGE_TOKEN is required in production builds' -Quiet
if (-not $configGuard) {
    throw "src/config.ts is missing the production token guard — refusing to ship"
}

# ---------------------------------------------------------------------------
# Stage 4 - EAS login check (fail here if CLI or auth is missing)
# ---------------------------------------------------------------------------
pnpm exec eas whoami

# ---------------------------------------------------------------------------
# Stage 5 - Build preview APK (internal distribution, sideload-friendly)
# ---------------------------------------------------------------------------
# Produces an installable APK on EAS Cloud. Output URL is printed at the end.
# --non-interactive + --json makes it easy to capture the artifact URL.
if (-not (Test-Path .\_builds)) { New-Item -ItemType Directory -Path .\_builds | Out-Null }

$previewJson = pnpm exec eas build `
    --platform android `
    --profile preview `
    --non-interactive `
    --json `
    --wait
$preview = $previewJson | ConvertFrom-Json
$previewUrl = $preview[0].artifacts.buildUrl
Write-Host "Preview APK URL: $previewUrl" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# Stage 6 - Download preview APK locally and hash it
# ---------------------------------------------------------------------------
$apkPath = ".\_builds\nova-mobile-v1.0.0.apk"
Invoke-WebRequest -Uri $previewUrl -OutFile $apkPath
$apkInfo = Get-Item $apkPath
Write-Host "APK:  $($apkInfo.FullName)  $([math]::Round($apkInfo.Length/1MB,1)) MB" -ForegroundColor Cyan

Get-FileHash $apkPath -Algorithm SHA256 |
    Format-Table -AutoSize |
    Out-File .\_builds\SHA256SUMS.txt
Get-Content .\_builds\SHA256SUMS.txt

# ---------------------------------------------------------------------------
# Stage 7 - Smoke-test the APK on a connected device
# ---------------------------------------------------------------------------
# Manual-ish step. If adb is on PATH and a device is connected, this installs
# and launches. Otherwise install the APK by hand from _builds\.
if (Get-Command adb -ErrorAction SilentlyContinue) {
    $devices = adb devices
    if ($devices -match "device$") {
        adb install -r $apkPath
        adb shell monkey -p com.nova.assistant -c android.intent.category.LAUNCHER 1
        Write-Host "Launched com.nova.assistant on connected device. Verify: cold launch reaches AuthScreen, connection dot goes green after desktop + adb:reverse." -ForegroundColor Yellow
    } else {
        Write-Host "No Android device connected — sideload $apkPath manually for smoke test." -ForegroundColor Yellow
    }
} else {
    Write-Host "adb not on PATH — install Platform-Tools or sideload $apkPath manually for smoke test." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# Stage 8 - Build production AAB (Play Store internal track)
# ---------------------------------------------------------------------------
# eas.json > production profile: buildType=app-bundle, autoIncrement=true.
# The AAB stays on EAS; we do not download it — Play Console pulls from EAS.
pnpm exec eas build `
    --platform android `
    --profile production `
    --non-interactive `
    --wait

# ---------------------------------------------------------------------------
# Stage 9 - Submit to Play internal track (draft release)
# ---------------------------------------------------------------------------
# Requires: secrets\play-store-service-account.json at the path configured in
# eas.json. Create it in Google Cloud Console and grant Play Console access.
pnpm exec eas submit `
    --platform android `
    --profile production `
    --non-interactive `
    --latest

# ---------------------------------------------------------------------------
# Stage 10 - Cut the GitHub release
# ---------------------------------------------------------------------------
# Requires: gh CLI authenticated against github.com/freshwaterbruce2/Monorepo.
# Tag convention: nova-mobile-app-v1.0.0
Set-Location C:\dev
$tag = "nova-mobile-app-v1.0.0"
git tag -a $tag -m "NOVA Mobile v1.0.0"
git push origin $tag

gh release create $tag `
    --title "NOVA Mobile v1.0.0" `
    --notes-file apps/nova-mobile-app/RELEASE_NOTES_v1.0.0.md `
    "C:\dev\apps\nova-mobile-app\_builds\nova-mobile-v1.0.0.apk" `
    "C:\dev\apps\nova-mobile-app\_builds\SHA256SUMS.txt"

Write-Host "Release $tag published." -ForegroundColor Green
