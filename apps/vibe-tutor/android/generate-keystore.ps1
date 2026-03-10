# Generate Release Keystore for Vibe-Tutor
# Run this script ONCE to create the release signing keystore
# WARNING: Backup the generated keystore immediately!

param(
    [Parameter(Mandatory=$true)]
    [string]$StorePassword,

    [Parameter(Mandatory=$false)]
    [string]$KeyPassword = $StorePassword
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Vibe-Tutor Keystore Generator" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if keystore already exists
if (Test-Path "vibetutor-release.keystore") {
    Write-Host "ERROR: vibetutor-release.keystore already exists!" -ForegroundColor Red
    Write-Host "Delete it first if you want to generate a new one (NOT RECOMMENDED)" -ForegroundColor Red
    exit 1
}

# Resolve keytool path from PATH, JAVA_HOME, or Android Studio defaults
$keytoolPath = $null
$keytoolCommand = Get-Command keytool -ErrorAction SilentlyContinue
if ($keytoolCommand) {
    $keytoolPath = $keytoolCommand.Source
}

if (-not $keytoolPath -and $env:JAVA_HOME) {
    $candidate = Join-Path $env:JAVA_HOME "bin\\keytool.exe"
    if (Test-Path $candidate) {
        $keytoolPath = $candidate
    }
}

if (-not $keytoolPath) {
    $androidStudioCandidates = @(
        "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe",
        "C:\\Program Files\\Android\\Android Studio\\jre\\bin\\keytool.exe"
    )
    foreach ($candidate in $androidStudioCandidates) {
        if (Test-Path $candidate) {
            $keytoolPath = $candidate
            break
        }
    }
}

if (-not $keytoolPath) {
    Write-Host "ERROR: keytool not found. Install JDK or set JAVA_HOME." -ForegroundColor Red
    exit 1
}

Write-Host "Generating release keystore..." -ForegroundColor Yellow
Write-Host ""

# Generate keystore
& $keytoolPath -genkeypair -v -storetype PKCS12 `
    -keystore vibetutor-release.keystore `
    -alias vibetutor `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass "$StorePassword" `
    -keypass "$KeyPassword" `
    -dname "CN=VibeTech, OU=Development, O=VibeTech, L=Seattle, ST=WA, C=US"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: Keystore generated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Copy keystore.properties.template to keystore.properties" -ForegroundColor White
    Write-Host "2. Edit keystore.properties with your passwords" -ForegroundColor White
    Write-Host "3. Verify keystore.properties is in .gitignore" -ForegroundColor White
    Write-Host "4. BACKUP vibetutor-release.keystore to secure location" -ForegroundColor White
    Write-Host "5. Store passwords in password manager" -ForegroundColor White
    Write-Host ""
    Write-Host "CRITICAL: Losing this keystore means you cannot update the app!" -ForegroundColor Red
    Write-Host ""

    # Create keystore.properties automatically
    if (-not (Test-Path "keystore.properties")) {
        @"
storeFile=../vibetutor-release.keystore
storePassword=$StorePassword
keyAlias=vibetutor
keyPassword=$KeyPassword
"@ | Out-File -FilePath "keystore.properties" -Encoding UTF8

        Write-Host "Created keystore.properties automatically" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "ERROR: Keystore generation failed!" -ForegroundColor Red
    exit 1
}
