# Code Signing Guide for Vibe Code Studio

## Windows Code Signing Configuration (December 2025)

This guide explains how to set up code signing for production releases of Vibe Code Studio.

## Why Code Signing is Important

1. **Trust**: Windows SmartScreen won't block the installer
2. **Security**: Users know the app hasn't been tampered with
3. **Professional**: Shows your app is from a verified publisher
4. **Updates**: Required for auto-updater to work smoothly

## Certificate Options

### Option 1: EV Code Signing Certificate (Recommended)

**Cost**: $300-600/year
**Benefits**:

- Immediate SmartScreen reputation
- No warnings for users
- Best for commercial distribution

**Providers**:

- DigiCert ($499/year)
- Sectigo ($289/year)
- GlobalSign ($589/year)

### Option 2: Standard Code Signing Certificate

**Cost**: $100-300/year
**Benefits**:

- Removes "Unknown Publisher" warning
- Builds reputation over time
- Good for smaller distributions

**Providers**:

- Sectigo OV ($179/year)
- Certum ($110/year)
- SSL.com ($199/year)

### Option 3: Self-Signed Certificate (Development Only)

**Cost**: Free
**Use Case**: Internal testing only

## Setting Up Code Signing

### Step 1: Purchase Certificate

1. Choose a certificate provider
2. Complete validation process (1-3 business days)
3. Download certificate (.pfx or .p12 file)

### Step 2: Install Certificate

```powershell
# Install certificate to Windows Certificate Store
certutil -f -p YOUR_PASSWORD -importpfx "path\to\certificate.pfx"
```

### Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Windows Code Signing
CSC_LINK=path/to/certificate.pfx
CSC_KEY_PASSWORD=your_certificate_password

# Or use Windows Certificate Store
WIN_CSC_LINK=certificate_thumbprint
WIN_CSC_KEY_PASSWORD=certificate_password
```

### Step 4: Configure electron-builder

The configuration is already set up in `electron-builder.yml`. When you build with a certificate present, it will automatically sign.

### Step 5: Sign During Build

```bash
# Build and sign
pnpm run build:win

# Or with explicit signing
pnpm run electron:build:win
```

## Verification

### Check if Binary is Signed

```powershell
# Check signature
signtool verify /pa /v "dist-electron\Vibe Code Studio Setup 1.0.0.exe"

# View certificate details
certutil -dump "dist-electron\Vibe Code Studio Setup 1.0.0.exe"
```

### Manual Signing (if needed)

```powershell
# Sign executable manually
signtool sign /tr http://timestamp.sectigo.com /td sha256 /fd sha256 /a "Vibe Code Studio.exe"

# Sign installer
signtool sign /tr http://timestamp.sectigo.com /td sha256 /fd sha256 /a "Vibe Code Studio Setup 1.0.0.exe"
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Build and Sign
  env:
    CSC_LINK: ${{ secrets.WINDOWS_CERTIFICATE }}
    CSC_KEY_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
  run: |
    pnpm run build:win
```

### Azure DevOps

```yaml
- task: DownloadSecureFile@1
  name: signingCert
  inputs:
    secureFile: 'certificate.pfx'

- script: |
    set CSC_LINK=$(signingCert.secureFilePath)
    set CSC_KEY_PASSWORD=$(CERT_PASSWORD)
    pnpm run build:win
```

## Troubleshooting

### Issue: "Publisher Unknown" Warning

**Solution**: Certificate not properly installed or not trusted. Ensure you're using a certificate from a trusted CA.

### Issue: SmartScreen Still Shows Warning

**Solution**: For new certificates, build reputation by:

1. Having users mark as safe
2. Submitting to Microsoft for analysis
3. Using EV certificate for immediate trust

### Issue: Timestamp Server Errors

**Solution**: Use alternative timestamp servers:

- <http://timestamp.sectigo.com>
- <http://timestamp.digicert.com>
- <http://timestamp.globalsign.com/scripts/timstamp.dll>

### Issue: Certificate Not Found

**Solution**: Ensure environment variables are set correctly and certificate file exists.

## Security Best Practices

1. **Never commit certificates to git**
   - Add `*.pfx`, `*.p12` to `.gitignore`
   - Use environment variables or CI secrets

2. **Use strong passwords**
   - Minimum 16 characters
   - Store in secure password manager

3. **Timestamp all signatures**
   - Ensures signature remains valid after certificate expires
   - Always use `/tr` flag with timestamp server

4. **Regular certificate renewal**
   - Set calendar reminders 30 days before expiry
   - Keep backup of old certificates

5. **Secure storage**
   - Store certificates in encrypted drives
   - Use hardware tokens for EV certificates

## Cost-Benefit Analysis

### For Commercial Distribution

**Recommended**: EV Certificate ($500/year)

- ROI: Immediate trust = higher conversion rates
- No support costs from SmartScreen issues
- Professional appearance

### For Open Source/Personal Projects

**Recommended**: Standard OV Certificate ($200/year)

- Removes basic warnings
- Builds reputation over time
- Reasonable cost for hobby projects

### For Internal/Testing Only

**Recommended**: Self-signed certificate (Free)

- Fine for development
- Use with test signing mode
- Not for distribution

## Annual Checklist

- [ ] Renew certificate 30 days before expiry
- [ ] Update certificate in CI/CD secrets
- [ ] Test signing process with new certificate
- [ ] Update timestamp server URLs if needed
- [ ] Verify auto-updater still works
- [ ] Document any process changes

## Resources

- [Electron Code Signing Guide](https://www.electron.build/code-signing)
- [Microsoft SmartScreen](https://docs.microsoft.com/en-us/windows/security/threat-protection/microsoft-defender-smartscreen/)
- [SignTool Documentation](https://docs.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- [Timestamp Servers List](https://gist.github.com/Manouchehri/fd754e402d98430243455713efada710)
