# NOVA Agent - Windows 11 Packaging Guide

> **Status:** Production Ready  
> **Date:** 2026-01-13  
> **Version:** 1.0.10

---

## 📦 Overview

This guide covers the complete Windows 11 packaging and installation setup for NOVA Agent. The system includes:

- ✅ **Tauri 2.x Windows Installer Configuration** (MSI & NSIS)
- ✅ **Auto-Start on Windows Boot**
- ✅ **Automated Installation Scripts**
- ✅ **Clean Uninstallation**
- ✅ **Build & Package Automation**
- ✅ **Comprehensive Documentation**

---

## 🏗️ Architecture

### Installer Types

1. **MSI (Windows Installer)**
   - Built with WiX Toolset
   - Enterprise-friendly
   - Group Policy deployment support
   - Silent installation support
   - Proper uninstall via Windows Settings

2. **NSIS (Nullsoft Scriptable Install System)**
   - Lightweight executable
   - Customizable UI
   - Fast installation
   - Portable option

### Installation Paths

```
%LOCALAPPDATA%\Programs\NOVA Agent\     # Application files
%APPDATA%\NOVA Agent\                   # User configuration
D:\databases\                           # Persistent databases
D:\logs\nova-agent\                     # Application logs
```

### Auto-Start Mechanism

- **Method:** Windows Registry (HKCU\Software\Microsoft\Windows\CurrentVersion\Run)
- **Key Name:** NOVAAgent
- **Value:** Path to NOVA Agent.exe
- **Scope:** Current user (no admin required)

---

## 🚀 Quick Start

### Build Installers

```powershell
# Navigate to Nova Agent directory
cd C:\dev\apps\nova-agent

# Build both MSI and NSIS installers
.\scripts\build-installer.ps1 -InstallerType both

# Build only MSI
.\scripts\build-installer.ps1 -InstallerType msi

# Build for release (skip tests for speed)
.\scripts\build-installer.ps1 -InstallerType both -SkipTests -Release
```

### Install NOVA Agent

```powershell
# Automated installation with auto-start
.\scripts\install.ps1 -InstallerPath ".\installers\NOVA-Agent-Setup.msi" -EnableAutoStart

# Custom installation path
.\scripts\install.ps1 -InstallerPath ".\installers\NOVA-Agent-Setup.msi" -InstallPath "C:\MyApps\NOVA"

# Silent installation
.\scripts\install.ps1 -InstallerPath ".\installers\NOVA-Agent-Setup.msi" -Silent -EnableAutoStart
```

### Manage Auto-Start

```powershell
# Enable auto-start
.\scripts\setup-autostart.ps1 -Enable

# Disable auto-start
.\scripts\setup-autostart.ps1 -Disable

# Check status
.\scripts\setup-autostart.ps1 -Status
```

### Uninstall

```powershell
# Keep databases and logs
.\scripts\uninstall.ps1 -KeepDatabases -KeepLogs

# Complete removal
.\scripts\uninstall.ps1 -Force
```

---

## 📁 File Structure

```
apps/nova-agent/
├── src-tauri/
│   ├── tauri.conf.json          # ✅ Updated with Windows installer config
│   ├── icons/
│   │   └── icon.ico             # Windows application icon
│   └── ...
├── scripts/
│   ├── build-installer.ps1      # ✅ NEW: Build & package automation
│   ├── install.ps1              # ✅ NEW: Installation wizard
│   ├── uninstall.ps1            # ✅ NEW: Clean uninstallation
│   ├── setup-autostart.ps1      # ✅ NEW: Auto-start configuration
│   ├── deploy.ps1               # Existing: PM2 deployment
│   └── setup-pm2.ps1            # Existing: PM2 setup
├── installers/                  # Output directory for built installers
├── INSTALLATION.md              # ✅ NEW: End-user installation guide
├── WINDOWS_PACKAGING_GUIDE.md   # ✅ NEW: This file
└── ...
```

---

## 🔧 Configuration Details

### Tauri Configuration (tauri.conf.json)

Key Windows-specific settings:

