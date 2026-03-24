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

function Get-LatestInstallerPath {
    param([string]$SearchRoot = $PSScriptRoot)

    $searchPaths = @(
        (Join-Path $SearchRoot "installers"),
        (Join-Path $SearchRoot "src-tauri\target\release\bundle\msi"),
        (Join-Path $SearchRoot "src-tauri\target\release\bundle\nsis"),
        $SearchRoot
    )

    foreach ($path in $searchPaths) {
        if (-not (Test-Path $path)) {
            continue
        }

        $installer = Get-ChildItem -Path $path -File -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Extension -ieq ".msi" -or ($_.Extension -ieq ".exe" -and $_.Name -match "-setup$")
            } |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

        if ($installer) {
            return $installer.FullName
        }
    }

    return $null
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
        $InstallerPath = Get-LatestInstallerPath
        
        if (-not $InstallerPath) {
            throw "Installer not found. Please build the installer first or specify path with -InstallerPath"
        }

        Write-ColorOutput "  Found installer: $InstallerPath" "Gray"
    }

    if (Test-Path $InstallerPath -PathType Container) {
        $resolvedInstaller = Get-LatestInstallerPath -SearchRoot $InstallerPath
        if ($resolvedInstaller) {
            $InstallerPath = $resolvedInstaller
            Write-ColorOutput "  Found installer in directory: $InstallerPath" "Gray"
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

    $exePath = Get-ChildItem -Path $InstallPath -File -Filter "*.exe" -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch 'uninstall' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $exePath) {
        Write-ColorOutput "  ⚠️  Executable not found in: $InstallPath" "Yellow"
        Write-ColorOutput "  Auto-start not configured" "Yellow"
        return
    }

    # Call the auto-start setup script
    $setupScript = Join-Path $PSScriptRoot "setup-autostart.ps1"
    if (Test-Path $setupScript) {
        & $setupScript -Enable -ExecutablePath $exePath.FullName
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


