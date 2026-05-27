# DC8980 Shipping App - Keystore Generation Script (PowerShell)
# Run this script to generate a release keystore for app signing

Write-Host "Generating release keystore for DC8980 Shipping App..." -ForegroundColor Green

# Check if keytool is available
$keytoolPath = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytoolPath) {
    Write-Host "Error: keytool not found. Please ensure Java JDK is installed and in PATH." -ForegroundColor Red
    exit 1
}

# Configuration
$KEYSTORE_NAME = "release-key.keystore"
$KEY_ALIAS = "dc8980-shipping"
$VALIDITY_YEARS = 25

Write-Host "This script will generate a keystore with the following settings:"
Write-Host "- Keystore file: $KEYSTORE_NAME"
Write-Host "- Key alias: $KEY_ALIAS"
Write-Host "- Validity: $VALIDITY_YEARS years"
Write-Host ""

# Prompt for keystore password
$STORE_PASSWORD = Read-Host "Enter keystore password" -AsSecureString
$STORE_PASSWORD_CONFIRM = Read-Host "Confirm keystore password" -AsSecureString

$storePassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($STORE_PASSWORD))
$storePassConfirmPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($STORE_PASSWORD_CONFIRM))

if ($storePassPlain -ne $storePassConfirmPlain) {
    Write-Host "Error: Passwords do not match!" -ForegroundColor Red
    exit 1
}

# Prompt for key password
$KEY_PASSWORD = Read-Host "Enter key password" -AsSecureString
$KEY_PASSWORD_CONFIRM = Read-Host "Confirm key password" -AsSecureString

$keyPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($KEY_PASSWORD))
$keyPassConfirmPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($KEY_PASSWORD_CONFIRM))

if ($keyPassPlain -ne $keyPassConfirmPlain) {
    Write-Host "Error: Key passwords do not match!" -ForegroundColor Red
    exit 1
}

# Organization information
Write-Host "Enter organization information:"
$CN = Read-Host "First and last name (CN)"
$OU = Read-Host "Organization unit (OU)"
$ORG = Read-Host "Organization (O)"
$CITY = Read-Host "City or locality (L)"
$STATE = Read-Host "State or province (ST)"
$COUNTRY = Read-Host "Country code (2 letters) (C)"

# Generate the keystore
Write-Host ""
Write-Host "Generating keystore..." -ForegroundColor Yellow

$dname = "CN=$CN, OU=$OU, O=$ORG, L=$CITY, ST=$STATE, C=$COUNTRY"
$validityDays = $VALIDITY_YEARS * 365

& keytool -genkeypair `
    -alias $KEY_ALIAS `
    -keyalg RSA `
    -keysize 2048 `
    -validity $validityDays `
    -keystore $KEYSTORE_NAME `
    -storepass $storePassPlain `
    -keypass $keyPassPlain `
    -dname $dname

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Keystore generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Copy gradle.properties.example to gradle.properties"
    Write-Host "2. Update gradle.properties with your keystore information:"
    Write-Host "   MYAPP_UPLOAD_STORE_FILE=$KEYSTORE_NAME"
    Write-Host "   MYAPP_UPLOAD_KEY_ALIAS=$KEY_ALIAS"
    Write-Host "   MYAPP_UPLOAD_STORE_PASSWORD=$storePassPlain"
    Write-Host "   MYAPP_UPLOAD_KEY_PASSWORD=$keyPassPlain"
    Write-Host ""
    Write-Host "3. Keep your keystore file and passwords secure!" -ForegroundColor Yellow
    Write-Host "4. Add gradle.properties to .gitignore to avoid committing secrets"
    Write-Host ""
    Write-Host "To build signed release:"
    Write-Host "   npm run android:bundle"
} else {
    Write-Host "Error: Failed to generate keystore!" -ForegroundColor Red
    exit 1
}