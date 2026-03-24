# Nova Agent Build and Package Script
# Automates the full build and packaging process for Windows 11

param(
    [ValidateSet("msi", "nsis", "both")]
    [string]$InstallerType = "both",
    [switch]$SkipTests,
    [switch]$SkipClean,
    [switch]$Release,
    [string]$OutputDir = ".\installers"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "DarkGray"
    Write-ColorOutput "▶ $Message" "Cyan"
    Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "DarkGray"
}

function Test-Prerequisites {
    Write-Step "Checking Prerequisites"
    
    # Check Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw "Node.js not found. Please install Node.js 22 LTS or later."
    }
    $nodeVersion = node --version
    Write-ColorOutput "✓ Node.js: $nodeVersion" "Green"
    
    # Check pnpm
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        throw "pnpm not found. Install with: npm install -g pnpm"
    }
    $pnpmVersion = pnpm --version
    Write-ColorOutput "✓ pnpm: $pnpmVersion" "Green"
    
    # Check Rust
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
        throw "Rust not found. Install from: https://rustup.rs"
    }
    $rustVersion = rustc --version
    Write-ColorOutput "✓ Rust: $rustVersion" "Green"
    
    # Check Tauri CLI
    if (-not (Get-Command cargo-tauri -ErrorAction SilentlyContinue)) {
        Write-ColorOutput "⚠️  Tauri CLI not found. Installing..." "Yellow"
        cargo install tauri-cli --version "^2.0"
    }
    Write-ColorOutput "✓ Tauri CLI installed" "Green"
    
    # Check WiX (for MSI)
    if ($InstallerType -eq "msi" -or $InstallerType -eq "both") {
        if (-not (Get-Command candle -ErrorAction SilentlyContinue)) {
            Write-ColorOutput "⚠️  WiX Toolset not found (required for MSI)" "Yellow"
            Write-ColorOutput "  Download from: https://wixtoolset.org/releases/" "Yellow"
            Write-ColorOutput "  Or install with: winget install WiXToolset.WiX" "Yellow"
            
            if ($InstallerType -eq "msi") {
                throw "WiX Toolset is required for MSI installer"
            }
        }
        else {
            Write-ColorOutput "✓ WiX Toolset installed" "Green"
        }
    }
}

function Clean-BuildArtifacts {
    if ($SkipClean) {
        Write-ColorOutput "`n⏭️  Skipping clean" "Yellow"
        return
    }
    
    Write-Step "Cleaning Build Artifacts"
    
    Push-Location $ProjectRoot
    
    $cleanPaths = @(
        "dist",
        "src-tauri\target\release\bundle"
    )
    
    foreach ($path in $cleanPaths) {
        if (Test-Path $path) {
            Write-ColorOutput "  Removing: $path" "Gray"
            Remove-Item -Path $path -Recurse -Force
        }
    }
    
    Pop-Location
    Write-ColorOutput "✓ Clean complete" "Green"
}

function Install-Dependencies {
    Write-Step "Installing Dependencies"
    
    Push-Location $ProjectRoot
    
    Write-ColorOutput "  Installing Node dependencies..." "Gray"
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
    
    Write-ColorOutput "  Installing Rust dependencies..." "Gray"
    Push-Location "src-tauri"
    cargo fetch
    if ($LASTEXITCODE -ne 0) { throw "cargo fetch failed" }
    Pop-Location
    
    Pop-Location
    Write-ColorOutput "✓ Dependencies installed" "Green"
}

function Run-Tests {
    if ($SkipTests) {
        Write-ColorOutput "`n⏭️  Skipping tests" "Yellow"
        return
    }
    
    Write-Step "Running Tests"
    
    Push-Location $ProjectRoot
    
    # Run frontend tests
    Write-ColorOutput "  Running frontend tests..." "Gray"
    pnpm test
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "⚠️  Frontend tests failed" "Yellow"
        $response = Read-Host "Continue anyway? (yes/no)"
        if ($response -ne "yes") {
            throw "Tests failed"
        }
    }
    
    # Run Rust tests
    Write-ColorOutput "  Running Rust tests..." "Gray"
    Push-Location "src-tauri"
    cargo test
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "⚠️  Rust tests failed" "Yellow"
        $response = Read-Host "Continue anyway? (yes/no)"
        if ($response -ne "yes") {
            throw "Tests failed"
        }
    }
    Pop-Location
    
    Pop-Location
    Write-ColorOutput "✓ Tests passed" "Green"
}

function Build-Frontend {
    Write-Step "Building Frontend"

    Push-Location $ProjectRoot

    Write-ColorOutput "  Building React frontend with Vite..." "Gray"
    pnpm build:frontend
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

    Pop-Location
    Write-ColorOutput "✓ Frontend built" "Green"
}

