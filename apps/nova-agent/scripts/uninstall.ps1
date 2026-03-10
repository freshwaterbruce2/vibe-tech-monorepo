# Nova Agent Uninstallation Script for Windows 11
# Handles clean removal of Nova Agent

param(
    [switch]$KeepDatabases,
    [switch]$KeepLogs,
    [switch]$Force,
    [switch]$Silent
)

$ErrorActionPreference = "Stop"
$InstallPath = "$env:LOCALAPPDATA\Programs\NOVA Agent"
$DatabasePath = "D:\databases"
$LogPath = "D:\logs\nova-agent"
$AppDataPath = "$env:APPDATA\NOVA Agent"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    if (-not $Silent) {
        Write-Host $Message -ForegroundColor $Color
    }
}

function Confirm-Uninstall {
    if ($Force -or $Silent) {
        return $true
    }
    
    Write-ColorOutput "`n⚠️  WARNING: This will remove NOVA Agent from your system" "Yellow"
    Write-ColorOutput "  Install Path: $InstallPath" "Gray"
    
    if (-not $KeepDatabases) {
        Write-ColorOutput "  Databases: WILL BE DELETED" "Red"
    }
    else {
        Write-ColorOutput "  Databases: Will be preserved" "Green"
    }
    
    if (-not $KeepLogs) {
        Write-ColorOutput "  Logs: WILL BE DELETED" "Red"
    }
    else {
        Write-ColorOutput "  Logs: Will be preserved" "Green"
    }
    
    $response = Read-Host "`nDo you want to continue? (yes/no)"
    return $response -eq "yes"
}

function Stop-NovaAgent {
    Write-ColorOutput "`n🛑 Stopping NOVA Agent..." "Yellow"
    
    # Stop PM2 process if running
    try {
        if (Get-Command pm2 -ErrorAction SilentlyContinue) {
            pm2 stop nova-agent 2>$null
            pm2 delete nova-agent 2>$null
            Write-ColorOutput "  ✓ PM2 process stopped" "Green"
        }
    }
    catch {
        Write-ColorOutput "  PM2 not running" "Gray"
    }
    
    # Stop any running NOVA Agent processes
    $processes = Get-Process -Name "NOVA Agent" -ErrorAction SilentlyContinue
    if ($processes) {
        foreach ($proc in $processes) {
            try {
                $proc.Kill()
                $proc.WaitForExit(5000)
                Write-ColorOutput "  ✓ Stopped process: $($proc.Id)" "Green"
            }
            catch {
                Write-ColorOutput "  ⚠️  Could not stop process: $($proc.Id)" "Yellow"
            }
        }
    }
    else {
        Write-ColorOutput "  No running processes found" "Gray"
    }
    
    Write-ColorOutput "✓ NOVA Agent stopped" "Green"
}

function Remove-AutoStart {
    Write-ColorOutput "`n🚫 Removing auto-start..." "Yellow"
    
    $setupScript = Join-Path $PSScriptRoot "setup-autostart.ps1"
    if (Test-Path $setupScript) {
        & $setupScript -Disable
    }
    else {
        # Manual removal
        $RegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
        $AppName = "NOVAAgent"
        
        try {
            $exists = Get-ItemProperty -Path $RegistryPath -Name $AppName -ErrorAction SilentlyContinue
            if ($exists) {
                Remove-ItemProperty -Path $RegistryPath -Name $AppName
                Write-ColorOutput "  ✓ Auto-start removed" "Green"
            }
            else {
                Write-ColorOutput "  Auto-start was not configured" "Gray"
            }
        }
        catch {
            Write-ColorOutput "  ⚠️  Could not remove auto-start: $_" "Yellow"
        }
    }
}

