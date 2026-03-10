param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("build-web", "build-android", "cleanup-logs", "test-integration", "update-ip")]
    $Action
)

$ErrorActionPreference = "Stop"

switch ($Action) {
    "build-web" {
        Write-Host "Building Web Application..." -ForegroundColor Cyan
        npm run build
    }
    "build-android" {
        Write-Host "Building Android Application..." -ForegroundColor Cyan
        if (!(Test-Path "android")) {
            Write-Error "Android folder not found. Ensure Capacitor is initialized."
        }
        npx cap sync android
        Set-Location android
        ./gradlew assembleDebug
        Set-Location ..
        Write-Host "Android build complete. APK located in android/app/build/outputs/apk/debug/" -ForegroundColor Green
    }
    "cleanup-logs" {
        Write-Host "Cleaning up root logs..." -ForegroundColor Cyan
        if (!(Test-Path "docs/history")) { New-Item -ItemType Directory -Path "docs/history" }
        Get-ChildItem -Path "." -Filter "*.md" | Where-Object { 
            $_.Name -match '\d{4}-\d{2}-\d{2}|FIX|BUG|SUMMARY|COMPLETE|LOG|NOTES|GUIDE|REPORT|CHECKLIST|READY' -and 
            $_.Name -ne "README.md" -and 
            $_.Name -ne "CLAUDE.md" 
        } | Move-Item -Destination "docs/history" -Force
        Write-Host "Logs moved to docs/history" -ForegroundColor Green
    }
    "test-integration" {
        Write-Host "Running Integration Tests..." -ForegroundColor Cyan
        if (Test-Path "test-integration.ts") {
            npx tsx test-integration.ts
        } else {
            Write-Error "test-integration.ts not found."
        }
    }
    "update-ip" {
        Write-Host "Updating Mobile API IP..." -ForegroundColor Cyan
        & "$PSScriptRoot\update-mobile-ip.ps1"
    }
}