function Build-TauriApp {
    Write-Step "Building Tauri Application"

    Push-Location $ProjectRoot

    # Determine build targets based on installer type
    $targets = @()
    if ($InstallerType -eq "msi" -or $InstallerType -eq "both") {
        $targets += "msi"
    }
    if ($InstallerType -eq "nsis" -or $InstallerType -eq "both") {
        $targets += "nsis"
    }

    $targetString = $targets -join ","
    Write-ColorOutput "  Building installers: $targetString" "Gray"

    # Build with Tauri
    $env:TAURI_BUNDLE_TARGETS = $targetString
    pnpm tauri build
    if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }

    Pop-Location
    Write-ColorOutput "✓ Tauri build complete" "Green"
}

function Copy-Installers {
    Write-Step "Copying Installers to Output Directory"

    # Create output directory
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }

    Push-Location $ProjectRoot

    $bundlePath = "src-tauri\target\release\bundle"
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

    # Copy MSI
    if ($InstallerType -eq "msi" -or $InstallerType -eq "both") {
        $msiPath = Get-ChildItem -Path "$bundlePath\msi" -Filter "*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($msiPath) {
            $destName = "NOVA-Agent-Setup-$timestamp.msi"
            Copy-Item -Path $msiPath.FullName -Destination "$OutputDir\$destName"
            Write-ColorOutput "✓ MSI: $OutputDir\$destName" "Green"
        }
        else {
            Write-ColorOutput "⚠️  MSI installer not found" "Yellow"
        }
    }

    # Copy NSIS
    if ($InstallerType -eq "nsis" -or $InstallerType -eq "both") {
        $nsisPath = Get-ChildItem -Path "$bundlePath\nsis" -Filter "*-setup.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($nsisPath) {
            $destName = "NOVA-Agent-Setup-$timestamp.exe"
            Copy-Item -Path $nsisPath.FullName -Destination "$OutputDir\$destName"
            Write-ColorOutput "✓ NSIS: $OutputDir\$destName" "Green"
        }
        else {
            Write-ColorOutput "⚠️  NSIS installer not found" "Yellow"
        }
    }

    Pop-Location
}

function Show-BuildSummary {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Green"
    Write-ColorOutput "║     ✅ BUILD COMPLETE!                                     ║" "Green"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Green"

    Write-ColorOutput "📦 Installers created in: $OutputDir" "Cyan"

    if (Test-Path $OutputDir) {
        $installers = Get-ChildItem -Path $OutputDir -Filter "NOVA-Agent-Setup-*"
        foreach ($installer in $installers) {
            $size = [math]::Round($installer.Length / 1MB, 2)
            Write-ColorOutput "  • $($installer.Name) ($size MB)" "White"
        }
    }

    Write-ColorOutput "`n📝 Next Steps:" "Cyan"
    Write-ColorOutput "  1. Test the installer on a clean Windows 11 system" "White"
    Write-ColorOutput "  2. Run: .\scripts\install.ps1 -InstallerPath .\installers\<installer-name>" "White"
    Write-ColorOutput "  3. Verify auto-start and all features work correctly" "White"

    if ($Release) {
        Write-ColorOutput "`n🚀 Release Checklist:" "Cyan"
        Write-ColorOutput "  • Update CHANGELOG.md" "White"
        Write-ColorOutput "  • Create GitHub release" "White"
        Write-ColorOutput "  • Upload installers to release" "White"
        Write-ColorOutput "  • Update documentation" "White"
    }
}

# Main execution
Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║     NOVA AGENT BUILD & PACKAGE WIZARD                     ║" "Cyan"
Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Cyan"

$startTime = Get-Date

try {
    Test-Prerequisites
    Clean-BuildArtifacts
    Install-Dependencies
    Run-Tests
    Build-Frontend
    Build-TauriApp
    Copy-Installers

    $duration = (Get-Date) - $startTime
    Write-ColorOutput "`n⏱️  Total build time: $($duration.ToString('mm\:ss'))" "Gray"

    Show-BuildSummary

    exit 0

}
catch {
    Write-ColorOutput "`n╔════════════════════════════════════════════════════════════╗" "Red"
    Write-ColorOutput "║     ❌ BUILD FAILED                                        ║" "Red"
    Write-ColorOutput "╚════════════════════════════════════════════════════════════╝`n" "Red"
    Write-ColorOutput "Error: $_" "Red"
    Write-ColorOutput "`nCheck the error message above for details." "Yellow"
    exit 1
}


