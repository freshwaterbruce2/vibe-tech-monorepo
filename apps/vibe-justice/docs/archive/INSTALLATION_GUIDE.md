# Vibe-Justice Installation Guide

**Version:** 1.0.0
**Date:** January 24, 2026
**Platform:** Windows 11 (x64)

---

## 📦 Available Installers

Two Windows installer formats are available:

### 1. MSI Installer (Recommended)
**File:** `Vibe-Justice_1.0.0_x64_en-US.msi`
**Size:** 62.5 MB
**Location:** `apps/vibe-justice/frontend/src-tauri/target/release/bundle/msi/`

**Advantages:**
- ✅ Corporate-friendly (supports Group Policy)
- ✅ Easy silent installation
- ✅ Automatic updates support
- ✅ Clean uninstallation

### 2. NSIS Installer
**File:** `Vibe-Justice_1.0.0_x64-setup.exe`
**Size:** 61.8 MB
**Location:** `apps/vibe-justice/frontend/src-tauri/target/release/bundle/nsis/`

**Advantages:**
- ✅ Traditional Windows installer
- ✅ Custom installation options
- ✅ Portable install option

---

## 🚀 Quick Install (Recommended)

### Step 1: Double-Click Installer

**MSI:**
```
C:\dev\apps\vibe-justice\frontend\src-tauri\target\release\bundle\msi\Vibe-Justice_1.0.0_x64_en-US.msi
```

**Or NSIS:**
```
C:\dev\apps\vibe-justice\frontend\src-tauri\target\release\bundle\nsis\Vibe-Justice_1.0.0_x64-setup.exe
```

### Step 2: Follow Installation Wizard

1. Click "Next" on welcome screen
2. Accept license agreement
3. Choose installation directory (default: `C:\Program Files\Vibe-Justice`)
4. Click "Install"
5. Click "Finish"

### Step 3: Launch Application

**Start Menu:** Search for "Vibe-Justice"
**Desktop:** Double-click Vibe-Justice icon (if created)

---

## ⚙️ Silent Installation (IT Deployment)

### MSI Silent Install

```powershell
# Install for all users
msiexec /i "Vibe-Justice_1.0.0_x64_en-US.msi" /quiet /qn

# Install with log file
msiexec /i "Vibe-Justice_1.0.0_x64_en-US.msi" /quiet /qn /l*v install.log

# Install to custom directory
msiexec /i "Vibe-Justice_1.0.0_x64_en-US.msi" /quiet INSTALLDIR="C:\VibeJustice"
```

### NSIS Silent Install

```powershell
# Silent install
.\Vibe-Justice_1.0.0_x64-setup.exe /S

# Silent install with custom directory
.\Vibe-Justice_1.0.0_x64-setup.exe /S /D=C:\VibeJustice
```

---

## 🔧 System Requirements

### Minimum Requirements
- **OS:** Windows 11 (build 22000 or higher)
- **RAM:** 4 GB
- **Disk Space:** 200 MB
- **Screen:** 1280x720 minimum

### Recommended Requirements
- **OS:** Windows 11 (latest updates)
- **RAM:** 8 GB
- **Disk Space:** 500 MB
- **Screen:** 1920x1080

### Dependencies (Included)
- ✅ Python backend (bundled as executable)
- ✅ FastAPI server (embedded)
- ✅ All AI models configured
- ✅ No separate installations needed

---

## 📋 What Gets Installed

### Application Files
```
C:\Program Files\Vibe-Justice\
├── Vibe-Justice.exe          # Main application
├── backend.exe                # FastAPI backend (sidecar)
├── resources\                 # App resources
│   ├── icons\
│   └── assets\
└── _up_\                      # Updater files
```

### User Data
```
C:\Users\<username>\AppData\Roaming\com.vibetech.vibe-justice\
├── config.json                # User settings
├── logs\                      # Application logs
└── cache\                     # Temporary cache
```

### Backend Data
The Python backend runs as a bundled sidecar process:
- Starts automatically when app launches
- Runs on `http://localhost:8000`
- Shuts down when app closes

---

## 🔐 First-Time Setup

### 1. OpenRouter API Key (Required)

The app requires an OpenRouter API key for AI analysis:

**Get API Key:**
1. Visit: https://openrouter.ai/
2. Sign up for free account
3. Navigate to "API Keys"
4. Create new key

**Configure in App:**
1. Launch Vibe-Justice
2. Go to Settings (gear icon)
3. Enter your OpenRouter API key
4. Click "Save"

### 2. Test the Installation

1. **Upload Test Document:**
   - Click "Upload Documents"
   - Select a PDF or DOCX file
   - Wait for processing

2. **Verify Analysis:**
   - Check violations are detected
   - Confirm dates are extracted
   - Ensure contradictions appear

