# NOVA Agent - Windows 11 Installation Guide

> **Version:** 1.0.10  
> **Platform:** Windows 11 (Windows 10 compatible)  
> **Architecture:** x64

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Installation](#quick-installation)
3. [Manual Installation](#manual-installation)
4. [Configuration](#configuration)
5. [Auto-Start Setup](#auto-start-setup)
6. [Uninstallation](#uninstallation)
7. [Troubleshooting](#troubleshooting)

---

## 🖥️ System Requirements

### Minimum Requirements

- **OS:** Windows 10 (Build 1809+) or Windows 11
- **RAM:** 4 GB
- **Storage:** 500 MB free space (plus space for databases)
- **Display:** 1280x720 or higher
- **Internet:** Required for AI features

### Recommended Requirements

- **OS:** Windows 11 (latest version)
- **RAM:** 8 GB or more
- **Storage:** 2 GB free space on D:\ drive for databases
- **Display:** 1920x1080 or higher
- **Internet:** Broadband connection

### Prerequisites

- **WebView2 Runtime** (automatically installed by installer)
- **Visual C++ Redistributable** (usually pre-installed on Windows 11)

---

## ⚡ Quick Installation

### Option 1: Using the Installation Script (Recommended)

1. **Download the installer** (MSI or EXE) from the releases page

2. **Run the installation script:**

   ```powershell
   .\scripts\install.ps1 -InstallerPath ".\NOVA-Agent-Setup.msi" -EnableAutoStart
   ```

3. **Configure API keys** (see [Configuration](#configuration))

4. **Launch NOVA Agent** from the Start Menu

### Option 2: Direct Installation

1. **Double-click the installer** (MSI or EXE)

2. **Follow the installation wizard:**
   - Accept the license agreement
   - Choose installation location (default: `%LOCALAPPDATA%\Programs\NOVA Agent`)
   - Select "Create desktop shortcut" (optional)
   - Click "Install"

3. **Complete setup** after installation

---

## 🔧 Manual Installation

### Step 1: Build the Installer

If you're building from source:

```powershell
# Navigate to the project directory
cd C:\dev\apps\nova-agent

# Run the build script
.\scripts\build-installer.ps1 -InstallerType both

# Installers will be created in .\installers\
```

### Step 2: Install

```powershell
# Run the installation script
.\scripts\install.ps1 -InstallerPath ".\installers\NOVA-Agent-Setup-<timestamp>.msi" -EnableAutoStart
```

### Step 3: Verify Installation

```powershell
# Check if NOVA Agent is installed
Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | 
    Where-Object { $_.DisplayName -like "*NOVA Agent*" }
```

---

## ⚙️ Configuration

### API Keys Setup

NOVA Agent requires API keys for AI functionality. Configure them in:

**Location:** `%APPDATA%\NOVA Agent\.env`

**Required Keys:**

```env
# DeepSeek (Primary AI)
DEEPSEEK_API_KEY=your_deepseek_key_here

# Groq (Fallback AI)
GROQ_API_KEY=your_groq_key_here

# HuggingFace (Backup AI)
HUGGINGFACE_API_KEY=your_huggingface_key_here
```

### Database Paths

NOVA Agent uses the following database locations:

- **Activity Database:** `D:\databases\nova_activity.db`
- **Learning Database:** `D:\databases\agent_learning.db`
- **Tasks Database:** `D:\databases\agent_tasks.db`

> **Note:** The D:\ drive is used for optimal performance. If you don't have a D:\ drive, you can modify the paths in the configuration.

---

## 🚀 Auto-Start Setup

### Enable Auto-Start

To make NOVA Agent start automatically on Windows boot:

```powershell
.\scripts\setup-autostart.ps1 -Enable
```

### Disable Auto-Start

```powershell
.\scripts\setup-autostart.ps1 -Disable
```

### Check Auto-Start Status

```powershell
.\scripts\setup-autostart.ps1 -Status
```

---

## 🗑️ Uninstallation

### Option 1: Using the Uninstall Script (Recommended)

```powershell
# Uninstall but keep databases and logs
.\scripts\uninstall.ps1 -KeepDatabases -KeepLogs

# Complete uninstall (removes everything)
.\scripts\uninstall.ps1 -Force

# Silent uninstall
.\scripts\uninstall.ps1 -Silent -Force
```

### Option 2: Windows Settings

1. Open **Settings** → **Apps** → **Installed apps**
2. Search for **NOVA Agent**
3. Click the three dots → **Uninstall**

---

## 🔍 Troubleshooting

### Installation Issues

**Problem:** "WebView2 not found"

- **Solution:** The installer should automatically download WebView2. If it fails, manually download from: <https://developer.microsoft.com/microsoft-edge/webview2/>

**Problem:** "Access denied" during installation

- **Solution:** Run PowerShell as Administrator

**Problem:** "WiX Toolset not found" (when building)

- **Solution:** Install WiX Toolset: `winget install WiXToolset.WiX`

### Runtime Issues

**Problem:** NOVA Agent won't start

- **Solution:** Check logs at `D:\logs\nova-agent\error.log`
- Verify API keys are configured correctly
- Ensure databases directory exists: `D:\databases\`

**Problem:** Auto-start not working

- **Solution:** Run `.\scripts\setup-autostart.ps1 -Status` to check configuration
- Re-enable with `.\scripts\setup-autostart.ps1 -Enable`

**Problem:** High memory usage

- **Solution:** NOVA Agent is configured to restart if memory exceeds 1GB
- Check PM2 logs: `pm2 logs nova-agent`

### Getting Help

- **Documentation:** Check the `README.md` and `PROJECT_GUIDE.md`
- **Logs:** `D:\logs\nova-agent\`
- **GitHub Issues:** Report bugs and request features

---

## 📚 Additional Resources

- **User Guide:** `README.md`
- **Developer Guide:** `PROJECT_GUIDE.md`
- **PM2 Deployment:** `PM2_DEPLOYMENT_READY.md`
- **Rust Setup:** `RUST_SETUP.md`

---

**Last Updated:** 2026-01-13  
**Version:** 1.0.10

