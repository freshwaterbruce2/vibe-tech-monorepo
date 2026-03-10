# Nova Agent Installation Script for Windows 11
# Handles installation, configuration, and auto-start setup

param(
    [string]$InstallPath = "$env:LOCALAPPDATA\Programs\NOVA Agent",
    [string]$InstallerPath = "",
    [switch]$EnableAutoStart,
    [switch]$SkipDatabaseSetup,
    [switch]$Silent
)

$ErrorActionPreference = "Stop"
$DatabasePath = "D:\databases"
$LogPath = "D:\logs\nova-agent"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    if (-not $Silent) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Initialize-Directories {
    Write-ColorOutput "`n📁 Creating directory structure..." "Yellow"
    
    $directories = @(
        $InstallPath,
        $DatabasePath,
        $LogPath,
        "$env:APPDATA\NOVA Agent"
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-ColorOutput "  Created: $dir" "Gray"
        }
        else {
            Write-ColorOutput "  Exists: $dir" "Gray"
        }
    }
    
    Write-ColorOutput "✓ Directories ready" "Green"
}

function Install-NovaAgent {
    Write-ColorOutput "`n📦 Installing NOVA Agent..." "Yellow"
    
    # Find installer if not specified
    if (-not $InstallerPath) {
        $possiblePaths = @(
            ".\src-tauri\target\release\bundle\msi\NOVA Agent_1.0.10_x64_en-US.msi",
            ".\src-tauri\target\release\bundle\nsis\NOVA Agent_1.0.10_x64-setup.exe",
            ".\NOVA Agent.msi",
            ".\NOVA Agent.exe"
        )
        
        foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
                $InstallerPath = $path
                Write-ColorOutput "  Found installer: $InstallerPath" "Gray"
                break
            }
        }
        
        if (-not $InstallerPath) {
            throw "Installer not found. Please build the installer first or specify path with -InstallerPath"
        }
    }
    
    if (-not (Test-Path $InstallerPath)) {
        throw "Installer not found at: $InstallerPath"
    }
    
    # Run installer
    $extension = [System.IO.Path]::GetExtension($InstallerPath)
    
    if ($extension -eq ".msi") {
        Write-ColorOutput "  Running MSI installer..." "Gray"
        $arguments = @(
            "/i"
            "`"$InstallerPath`""
            "/qn"  # Quiet mode, no UI
            "INSTALLDIR=`"$InstallPath`""
        )
        if (-not $Silent) {
            $arguments[2] = "/qb"  # Basic UI
        }
        Start-Process "msiexec.exe" -ArgumentList $arguments -Wait -NoNewWindow
    }
    elseif ($extension -eq ".exe") {
        Write-ColorOutput "  Running EXE installer..." "Gray"
        $arguments = "/S"  # Silent install for NSIS
        if (-not $Silent) {
            $arguments = ""
        }
        Start-Process $InstallerPath -ArgumentList $arguments -Wait
    }
    else {
        throw "Unsupported installer format: $extension"
    }
    
    Write-ColorOutput "✓ Installation complete" "Green"
}

function Initialize-Databases {
    if ($SkipDatabaseSetup) {
        Write-ColorOutput "`n⏭️  Skipping database setup" "Yellow"
        return
    }
    
    Write-ColorOutput "`n🗄️  Initializing databases..." "Yellow"
    
    $databases = @(
        "$DatabasePath\nova_activity.db",
        "$DatabasePath\agent_learning.db",
        "$DatabasePath\agent_tasks.db"
    )
    
    foreach ($db in $databases) {
        if (-not (Test-Path $db)) {
            # Create empty database file
            New-Item -ItemType File -Path $db -Force | Out-Null
            Write-ColorOutput "  Created: $db" "Gray"
        }
        else {
            Write-ColorOutput "  Exists: $db" "Gray"
        }
    }
    
    Write-ColorOutput "✓ Databases initialized" "Green"
}

function Set-AutoStart {
    if (-not $EnableAutoStart) {
        Write-ColorOutput "`n⏭️  Skipping auto-start configuration (use -EnableAutoStart to enable)" "Yellow"
        return
    }

    Write-ColorOutput "`n🚀 Configuring auto-start..." "Yellow"

    $exePath = "$InstallPath\NOVA Agent.exe"
    if (-not (Test-Path $exePath)) {
        Write-ColorOutput "  ⚠️  Executable not found at: $exePath" "Yellow"
        Write-ColorOutput "  Auto-start not configured" "Yellow"
        return
    }

    # Call the auto-start setup script
    $setupScript = Join-Path $PSScriptRoot "setup-autostart.ps1"
    if (Test-Path $setupScript) {
        & $setupScript -Enable -ExecutablePath $exePath
    }
    else {
        Write-ColorOutput "  ⚠️  Auto-start script not found" "Yellow"
    }
}

function Show-PostInstallInfo {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Green"
    Write-ColorOutput "║     ✅ NOVA AGENT INSTALLATION COMPLETE!                   ║" "Green"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Green"

    Write-ColorOutput "📊 Installation Summary:" "Cyan"
    Write-ColorOutput "  Install Path: $InstallPath" "White"
    Write-ColorOutput "  Database Path: $DatabasePath" "White"
    Write-ColorOutput "  Log Path: $LogPath" "White"

    if ($EnableAutoStart) {
        Write-ColorOutput "`n🚀 Auto-start: ENABLED" "Green"
        Write-ColorOutput "  NOVA Agent will start automatically on boot" "Gray"
    }
    else {
        Write-ColorOutput "`n○ Auto-start: DISABLED" "Yellow"
        Write-ColorOutput "  Run with -EnableAutoStart to enable" "Gray"
    }

    Write-ColorOutput "`n📝 Next Steps:" "Cyan"
    Write-ColorOutput "  1. Configure API keys in: $env:APPDATA\NOVA Agent\.env" "White"
    Write-ColorOutput "  2. Launch NOVA Agent from Start Menu" "White"
    Write-ColorOutput "  3. Complete initial setup wizard" "White"

    Write-ColorOutput "`n📚 Documentation:" "Cyan"
    Write-ColorOutput "  Installation Guide: $InstallPath\INSTALLATION.md" "White"
    Write-ColorOutput "  User Guide: $InstallPath\README.md" "White"
}

# Main execution
Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║     NOVA AGENT INSTALLATION WIZARD                        ║" "Cyan"
Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Cyan"

try {
    # Check Windows version
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -lt 10) {
        throw "Windows 10 or later is required. Current version: $osVersion"
    }
    Write-ColorOutput "✓ Windows version: $osVersion" "Green"

    # Check if running as administrator (recommended but not required)
    if (Test-Administrator) {
        Write-ColorOutput "✓ Running as Administrator" "Green"
    }
    else {
        Write-ColorOutput "⚠️  Not running as Administrator (some features may be limited)" "Yellow"
    }

    # Execute installation steps
    Initialize-Directories
    Install-NovaAgent
    Initialize-Databases
    Set-AutoStart
    Show-PostInstallInfo

    exit 0

}
catch {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Red"
    Write-ColorOutput "║     ❌ INSTALLATION FAILED                                 ║" "Red"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Red"
    Write-ColorOutput "Error: $_" "Red"
    Write-ColorOutput "`nFor help, visit: https://github.com/nova-agent/docs" "Yellow"
    exit 1
}


