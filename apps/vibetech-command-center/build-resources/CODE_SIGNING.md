# Code Signing for Vibe-Tech Command Center

## Overview

Code signing is required to avoid Windows SmartScreen warnings and to verify installer integrity. This document describes how to enable it in the electron-builder configuration.

## Certificate Types

1. **EV Code Signing Certificate** (Recommended)
   - Provides immediate reputation with Windows SmartScreen
   - Requires hardware token or HSM
   - Issued by trusted CAs (DigiCert, Sectigo, etc.)

2. **Standard Code Signing Certificate**
   - Builds reputation over time
   - Less expensive than EV
   - May still trigger SmartScreen until reputation is established

## Configuration

Add the following fields to the `"build"` section of `package.json`:

```json
{
  "build": {
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "build-resources/icon.ico",
      "artifactName": "${productName}-Setup-${version}.${ext}",
      "certificateFile": "build-resources/certificate.p12",
      "certificatePassword": "<password-or-env-var>"
    }
  }
}
```

### Using Environment Variables (Recommended)

Instead of committing secrets to `package.json`, use environment variables:

```json
{
  "build": {
    "win": {
      "certificateFile": "build-resources/certificate.p12",
      "certificatePassword": "<%= certificatePassword %>"
    }
  }
}
```

Or pass them at build time:

```powershell
$env:WIN_CSC_LINK="build-resources/certificate.p12"
$env:WIN_CSC_KEY_PASSWORD="your-password"
pnpm run package
```

When these environment variables are set, electron-builder will use them automatically and the `certificateFile` / `certificatePassword` fields in `package.json` can be omitted.

## Azure Key Vault (Cloud HSM)

If using Azure Key Vault for EV signing:

```powershell
$env:AZURE_TENANT_ID="..."
$env:AZURE_CLIENT_ID="..."
$env:AZURE_CLIENT_SECRET="..."
$env:AZURE_KEY_VAULT_NAME="..."
$env:AZURE_KEY_VAULT_CERTIFICATE_NAME="..."
pnpm run package
```

## Build Resources Directory

- Place the `.p12` certificate file in `apps/vibetech-command-center/build-resources/`
- Ensure `build-resources/` is listed in `.gitignore` so certificates are never committed

## Verification

After building the installer, verify the signature:

```powershell
signtool verify /pa "release/Vibe-Tech Command Center-Setup-0.1.0.exe"
```

Or check the digital signatures tab in the file properties dialog.
