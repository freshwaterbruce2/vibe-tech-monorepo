# DC8980 Shipping App - Deployment Setup Script
# Prepares the project for app store deployment

param(
    [switch]$Android = $false,
    [switch]$iOS = $false,
    [switch]$All = $false,
    [switch]$Verify = $false
)

$ErrorActionPreference = "Stop"

if ($All) {
    $Android = $true
    $iOS = $true
}

Write-Host "=== DC8980 Shipping Deployment Setup ===" -ForegroundColor Green
Write-Host ""

# Navigate to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$prerequisites = @()

# Check Node.js
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $prerequisites += "Node.js and npm"
}

# Check Capacitor CLI
try {
    npx cap --version > $null
} catch {
    $prerequisites += "Capacitor CLI"
}

if ($Android) {
    # Check Java
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
        $prerequisites += "Java JDK 17+"
    }

    # Check Android SDK
    if (-not $env:ANDROID_HOME) {
        $prerequisites += "Android SDK (ANDROID_HOME not set)"
    }
}

if ($iOS) {
    # Check if on macOS
    if ($env:OS -eq "Windows_NT") {
        Write-Host "Warning: iOS builds require macOS and Xcode" -ForegroundColor Yellow
    } else {
        # Check Xcode
        if (-not (Get-Command xcodebuild -ErrorAction SilentlyContinue)) {
            $prerequisites += "Xcode and Xcode Command Line Tools"
        }
    }
}

if ($prerequisites.Count -gt 0) {
    Write-Host "Missing prerequisites:" -ForegroundColor Red
    $prerequisites | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "Please install missing prerequisites before continuing." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Prerequisites check passed" -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci --prefer-offline
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Run quality checks
Write-Host "Running quality checks..." -ForegroundColor Yellow

try {
    npm run lint
    npm run typecheck
    npm run test
    Write-Host "✓ Quality checks passed" -ForegroundColor Green
} catch {
    Write-Host "Error: Quality checks failed. Please fix issues before deployment." -ForegroundColor Red
    exit 1
}

# Build web assets
Write-Host "Building web assets..." -ForegroundColor Yellow
npm run build
Write-Host "✓ Web assets built" -ForegroundColor Green

# Android setup
if ($Android) {
    Write-Host "Setting up Android deployment..." -ForegroundColor Yellow

    # Add Android platform if not exists
    if (-not (Test-Path "android")) {
        npx cap add android
        Write-Host "✓ Android platform added" -ForegroundColor Green
    }

    # Sync Capacitor
    npx cap sync android
    Write-Host "✓ Android sync completed" -ForegroundColor Green

    # Check signing configuration
    $gradlePropsExample = "android\gradle.properties.example"
    $gradleProps = "android\gradle.properties"

    if (-not (Test-Path $gradleProps)) {
        Copy-Item $gradlePropsExample $gradleProps
        Write-Host "⚠ Created gradle.properties from example" -ForegroundColor Yellow
        Write-Host "  Please configure signing details in android\gradle.properties" -ForegroundColor Yellow
    }

    # Check if keystore exists
    if (-not (Test-Path "android\release-key.keystore")) {
        Write-Host "⚠ Release keystore not found" -ForegroundColor Yellow
        Write-Host "  Run .\android\generate-keystore.ps1 to create signing key" -ForegroundColor Yellow
    }

    Write-Host "✓ Android setup completed" -ForegroundColor Green
}

# iOS setup
if ($iOS) {
    Write-Host "Setting up iOS deployment..." -ForegroundColor Yellow

    # Add iOS platform if not exists
    if (-not (Test-Path "ios")) {
        if ($env:OS -eq "Windows_NT") {
            Write-Host "⚠ iOS platform setup requires macOS" -ForegroundColor Yellow
            Write-Host "  Transfer project to macOS and run: npx cap add ios" -ForegroundColor Yellow
        } else {
            npx cap add ios
            Write-Host "✓ iOS platform added" -ForegroundColor Green
        }
    }

    if (Test-Path "ios") {
        # Sync Capacitor
        npx cap sync ios
        Write-Host "✓ iOS sync completed" -ForegroundColor Green
    }

    if ($env:OS -ne "Windows_NT") {
        Write-Host "✓ iOS setup completed" -ForegroundColor Green
        Write-Host "  Next: Open Xcode with 'npx cap open ios'" -ForegroundColor Cyan
    }
}

# Verification mode
if ($Verify) {
    Write-Host "Running deployment verification..." -ForegroundColor Yellow

    $issues = @()

    # Check version consistency
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $capacitorConfig = Get-Content "capacitor.config.ts" -Raw

    Write-Host "App version: $($packageJson.version)" -ForegroundColor Cyan

    # Check Android versions
    if ($Android -and (Test-Path "android\app\build.gradle")) {
        $buildGradle = Get-Content "android\app\build.gradle" -Raw
        if ($buildGradle -match 'versionName "([^"]+)"') {
            $androidVersion = $matches[1]
            if ($androidVersion -ne $packageJson.version) {
                $issues += "Android versionName ($androidVersion) doesn't match package.json ($($packageJson.version))"
            }
        }
    }

    # Check required files
    $requiredFiles = @(
        "app-store-metadata\app-store-config.json",
        "app-store-metadata\google-play-store.json",
        "app-store-metadata\privacy-policy.md",
        "SECURITY.md",
        "DEPLOYMENT_GUIDE.md"
    )

    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $issues += "Missing required file: $file"
        }
    }

    # Check Android-specific files
    if ($Android) {
        $androidFiles = @(
            "android\app\src\main\res\xml\network_security_config.xml",
            "android\app\src\main\res\xml\backup_rules.xml",
            "android\app\src\main\res\xml\data_extraction_rules.xml",
            "android\app\proguard-rules.pro"
        )

        foreach ($file in $androidFiles) {
            if (-not (Test-Path $file)) {
                $issues += "Missing Android file: $file"
            }
        }
    }

    # Report verification results
    if ($issues.Count -eq 0) {
        Write-Host "✓ Deployment verification passed" -ForegroundColor Green
    } else {
        Write-Host "⚠ Deployment verification found issues:" -ForegroundColor Yellow
        $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
}

# Display next steps
Write-Host ""
Write-Host "=== Deployment Setup Complete ===" -ForegroundColor Green
Write-Host ""

if ($Android) {
    Write-Host "Android Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Configure signing in android\gradle.properties"
    Write-Host "2. Generate keystore: .\android\generate-keystore.ps1"
    Write-Host "3. Build release: .\scripts\build-android.ps1 -Bundle"
    Write-Host "4. Upload AAB to Google Play Console"
    Write-Host ""
}

if ($iOS) {
    Write-Host "iOS Next Steps:" -ForegroundColor Cyan
    if ($env:OS -eq "Windows_NT") {
        Write-Host "1. Transfer project to macOS"
        Write-Host "2. Run: npx cap add ios"
        Write-Host "3. Configure signing in Xcode"
    } else {
        Write-Host "1. Open Xcode: npx cap open ios"
        Write-Host "2. Configure signing and capabilities"
    }
    Write-Host "3. Archive and upload to App Store Connect"
    Write-Host ""
}

Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "- Full deployment guide: DEPLOYMENT_GUIDE.md"
Write-Host "- Security information: SECURITY.md"
Write-Host "- App store metadata: app-store-metadata/"
Write-Host ""

Write-Host "Support: support@vibetech.dev" -ForegroundColor Gray