function Remove-Application {
    Write-ColorOutput "`n🗑️  Removing application files..." "Yellow"
    
    if (Test-Path $InstallPath) {
        try {
            Remove-Item -Path $InstallPath -Recurse -Force
            Write-ColorOutput "  ✓ Removed: $InstallPath" "Green"
        }
        catch {
            Write-ColorOutput "  ⚠️  Could not remove: $InstallPath" "Yellow"
            Write-ColorOutput "  Error: $_" "Red"
        }
    }
    else {
        Write-ColorOutput "  Install path not found" "Gray"
    }
    
    if (Test-Path $AppDataPath) {
        try {
            Remove-Item -Path $AppDataPath -Recurse -Force
            Write-ColorOutput "  ✓ Removed: $AppDataPath" "Green"
        }
        catch {
            Write-ColorOutput "  ⚠️  Could not remove: $AppDataPath" "Yellow"
        }
    }
}

function Remove-Databases {
    if ($KeepDatabases) {
        Write-ColorOutput "`n💾 Preserving databases..." "Yellow"
        Write-ColorOutput "  Location: $DatabasePath" "Gray"
        return
    }

    Write-ColorOutput "`n🗑️  Removing databases..." "Yellow"

    $databases = @(
        "$DatabasePath\nova_activity.db",
        "$DatabasePath\agent_learning.db",
        "$DatabasePath\agent_tasks.db"
    )

    foreach ($db in $databases) {
        if (Test-Path $db) {
            try {
                Remove-Item -Path $db -Force
                # Remove WAL and SHM files
                Remove-Item -Path "$db-wal" -Force -ErrorAction SilentlyContinue
                Remove-Item -Path "$db-shm" -Force -ErrorAction SilentlyContinue
                Write-ColorOutput "  ✓ Removed: $db" "Green"
            }
            catch {
                Write-ColorOutput "  ⚠️  Could not remove: $db" "Yellow"
            }
        }
    }
}

function Remove-Logs {
    if ($KeepLogs) {
        Write-ColorOutput "`n💾 Preserving logs..." "Yellow"
        Write-ColorOutput "  Location: $LogPath" "Gray"
        return
    }

    Write-ColorOutput "`n🗑️  Removing logs..." "Yellow"

    if (Test-Path $LogPath) {
        try {
            Remove-Item -Path $LogPath -Recurse -Force
            Write-ColorOutput "  ✓ Removed: $LogPath" "Green"
        }
        catch {
            Write-ColorOutput "  ⚠️  Could not remove: $LogPath" "Yellow"
        }
    }
    else {
        Write-ColorOutput "  Log path not found" "Gray"
    }
}

function Show-UninstallSummary {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Green"
    Write-ColorOutput "║     ✅ NOVA AGENT UNINSTALLED SUCCESSFULLY                 ║" "Green"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Green"

    if ($KeepDatabases) {
        Write-ColorOutput "💾 Your databases have been preserved at:" "Cyan"
        Write-ColorOutput "  $DatabasePath" "White"
    }

    if ($KeepLogs) {
        Write-ColorOutput "💾 Your logs have been preserved at:" "Cyan"
        Write-ColorOutput "  $LogPath" "White"
    }

    Write-ColorOutput "`nThank you for using NOVA Agent!" "Cyan"
}

# Main execution
Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║     NOVA AGENT UNINSTALLATION                             ║" "Cyan"
Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Cyan"

try {
    # Confirm uninstall
    if (-not (Confirm-Uninstall)) {
        Write-ColorOutput "`nUninstallation cancelled." "Yellow"
        exit 0
    }

    # Execute uninstallation steps
    Stop-NovaAgent
    Remove-AutoStart
    Remove-Application
    Remove-Databases
    Remove-Logs
    Show-UninstallSummary

    exit 0

}
catch {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Red"
    Write-ColorOutput "║     ❌ UNINSTALLATION FAILED                               ║" "Red"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Red"
    Write-ColorOutput "Error: $_" "Red"
    Write-ColorOutput "`nSome files may need to be removed manually." "Yellow"
    exit 1
}


