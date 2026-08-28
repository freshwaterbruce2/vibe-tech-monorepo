#!/bin/bash

# DC8980 Shipping App - Keystore Generation Script
# Run this script to generate a release keystore for app signing

echo "Generating release keystore for DC8980 Shipping App..."

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    echo "Error: keytool not found. Please ensure Java JDK is installed and in PATH."
    exit 1
fi

# Configuration
KEYSTORE_NAME="release-key.keystore"
KEY_ALIAS="dc8980-shipping"
VALIDITY_YEARS=25

echo "This script will generate a keystore with the following settings:"
echo "- Keystore file: $KEYSTORE_NAME"
echo "- Key alias: $KEY_ALIAS"
echo "- Validity: $VALIDITY_YEARS years"
echo ""

# Prompt for keystore password
read -s -p "Enter keystore password: " STORE_PASSWORD
echo ""
read -s -p "Confirm keystore password: " STORE_PASSWORD_CONFIRM
echo ""

if [ "$STORE_PASSWORD" != "$STORE_PASSWORD_CONFIRM" ]; then
    echo "Error: Passwords do not match!"
    exit 1
fi

# Prompt for key password
read -s -p "Enter key password: " KEY_PASSWORD
echo ""
read -s -p "Confirm key password: " KEY_PASSWORD_CONFIRM
echo ""

if [ "$KEY_PASSWORD" != "$KEY_PASSWORD_CONFIRM" ]; then
    echo "Error: Key passwords do not match!"
    exit 1
fi

# Organization information
echo "Enter organization information:"
read -p "First and last name (CN): " CN
read -p "Organization unit (OU): " OU
read -p "Organization (O): " ORG
read -p "City or locality (L): " CITY
read -p "State or province (ST): " STATE
read -p "Country code (2 letters) (C): " COUNTRY

# Generate the keystore
echo ""
echo "Generating keystore..."

keytool -genkeypair \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $(($VALIDITY_YEARS * 365)) \
    -keystore "$KEYSTORE_NAME" \
    -storepass "$STORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=$CN, OU=$OU, O=$ORG, L=$CITY, ST=$STATE, C=$COUNTRY"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Keystore generated successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Copy gradle.properties.example to gradle.properties"
    echo "2. Update gradle.properties with your keystore information:"
    echo "   MYAPP_UPLOAD_STORE_FILE=$KEYSTORE_NAME"
    echo "   MYAPP_UPLOAD_KEY_ALIAS=$KEY_ALIAS"
    echo "   MYAPP_UPLOAD_STORE_PASSWORD=$STORE_PASSWORD"
    echo "   MYAPP_UPLOAD_KEY_PASSWORD=$KEY_PASSWORD"
    echo ""
    echo "3. Keep your keystore file and passwords secure!"
    echo "4. Add gradle.properties to .gitignore to avoid committing secrets"
    echo ""
    echo "To build signed release:"
    echo "   npm run android:bundle"
else
    echo "Error: Failed to generate keystore!"
    exit 1
fi