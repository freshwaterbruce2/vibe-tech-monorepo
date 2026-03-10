# DC8980 Shipping App - iOS Build Script
# This script builds the iOS app for App Store submission

param(
    [switch]$Clean = $false,
    [switch]$Archive = $true,
    [switch]$Export = $false,
    [string]$BuildType = "release",
    [string]$ExportMethod = "app-store"
)

$ErrorActionPreference = "Stop"

Write-Host "=== DC8980 Shipping iOS Build Script ===" -ForegroundColor Green
Write-Host "Build Type: $BuildType" -ForegroundColor Cyan
Write-Host "Archive: $Archive, Export: $Export" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check if running on macOS (for Xcode)
if ($env:OS -eq "Windows_NT") {
    Write-Host "Warning: iOS builds require macOS and Xcode. This script can prepare the project only." -ForegroundColor Yellow
    $isMacOS = $false
} else {
    $isMacOS = $true

    # Check if Xcode is available
    if (-not (Get-Command xcodebuild -ErrorAction SilentlyContinue)) {
        Write-Host "Error: xcodebuild not found. Please install Xcode." -ForegroundColor Red
        exit 1
    }
}

# Check if Node.js is available
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm not found. Please install Node.js." -ForegroundColor Red
    exit 1
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

    # Clean iOS builds
    if (Test-Path "ios/App/build") {
        Remove-Item -Recurse -Force "ios/App/build"
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

# Step 4: Check if iOS platform exists
if (-not (Test-Path "ios")) {
    Write-Host "iOS platform not found. Adding iOS platform..." -ForegroundColor Yellow
    npx cap add ios
}

# Step 5: Sync with Capacitor
Write-Host "Syncing with Capacitor..." -ForegroundColor Yellow

try {
    npx cap sync ios
    Write-Host "✓ Capacitor sync completed" -ForegroundColor Green
} catch {
    Write-Host "Error: Capacitor sync failed." -ForegroundColor Red
    exit 1
}

# Step 6: Update iOS project settings
Write-Host "Updating iOS project settings..." -ForegroundColor Yellow

$iosProjectPath = "ios/App/App.xcodeproj/project.pbxproj"
if (Test-Path $iosProjectPath) {
    Write-Host "✓ iOS project found" -ForegroundColor Green

    # Create iOS configuration info
    $infoPlistPath = "ios/App/App/Info.plist"
    if (Test-Path $infoPlistPath) {
        Write-Host "✓ Info.plist found - update manually if needed" -ForegroundColor Green
    }
} else {
    Write-Host "Warning: iOS project not properly configured" -ForegroundColor Yellow
}

if (-not $isMacOS) {
    Write-Host ""
    Write-Host "=== Project Prepared for iOS Build ===" -ForegroundColor Green
    Write-Host "To complete the iOS build on macOS:" -ForegroundColor Cyan
    Write-Host "1. Transfer the project to a Mac with Xcode installed"
    Write-Host "2. Open the project: npx cap open ios"
    Write-Host "3. Configure signing & capabilities in Xcode"
    Write-Host "4. Archive the project: Product > Archive"
    Write-Host "5. Export for App Store distribution"
    Write-Host ""
    return
}

# The following steps require macOS and Xcode

# Step 7: Build and Archive (macOS only)
if ($Archive) {
    Write-Host "Building and archiving iOS app..." -ForegroundColor Yellow

    Set-Location "ios/App"

    try {
        $scheme = "App"
        $workspace = "App.xcworkspace"
        $archivePath = "build/App.xcarchive"

        # Clean build folder
        xcodebuild clean -workspace $workspace -scheme $scheme

        # Build and archive
        if ($BuildType -eq "release") {
            xcodebuild archive `
                -workspace $workspace `
                -scheme $scheme `
                -configuration Release `
                -archivePath $archivePath `
                -allowProvisioningUpdates

            if ($?) {
                Write-Host "✓ iOS archive created successfully" -ForegroundColor Green

                # Export IPA if requested
                if ($Export) {
                    Write-Host "Exporting IPA..." -ForegroundColor Yellow

                    # Create export options plist
                    $exportOptionsPlist = @"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>$ExportMethod</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
"@

                    $exportOptionsPath = "build/ExportOptions.plist"
                    $exportOptionsPlist | Out-File -FilePath $exportOptionsPath -Encoding UTF8

                    $exportPath = "build/export"

                    xcodebuild -exportArchive `
                        -archivePath $archivePath `
                        -exportPath $exportPath `
                        -exportOptionsPlist $exportOptionsPath

                    if ($?) {
                        $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
                        $outputDir = "../../build-output"
                        if (-not (Test-Path $outputDir)) {
                            New-Item -ItemType Directory $outputDir
                        }

                        $ipaFile = Get-ChildItem "$exportPath/*.ipa" | Select-Object -First 1
                        if ($ipaFile) {
                            $outputFile = "$outputDir/DC8980-Shipping-$timestamp.ipa"
                            Copy-Item $ipaFile.FullName $outputFile

                            Write-Host "✓ iOS IPA exported successfully: $outputFile" -ForegroundColor Green

                            # Show IPA info
                            $ipaSize = (Get-Item $outputFile).Length / 1MB
                            Write-Host "IPA size: $([math]::Round($ipaSize, 2)) MB" -ForegroundColor Cyan
                        }
                    }
                }
            } else {
                Write-Host "Error: iOS archive failed." -ForegroundColor Red
                Set-Location $projectRoot
                exit 1
            }
        } else {
            # Debug build
            xcodebuild build `
                -workspace $workspace `
                -scheme $scheme `
                -configuration Debug `
                -allowProvisioningUpdates

            Write-Host "✓ Debug iOS build completed" -ForegroundColor Green
        }

    } catch {
        Write-Host "Error: iOS build failed." -ForegroundColor Red
        Set-Location $projectRoot
        exit 1
    }

    Set-Location $projectRoot
}

Write-Host ""
Write-Host "=== iOS Build Complete ===" -ForegroundColor Green
Write-Host "Next steps for App Store submission:" -ForegroundColor Cyan
Write-Host "1. Test the archived app on physical iOS devices"
Write-Host "2. Upload to App Store Connect using Xcode or Transporter"
Write-Host "3. Fill in app store listing information"
Write-Host "4. Set up app privacy information"
Write-Host "5. Submit for review"
Write-Host ""