3. **Check Backend:**
   - Open browser: http://localhost:8000/docs
   - Should see Swagger API documentation

---

## 🐛 Troubleshooting

### Issue: App Won't Start

**Solution 1 - Check Windows Version:**
```powershell
winver
# Must be Windows 11 (build 22000+)
```

**Solution 2 - Run as Administrator:**
- Right-click Vibe-Justice
- Select "Run as administrator"

**Solution 3 - Check Firewall:**
```powershell
# Allow app through firewall
New-NetFirewallRule -DisplayName "Vibe-Justice" -Direction Inbound -Program "C:\Program Files\Vibe-Justice\Vibe-Justice.exe" -Action Allow
```

### Issue: Backend Not Responding

**Check Backend Process:**
```powershell
Get-Process | Where-Object { $_.ProcessName -like "*backend*" }
```

**Restart Backend:**
1. Close Vibe-Justice completely
2. Wait 10 seconds
3. Relaunch application

### Issue: "API Key Invalid"

**Verify API Key:**
1. Check for typos in Settings
2. Verify key at https://openrouter.ai/keys
3. Ensure key has credits available

### Issue: Missing Dependencies

**Windows WebView2:**
Vibe-Justice requires Microsoft Edge WebView2. If missing:

```powershell
# Download and install WebView2 Runtime
winget install Microsoft.EdgeWebView2Runtime
```

---

## 🔄 Updating

### Automatic Updates
Vibe-Justice checks for updates on launch. When available:
1. Notification appears in app
2. Click "Update Now"
3. Download and install automatically
4. App restarts

### Manual Update
1. Download new installer
2. Run installer (keeps settings)
3. Choose "Upgrade" option
4. App data preserved

---

## 🗑️ Uninstalling

### Method 1: Windows Settings
1. Open **Settings** → **Apps** → **Installed apps**
2. Search for "Vibe-Justice"
3. Click **⋮** → **Uninstall**
4. Follow prompts

### Method 2: Control Panel
1. Open **Control Panel** → **Programs and Features**
2. Find "Vibe-Justice"
3. Click **Uninstall**

### Method 3: MSI Silent Uninstall
```powershell
msiexec /x "Vibe-Justice_1.0.0_x64_en-US.msi" /quiet
```

### Clean Uninstall (Remove All Data)

```powershell
# Remove application
msiexec /x "Vibe-Justice_1.0.0_x64_en-US.msi" /quiet

# Remove user data
Remove-Item -Path "$env:APPDATA\com.vibetech.vibe-justice" -Recurse -Force

# Remove cache
Remove-Item -Path "$env:LOCALAPPDATA\com.vibetech.vibe-justice" -Recurse -Force
```

---

## 📄 License

**Vibe-Justice Legal Assistant**
Copyright © 2026 VibeTech

All rights reserved. This software is provided for evaluation and internal use only.

---

## 🆘 Support

### Documentation
- **User Guide:** `docs/VIBE_JUSTICE_USER_GUIDE.md`
- **API Documentation:** http://localhost:8000/docs (when app running)
- **FAQ:** `docs/FAQ.md`

### Contact
- **Issues:** Report bugs via GitHub Issues (https://github.com/freshwaterbruce2/Monorepo/issues)
- **Email:** support@vibetech.com
- **Website:** https://vibetech.com/vibe-justice

---

## 📊 Installation Verification

After installation, verify everything works:

```powershell
# Check installation directory
Test-Path "C:\Program Files\Vibe-Justice\Vibe-Justice.exe"

# Check user data directory
Test-Path "$env:APPDATA\com.vibetech.vibe-justice"

# Launch application
Start-Process "C:\Program Files\Vibe-Justice\Vibe-Justice.exe"

# Wait 10 seconds for backend to start
Start-Sleep -Seconds 10

# Check backend health
Invoke-WebRequest -Uri "http://localhost:8000/api/document-analysis/health"
```

**Expected Output:**
```json
{
  "status": "healthy",
  "openrouter": "connected",
  "version": "1.0.0"
}
```

---

## 🎯 Next Steps

After installation:

1. ✅ **Configure API Key** - Add your OpenRouter API key in Settings
2. ✅ **Upload Test Document** - Try analyzing a sample PDF
3. ✅ **Review Tutorial** - Watch in-app tutorial video
4. ✅ **Explore Features** - Test violation detection, date extraction, contradictions
5. ✅ **Read User Guide** - Learn all features and shortcuts

---

**Installation Complete!** 🎉

You're ready to use Vibe-Justice to win unemployment appeals!

**Quick Start:** Upload a termination letter or Sedgwick denial PDF to see AI analysis in action.

---

_Last Updated:_ January 24, 2026
_Installer Version:_ 1.0.0
_Platform:_ Windows 11 x64
