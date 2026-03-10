# NOVA Agent - Quick Start: Windows 11 Packaging

> **TL;DR:** Build, install, and deploy NOVA Agent on Windows 11

---

## 🚀 Build Installers (5 minutes)

```powershell
cd C:\dev\apps\nova-agent
.\scripts\build-installer.ps1 -InstallerType both
```

**Output:** `.\installers\NOVA-Agent-Setup-<timestamp>.msi` and `.exe`

---

## 📦 Install NOVA Agent (2 minutes)

```powershell
.\scripts\install.ps1 -InstallerPath ".\installers\NOVA-Agent-Setup-<timestamp>.msi" -EnableAutoStart
```

**What it does:**

- Installs to `%LOCALAPPDATA%\Programs\NOVA Agent`
- Creates databases in `D:\databases\`
- Sets up auto-start on boot
- Creates Start Menu shortcut

---

## ⚙️ Configure API Keys (1 minute)

Edit: `%APPDATA%\NOVA Agent\.env`

```env
DEEPSEEK_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here
```

---

## 🎯 Launch NOVA Agent

- **Start Menu:** Search "NOVA Agent"
- **Auto-Start:** Enabled by default (starts on boot)
- **Manual:** Run from `%LOCALAPPDATA%\Programs\NOVA Agent\NOVA Agent.exe`

---

## 🔧 Manage Auto-Start

```powershell
# Check status
.\scripts\setup-autostart.ps1 -Status

# Enable
.\scripts\setup-autostart.ps1 -Enable

# Disable
.\scripts\setup-autostart.ps1 -Disable
```

---

## 🗑️ Uninstall

```powershell
# Keep databases and logs
.\scripts\uninstall.ps1 -KeepDatabases -KeepLogs

# Complete removal
.\scripts\uninstall.ps1 -Force
```

---

## 📊 Common Commands

| Task | Command |
|------|---------|
| Build MSI only | `.\scripts\build-installer.ps1 -InstallerType msi` |
| Build NSIS only | `.\scripts\build-installer.ps1 -InstallerType nsis` |
| Skip tests (faster) | `.\scripts\build-installer.ps1 -SkipTests` |
| Silent install | `.\scripts\install.ps1 -Silent -EnableAutoStart` |
| Custom install path | `.\scripts\install.ps1 -InstallPath "C:\MyApps\NOVA"` |

---

## 🧪 Quick Test

```powershell
# 1. Build
.\scripts\build-installer.ps1 -InstallerType both -SkipTests

# 2. Install
.\scripts\install.ps1 -InstallerPath ".\installers\NOVA-Agent-Setup-*.msi" -EnableAutoStart

# 3. Verify auto-start
.\scripts\setup-autostart.ps1 -Status

# 4. Reboot and check if NOVA Agent starts

# 5. Uninstall (keep data)
.\scripts\uninstall.ps1 -KeepDatabases -KeepLogs
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `scripts/build-installer.ps1` | Build MSI/NSIS installers |
| `scripts/install.ps1` | Install NOVA Agent |
| `scripts/uninstall.ps1` | Uninstall NOVA Agent |
| `scripts/setup-autostart.ps1` | Manage auto-start |
| `INSTALLATION.md` | Full installation guide |
| `WINDOWS_PACKAGING_GUIDE.md` | Developer packaging guide |

---

## 🆘 Troubleshooting

**Build fails:** Install WiX Toolset: `winget install WiXToolset.WiX`  
**Install fails:** Run PowerShell as Administrator  
**Auto-start not working:** Run `.\scripts\setup-autostart.ps1 -Enable`  
**App won't start:** Check `D:\logs\nova-agent\error.log`

---

## 📚 Full Documentation

- **Installation Guide:** `INSTALLATION.md`
- **Packaging Guide:** `WINDOWS_PACKAGING_GUIDE.md`
- **Completion Report:** `PACKAGING_COMPLETE.md`

---

**Last Updated:** 2026-01-13

