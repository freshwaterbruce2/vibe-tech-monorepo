# DC8980 Shipping App - Android Build Script
# This script builds the Android app for Play Store submission

param(
    [switch]$Clean = $false,
    [switch]$Bundle = $true,
    [switch]$APK = $false,
    [switch]$Upload = $false,
    [string]$BuildType = "release"
)

$ErrorActionPreference = "Stop"

Write-Host "=== DC8980 Shipping Android Build Script ===" -ForegroundColor Green
Write-Host "Build Type: $BuildType" -ForegroundColor Cyan
Write-Host "Bundle: $Bundle, APK: $APK, Upload: $Upload" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check if Node.js is available
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm not found. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Check if Capacitor CLI is available
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npx not found. Please install Node.js." -ForegroundColor Red
    exit 1
}

# Check if Android SDK is available
$androidHome = $env:ANDROID_HOME
if (-not $androidHome -or -not (Test-Path $androidHome)) {
    Write-Host "Warning: ANDROID_HOME not set or invalid. Android builds may fail." -ForegroundColor Yellow
}

# Navigate to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

Write-Host "✓ Prerequisites checked" -ForegroundColor Green

# Step 1: Clean previous builds if requested
if ($Clean) {
    Write-Host "Cleaning previous builds..." -ForegroundColor Yellow

    # Clean web build
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }

    # Clean Android builds
    if (Test-Path "android\app\build") {
        Remove-Item -Recurse -Force "android\app\build"
    }

    Write-Host "✓ Previous builds cleaned" -ForegroundColor Green
}

# Step 2: Run quality checks
Write-Host "Running quality checks..." -ForegroundColor Yellow

try {
    # Install dependencies
    npm ci --prefer-offline

    # Run linting
    npm run lint

    # Run type checking
    npm run typecheck

    # Run tests
    npm run test

    Write-Host "✓ Quality checks passed" -ForegroundColor Green
} catch {
    Write-Host "Error: Quality checks failed. Please fix issues before building." -ForegroundColor Red
    exit 1
}

# Step 3: Build web assets
Write-Host "Building web assets..." -ForegroundColor Yellow

try {
    npm run build
    Write-Host "✓ Web assets built successfully" -ForegroundColor Green
} catch {
    Write-Host "Error: Web build failed." -ForegroundColor Red
    exit 1
}

# Step 4: Sync with Capacitor
Write-Host "Syncing with Capacitor..." -ForegroundColor Yellow

try {
    npx cap sync android
    Write-Host "✓ Capacitor sync completed" -ForegroundColor Green
} catch {
    Write-Host "Error: Capacitor sync failed." -ForegroundColor Red
    exit 1
}

# Step 5: Check signing configuration
Write-Host "Checking signing configuration..." -ForegroundColor Yellow

$gradleProperties = "android\gradle.properties"
if (-not (Test-Path $gradleProperties)) {
    Write-Host "Warning: gradle.properties not found. Creating from example..." -ForegroundColor Yellow
    Copy-Item "android\gradle.properties.example" $gradleProperties
    Write-Host "Please configure signing details in $gradleProperties before building release." -ForegroundColor Yellow
}

# Step 6: Build Android app
Write-Host "Building Android app..." -ForegroundColor Yellow

Set-Location "android"

try {
    if ($Bundle) {
        Write-Host "Building Android App Bundle (.aab)..." -ForegroundColor Cyan

        if ($BuildType -eq "release") {
            .\gradlew bundleRelease --stacktrace

            $bundlePath = "app\build\outputs\bundle\release\app-release.aab"
            if (Test-Path $bundlePath) {
                $outputDir = "..\build-output"
                if (-not (Test-Path $outputDir)) {
                    New-Item -ItemType Directory $outputDir
                }

                $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
                $outputFile = "$outputDir\DC8980-Shipping-$timestamp.aab"
                Copy-Item $bundlePath $outputFile

                Write-Host "✓ Android App Bundle built successfully: $outputFile" -ForegroundColor Green

                # Show bundle info
                $bundleSize = (Get-Item $outputFile).Length / 1MB
                Write-Host "Bundle size: $([math]::Round($bundleSize, 2)) MB" -ForegroundColor Cyan
            }
        } else {
            .\gradlew bundleDebug --stacktrace
            Write-Host "✓ Debug bundle built successfully" -ForegroundColor Green
        }
    }

    if ($APK) {
        Write-Host "Building Android APK..." -ForegroundColor Cyan

        if ($BuildType -eq "release") {
            .\gradlew assembleRelease --stacktrace

            $apkPath = "app\build\outputs\apk\release\app-release.apk"
            if (Test-Path $apkPath) {
                $outputDir = "..\build-output"
                if (-not (Test-Path $outputDir)) {
                    New-Item -ItemType Directory $outputDir
                }

                $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
                $outputFile = "$outputDir\DC8980-Shipping-$timestamp.apk"
                Copy-Item $apkPath $outputFile

                Write-Host "✓ Android APK built successfully: $outputFile" -ForegroundColor Green

                # Show APK info
                $apkSize = (Get-Item $outputFile).Length / 1MB
                Write-Host "APK size: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
            }
        } else {
            .\gradlew assembleDebug --stacktrace
            Write-Host "✓ Debug APK built successfully" -ForegroundColor Green
        }
    }

} catch {
    Write-Host "Error: Android build failed." -ForegroundColor Red
    Set-Location $projectRoot
    exit 1
}

# Step 7: Upload to Play Console (if requested)
if ($Upload -and $Bundle -and $BuildType -eq "release") {
    Write-Host "Uploading to Play Console..." -ForegroundColor Yellow

    # This would require additional setup with Play Console API
    Write-Host "Note: Automatic upload requires Play Console API setup." -ForegroundColor Yellow
    Write-Host "Please upload the .aab file manually to Play Console." -ForegroundColor Yellow
}

Set-Location $projectRoot

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Green
Write-Host "Next steps for Play Store submission:" -ForegroundColor Cyan
Write-Host "1. Test the built app thoroughly on physical devices"
Write-Host "2. Upload the .aab file to Google Play Console"
Write-Host "3. Fill in store listing information"
Write-Host "4. Set up app signing by Google Play"
Write-Host "5. Submit for review"
Write-Host ""