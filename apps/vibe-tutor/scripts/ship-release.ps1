# Vibe Tutor Android Release Playbook & Cloud Run Synchronization
# Portable execution from apps/vibe-tutor, V:\monorepo, or C:\projects in PowerShell 7+.
#
# Prereqs:
#   - Node 22.x, pnpm 10.x
#   - Android Studio + JDK + Android SDK
#   - JAVA_HOME and ANDROID_HOME configured, or default Android Studio paths exist
#   - This script performs a local Capacitor 8 + Gradle build (NOT EAS)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = (Resolve-Path "$scriptDir\..").Path
$repoRoot = (Resolve-Path "$appRoot\..\..").Path

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "📦 VIBE TUTOR RELEASE & CLOUD RUN SYNCHRONIZATION PIPELINE" -ForegroundColor Cyan
Write-Host "App Root: $appRoot" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# Stage 0 - BACKUP android directory (always first, per workspace rules)
# ---------------------------------------------------------------------------
$backupRoot = "$repoRoot\_backups"
if (-not (Test-Path $backupRoot)) {
    $backupRoot = "$appRoot\_backups"
    if (-not (Test-Path $backupRoot)) {
        New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    }
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$backupPath = "$backupRoot\vibe-tutor-android-$stamp.zip"

if (-not (Test-Path "$appRoot\android")) {
    throw "android directory not found at $appRoot\android"
}

Compress-Archive -Path "$appRoot\android" -DestinationPath $backupPath -Force
Write-Host "STAGE 0: BACKUP -> $backupPath" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 1 - Version & Cloud Run Allowlist Synchronization
# ---------------------------------------------------------------------------
Write-Host "STAGE 1: Synchronizing version codes and Cloud Run allowlist..." -ForegroundColor Yellow

$variablesFile = "$appRoot\android\variables.gradle"
$variablesContent = Get-Content $variablesFile -Raw
if ($variablesContent -match 'androidVersionCode\s*=\s*(\d+)') {
    $versionCode = [int]$matches[1]
} else {
    throw "Could not parse androidVersionCode from $variablesFile"
}

$packageJson = Get-Content "$appRoot\package.json" -Raw | ConvertFrom-Json
$versionName = $packageJson.version

Write-Host "Target Version: $versionName (versionCode: $versionCode)" -ForegroundColor Cyan

# Ensure render-backend/server.mjs includes this versionCode
$serverFile = "$appRoot\render-backend\server.mjs"
if (Test-Path $serverFile) {
    $serverContent = Get-Content $serverFile -Raw
    if ($serverContent -match '\[([0-9,\s]+)\]\.includes\(verdict\.versionCode\)') {
        $allowedRaw = $matches[1]
        $allowedCodes = $allowedRaw -split ',' | ForEach-Object { [int]$_.Trim() }
        if ($allowedCodes -notcontains $versionCode) {
            Write-Host "UPDATING: Adding versionCode $versionCode to render-backend/server.mjs allowlist..." -ForegroundColor Yellow
            $newAllowedList = ($allowedCodes + @($versionCode)) -join ', '
            $newServerContent = $serverContent -replace '\[([0-9,\s]+)\]\.includes\(verdict\.versionCode\)', "[$newAllowedList].includes(verdict.versionCode)"
            Set-Content -Path $serverFile -Value $newServerContent -Encoding utf8
            Write-Host "UPDATED: render-backend/server.mjs allowlist now [$newAllowedList]" -ForegroundColor Green
        } else {
            Write-Host "VERSION BINDING: versionCode $versionCode is verified in server.mjs allowlist [$allowedRaw]" -ForegroundColor Green
        }
    }
}

# ---------------------------------------------------------------------------
# Stage 2 - Typecheck, Quality Checks, and Web Build
# ---------------------------------------------------------------------------
Set-Location $appRoot

Write-Host "STAGE 2: Running typecheck and release validators..." -ForegroundColor Yellow
& pnpm run typecheck
if ($LASTEXITCODE -ne 0) {
    throw "typecheck failed with exit code $LASTEXITCODE"
}

& pnpm run test:backend
if ($LASTEXITCODE -ne 0) {
    throw "test:backend failed with exit code $LASTEXITCODE"
}

& pnpm run validate:release
if ($LASTEXITCODE -ne 0) {
    throw "validate:release failed with exit code $LASTEXITCODE"
}

Write-Host "STAGE 2: Building production web bundle..." -ForegroundColor Yellow
& pnpm run build
if ($LASTEXITCODE -ne 0) {
    throw "build failed with exit code $LASTEXITCODE"
}
Write-Host "BUILD: web bundle passed" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 3 - Sync Capacitor assets to the Android project
# ---------------------------------------------------------------------------
Write-Host "STAGE 3: Syncing web assets to native Android project..." -ForegroundColor Yellow
& pnpm exec cap sync android
if ($LASTEXITCODE -ne 0) {
    throw "cap sync android failed with exit code $LASTEXITCODE"
}
Write-Host "CAP SYNC: completed" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 4 - Build release Android App Bundle (AAB) with local Gradle
# ---------------------------------------------------------------------------
Write-Host "STAGE 4: Building signed release AAB via Gradle..." -ForegroundColor Yellow
& node scripts/run-gradle.cjs clean bundleRelease
if ($LASTEXITCODE -ne 0) {
    throw "Gradle bundleRelease failed with exit code $LASTEXITCODE"
}
Write-Host "GRADLE: bundleRelease completed successfully" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 5 - Verify the release AAB artifact
# ---------------------------------------------------------------------------
$aabPath = "$appRoot\android\app\build\outputs\bundle\release\app-release.aab"
if (-not (Test-Path $aabPath)) {
    throw "AAB not found at $aabPath"
}

$aab = Get-Item $aabPath
$sizeMB = [math]::Round($aab.Length / 1MB, 2)
$hash = (Get-FileHash -Algorithm SHA256 $aabPath).Hash.ToLower()

Write-Host "`n------------------------------------------------------------" -ForegroundColor Green
Write-Host "ARTIFACT VERIFIED: $($aab.FullName)" -ForegroundColor Green
Write-Host "SIZE: $sizeMB MB ($($aab.Length) bytes)" -ForegroundColor Cyan
Write-Host "SHA-256: $hash" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------`n" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 6 - Stage Cloud Run Deployment Payload
# ---------------------------------------------------------------------------
$stagedDir = "$appRoot\docs\release-readiness"
if (-not (Test-Path $stagedDir)) {
    New-Item -ItemType Directory -Path $stagedDir -Force | Out-Null
}

$stagedPayload = [ordered]@{
    version = $versionName
    versionCode = $versionCode
    aabFile = "app-release.aab"
    aabBytes = $aab.Length
    aabSha256 = $hash
    cloudRun = [ordered]@{
        service = "vibe-tutor-api"
        project = "vibe-tutor-501213"
        region = "us-east4"
        command = "gcloud run deploy vibe-tutor-api --source render-backend --project vibe-tutor-501213 --region us-east4"
    }
    checklist = [ordered]@{
        versionBinding = "PASS"
        backendAllowlist = "PASS"
        backendTests = "PASS"
        webBundle = "PASS"
        aabCompilation = "PASS"
        playConsoleUpload = "HELD (gate-play-console)"
    }
    stagedAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 5

$stagedFile = "$stagedDir\cloud-run-staged-$versionCode.json"
Set-Content -Path $stagedFile -Value $stagedPayload -Encoding utf8
Write-Host "CLOUD RUN STAGING: Staged deployment payload at $stagedFile" -ForegroundColor Green

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "✅ VIBE TUTOR RELEASE CANDIDATE & BACKEND IN LOCKSTEP" -ForegroundColor Green
Write-Host "Version: $versionName | versionCode: $versionCode" -ForegroundColor Green
Write-Host "AAB Artifact: $aabPath" -ForegroundColor Green
Write-Host "Awaiting user authorization before Google Play Console upload (`gate-play-console`)." -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Green