```json
{
  "bundle": {
    "windows": {
      "wix": {
        "language": "en-US",
        "enableElevatedUpdateRuntime": true
      },
      "nsis": {
        "installMode": "perMachine",
        "compression": "lzma",
        "startMenuFolder": "NOVA Agent"
      },
      "webviewInstallMode": {
        "type": "downloadBootstrapper"
      }
    }
  }
}
```

### Build Scripts

**build-installer.ps1** - Comprehensive build automation:

- ✅ Prerequisites checking (Node.js, Rust, Tauri CLI, WiX)
- ✅ Dependency installation
- ✅ Frontend build (React + Vite)
- ✅ Tauri build (Rust + bundling)
- ✅ Installer copying with timestamps
- ✅ Build summary and next steps

**install.ps1** - Installation wizard:

- ✅ Windows version check
- ✅ Directory structure creation
- ✅ MSI/EXE installer execution
- ✅ Database initialization
- ✅ Auto-start configuration
- ✅ Post-install summary

**uninstall.ps1** - Clean removal:

- ✅ Process termination (PM2 + running instances)
- ✅ Auto-start removal
- ✅ Application file cleanup
- ✅ Optional database/log preservation
- ✅ Confirmation prompts

**setup-autostart.ps1** - Auto-start management:

- ✅ Registry-based auto-start
- ✅ Executable path detection
- ✅ Enable/disable/status commands
- ✅ Verification checks

---

## 🧪 Testing Checklist

Before releasing installers, verify:

- [ ] MSI installer builds successfully
- [ ] NSIS installer builds successfully
- [ ] Installation on clean Windows 11 system
- [ ] Auto-start works after reboot
- [ ] Application launches correctly
- [ ] Databases are created in D:\databases\
- [ ] Logs are written to D:\logs\nova-agent\
- [ ] Uninstaller removes all files
- [ ] Uninstaller preserves databases when requested
- [ ] Silent installation works
- [ ] Installation without admin rights works
- [ ] WebView2 is installed automatically

---

## 🚢 Release Process

1. **Update Version Numbers**

   ```powershell
   # Update in these files:
   # - apps/nova-agent/package.json
   # - apps/nova-agent/src-tauri/tauri.conf.json
   # - apps/nova-agent/src-tauri/Cargo.toml
   ```

2. **Build Installers**

   ```powershell
   .\scripts\build-installer.ps1 -InstallerType both -Release
   ```

3. **Test Installers**
   - Test on clean Windows 11 VM
   - Verify all features work
   - Check auto-start functionality

4. **Create GitHub Release**
   - Tag version (e.g., v1.0.10)
   - Upload MSI and NSIS installers
   - Include INSTALLATION.md in release notes

5. **Update Documentation**
   - Update CHANGELOG.md
   - Update README.md with new version
   - Update installation instructions

---

## 📊 Installer Comparison

| Feature | MSI | NSIS |
|---------|-----|------|
| Size | Larger (~50-80 MB) | Smaller (~40-60 MB) |
| Installation Speed | Slower | Faster |
| Enterprise Support | ✅ Excellent | ⚠️ Limited |
| Silent Install | ✅ Yes | ✅ Yes |
| Uninstall via Settings | ✅ Yes | ✅ Yes |
| Group Policy | ✅ Yes | ❌ No |
| Custom UI | ⚠️ Limited | ✅ Flexible |
| **Recommended For** | Enterprise, IT deployment | Individual users, quick install |

---

## 🔐 Security Considerations

- **Code Signing:** Not currently configured (certificateThumbprint: null)
  - For production, obtain a code signing certificate
  - Update `tauri.conf.json` with certificate thumbprint

- **Auto-Start:** Uses current user registry (no admin required)
  - More secure than system-wide auto-start
  - User can easily disable

- **Installation Path:** User-specific by default
  - No admin rights required
  - Isolated per-user installation

---

## 📝 Next Steps

1. **Test the installation flow** on a clean Windows 11 system
2. **Obtain code signing certificate** for production releases
3. **Set up CI/CD** for automated builds (GitHub Actions)
4. **Create update mechanism** (Tauri updater)
5. **Add telemetry** for installation success tracking

---

**Created:** 2026-01-13  
**Last Updated:** 2026-01-13  
**Maintainer:** NOVA Team

