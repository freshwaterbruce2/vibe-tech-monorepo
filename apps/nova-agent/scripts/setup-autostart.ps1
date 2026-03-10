# Nova Agent Auto-Start Configuration Script
# Configures Nova Agent to start automatically on Windows boot

param(
    [switch]$Enable,
    [switch]$Disable,
    [switch]$Status,
    [string]$ExecutablePath = ""
)

$ErrorActionPreference = "Stop"
$RegistryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$AppName = "NOVAAgent"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Get-AutoStartStatus {
    try {
        $value = Get-ItemProperty -Path $RegistryPath -Name $AppName -ErrorAction SilentlyContinue
        if ($value) {
            Write-ColorOutput "✓ Auto-start is ENABLED" "Green"
            Write-ColorOutput "  Path: $($value.$AppName)" "Gray"
            return $true
        } else {
            Write-ColorOutput "○ Auto-start is DISABLED" "Yellow"
            return $false
        }
    } catch {
        Write-ColorOutput "○ Auto-start is DISABLED" "Yellow"
        return $false
    }
}

function Enable-AutoStart {
    param([string]$ExePath)
    
    Write-ColorOutput "`n🚀 Enabling Auto-Start..." "Cyan"
    
    # Validate executable path
    if (-not $ExePath) {
        # Try to find the executable in common locations
        $possiblePaths = @(
            "$env:LOCALAPPDATA\Programs\NOVA Agent\NOVA Agent.exe",
            "$env:ProgramFiles\NOVA Agent\NOVA Agent.exe",
            "${env:ProgramFiles(x86)}\NOVA Agent\NOVA Agent.exe",
            "D:\deployments\nova-agent\NOVA Agent.exe"
        )
        
        foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
                $ExePath = $path
                Write-ColorOutput "  Found executable: $ExePath" "Gray"
                break
            }
        }
        
        if (-not $ExePath) {
            throw "Could not find NOVA Agent executable. Please specify path with -ExecutablePath parameter."
        }
    }
    
    if (-not (Test-Path $ExePath)) {
        throw "Executable not found at: $ExePath"
    }
    
    # Add to registry
    try {
        Set-ItemProperty -Path $RegistryPath -Name $AppName -Value "`"$ExePath`"" -Type String
        Write-ColorOutput "✓ Auto-start enabled successfully!" "Green"
        Write-ColorOutput "  NOVA Agent will start automatically on next boot" "Gray"
        
        # Verify
        $verify = Get-ItemProperty -Path $RegistryPath -Name $AppName -ErrorAction SilentlyContinue
        if ($verify) {
            Write-ColorOutput "✓ Registry entry verified" "Green"
        }
    } catch {
        throw "Failed to set registry entry: $_"
    }
}

function Disable-AutoStart {
    Write-ColorOutput "`n🛑 Disabling Auto-Start..." "Cyan"
    
    try {
        $exists = Get-ItemProperty -Path $RegistryPath -Name $AppName -ErrorAction SilentlyContinue
        if ($exists) {
            Remove-ItemProperty -Path $RegistryPath -Name $AppName
            Write-ColorOutput "✓ Auto-start disabled successfully!" "Green"
        } else {
            Write-ColorOutput "  Auto-start was not enabled" "Yellow"
        }
    } catch {
        throw "Failed to remove registry entry: $_"
    }
}

# Main execution
Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║     NOVA AGENT AUTO-START CONFIGURATION                   ║" "Cyan"
Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Cyan"

try {
    if ($Status -or (-not $Enable -and -not $Disable)) {
        # Show status
        Get-AutoStartStatus
    }
    elseif ($Enable) {
        # Enable auto-start
        Enable-AutoStart -ExePath $ExecutablePath
        Write-ColorOutput "`n📊 Current Status:" "Cyan"
        Get-AutoStartStatus
    }
    elseif ($Disable) {
        # Disable auto-start
        Disable-AutoStart
        Write-ColorOutput "`n📊 Current Status:" "Cyan"
        Get-AutoStartStatus
    }
    
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Green"
    Write-ColorOutput "║     ✅ OPERATION COMPLETE                                  ║" "Green"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Green"
    
} catch {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Red"
    Write-ColorOutput "║     ❌ OPERATION FAILED                                    ║" "Red"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Red"
    Write-ColorOutput "Error: $_" "Red"
    exit 1
}

