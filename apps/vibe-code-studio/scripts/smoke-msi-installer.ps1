[CmdletBinding()]
param(
    [string]$MsiPath,
    [string]$ProjectRoot,
    [string]$InstallDirectory = 'V:\Apps\Vibe_Code_Studio_MsiSmoke',
    [string]$TempRoot = 'V:\temp\vibe-code-studio',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $scriptRoot
}

function Get-MsiProperty {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$PropertyName
    )

    $installer = New-Object -ComObject WindowsInstaller.Installer
    $database = $installer.GetType().InvokeMember('OpenDatabase', 'InvokeMethod', $null, $installer, @($Path, 0))
    $query = "SELECT `Value` FROM `Property` WHERE `Property`='$PropertyName'"
    $view = $database.GetType().InvokeMember('OpenView', 'InvokeMethod', $null, $database, ($query))
    $null = $view.GetType().InvokeMember('Execute', 'InvokeMethod', $null, $view, $null)
    $record = $view.GetType().InvokeMember('Fetch', 'InvokeMethod', $null, $view, $null)
    if ($null -eq $record) {
        return $null
    }

    return $record.GetType().InvokeMember('StringData', 'GetProperty', $null, $record, 1)
}

function Get-InstalledMsiEntry {
    param([string]$ProductCode)

    $roots = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
    )

    foreach ($root in $roots) {
        $keyPath = Join-Path $root $ProductCode
        if (-not (Test-Path -LiteralPath $keyPath)) {
            continue
        }

        $entry = Get-ItemProperty -LiteralPath $keyPath -ErrorAction SilentlyContinue
        if ($entry) {
            return [pscustomobject]@{
                keyPath          = $keyPath
                displayName      = $entry.DisplayName
                displayVersion   = $entry.DisplayVersion
                installLocation  = $entry.InstallLocation
                uninstallString  = $entry.UninstallString
            }
        }
    }

    return $null
}

function Invoke-MsiExec {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Phase
    )

    $process = Start-Process -FilePath 'msiexec.exe' -ArgumentList $Arguments -Wait -PassThru -NoNewWindow
    return [int]$process.ExitCode
}

function Resolve-MsiArtifactPath {
    param(
        [string]$InputPath,
        [string]$LocalProjectRoot
    )

    if (-not [string]::IsNullOrWhiteSpace($InputPath)) {
        if (-not (Test-Path -LiteralPath $InputPath)) {
            throw "MSI file not found: $InputPath"
        }

        return (Resolve-Path -LiteralPath $InputPath).Path
    }

    . (Join-Path $PSScriptRoot 'Get-CargoTargetDir.ps1')
    $cargoTargetDir = Get-CargoTargetDir -ProjectRoot $LocalProjectRoot
    $bundleRoot = Join-Path $cargoTargetDir 'release\bundle'
    $artifactNamePattern = '(?i)vibe[ -]?code[ -]?studio'

    $candidate = Get-ChildItem -Path $bundleRoot -Recurse -Filter '*.msi' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match $artifactNamePattern } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $candidate) {
        throw "No MSI artifact found under $bundleRoot"
    }

    return $candidate.FullName
}

$resolvedMsiPath = Resolve-MsiArtifactPath -InputPath $MsiPath -LocalProjectRoot $ProjectRoot
$resolvedInstallDirectory = [System.IO.Path]::GetFullPath($InstallDirectory)
if (-not $resolvedInstallDirectory.StartsWith('V:\Apps\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "MSI smoke InstallDirectory must stay under V:\Apps: $resolvedInstallDirectory"
}
$productCode = Get-MsiProperty -Path $resolvedMsiPath -PropertyName 'ProductCode'
$productName = Get-MsiProperty -Path $resolvedMsiPath -PropertyName 'ProductName'

if ([string]::IsNullOrWhiteSpace($productCode)) {
    throw "Unable to read ProductCode from MSI: $resolvedMsiPath"
}

if ([string]::IsNullOrWhiteSpace($productName)) {
    $productName = 'Vibe Code Studio'
}

Write-Host 'MSI smoke test' -ForegroundColor Cyan
Write-Host "MSI path:    $resolvedMsiPath" -ForegroundColor DarkGray
Write-Host "Product:     $productName" -ForegroundColor DarkGray
Write-Host "ProductCode: $productCode" -ForegroundColor DarkGray
Write-Host ''

$existingInstall = Get-InstalledMsiEntry -ProductCode $productCode
if ($existingInstall -and -not $Force) {
    Write-Host '[SKIP] Existing installation detected. Skipping install/uninstall smoke to avoid disrupting this machine.' -ForegroundColor Yellow
    Write-Host "       Existing install key: $($existingInstall.keyPath)" -ForegroundColor Yellow
    Write-Host '       Re-run with -Force to smoke test this MSI anyway.' -ForegroundColor Yellow
    exit 0
}

$resolvedTempRoot = [System.IO.Path]::GetFullPath($TempRoot)
if (-not $resolvedTempRoot.StartsWith('V:\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "MSI smoke TempRoot must stay on V:\: $resolvedTempRoot"
}
$runDir = Join-Path $resolvedTempRoot ("vcs-msi-smoke-{0}" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
$installLog = Join-Path $runDir 'install.log'
$uninstallLog = Join-Path $runDir 'uninstall.log'
$cleanupRequired = $false

try {
    Write-Host "[1/4] Installing MSI silently..." -ForegroundColor Yellow
    $installArgs = @(
        '/i',
        "`"$resolvedMsiPath`"",
        'ALLUSERS=2',
        'MSIINSTALLPERUSER=1',
        "REQUESTEDINSTALLDIR=$resolvedInstallDirectory",
        'REBOOT=ReallySuppress',
        '/qn',
        '/norestart',
        '/L*v',
        "`"$installLog`""
    )
    $installExitCode = Invoke-MsiExec -Arguments $installArgs -Phase 'MSI install'
    $cleanupRequired = $null -ne (Get-InstalledMsiEntry -ProductCode $productCode)
    if ($installExitCode -notin @(0, 3010)) {
        $requiresElevation = $false
        if ($installExitCode -eq 1603 -and (Test-Path -LiteralPath $installLog)) {
            $requiresElevation = Select-String -Path $installLog -Pattern 'Error 1925' -Quiet -ErrorAction SilentlyContinue
        }

        if ($requiresElevation) {
            Write-Host '[SKIP] MSI requires elevated privileges on this machine; skipping smoke to keep local runs safe.' -ForegroundColor Yellow
            Write-Host "       Install log: $installLog" -ForegroundColor Yellow
            Write-Host '       Run this script from an elevated PowerShell session to execute full install/uninstall coverage.' -ForegroundColor Yellow
            exit 0
        }

        throw "MSI install failed with msiexec exit code $installExitCode."
    }
    Write-Host "      Install exit code: $installExitCode" -ForegroundColor Green

    Write-Host "[2/4] Verifying MSI install registration..." -ForegroundColor Yellow
    $installedEntry = Get-InstalledMsiEntry -ProductCode $productCode
    if (-not $installedEntry) {
        throw "MSI install completed but ProductCode was not registered: $productCode"
    }
    Write-Host "      Registered uninstall key: $($installedEntry.keyPath)" -ForegroundColor Green

    $exeCandidates = @(
        (Join-Path $resolvedInstallDirectory 'vibe-code-studio.exe'),
        (Join-Path $resolvedInstallDirectory 'Vibe Code Studio.exe')
    )
    $exePath = $exeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($exePath) {
        $resolvedExePath = (Resolve-Path -LiteralPath $exePath).Path
        if (-not $resolvedExePath.StartsWith($resolvedInstallDirectory, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "MSI ignored the approved V-drive install directory: $resolvedExePath"
        }
        Write-Host "      Installed executable detected: $exePath" -ForegroundColor Green
    } else {
        throw "Installed executable was not found under approved directory: $resolvedInstallDirectory"
    }

    Write-Host "[3/4] Uninstalling MSI silently..." -ForegroundColor Yellow
    $uninstallArgs = @(
        '/x',
        $productCode,
        'REBOOT=ReallySuppress',
        '/qn',
        '/norestart',
        '/L*v',
        "`"$uninstallLog`""
    )
    $uninstallExitCode = Invoke-MsiExec -Arguments $uninstallArgs -Phase 'MSI uninstall'
    if ($uninstallExitCode -notin @(0, 3010)) {
        throw "MSI uninstall failed with msiexec exit code $uninstallExitCode."
    }
    Write-Host "      Uninstall exit code: $uninstallExitCode" -ForegroundColor Green

    Write-Host "[4/4] Verifying uninstall cleanup..." -ForegroundColor Yellow
    $remainingEntry = Get-InstalledMsiEntry -ProductCode $productCode
    if ($remainingEntry) {
        throw "MSI uninstall did not remove ProductCode from registry: $productCode"
    }
    $cleanupRequired = $false
    Write-Host '      MSI uninstall cleanup verified.' -ForegroundColor Green

    Write-Host ''
    Write-Host 'MSI smoke test passed.' -ForegroundColor Green
    Write-Host "Install log:   $installLog" -ForegroundColor DarkGray
    Write-Host "Uninstall log: $uninstallLog" -ForegroundColor DarkGray
} finally {
    if ($cleanupRequired -or (Get-InstalledMsiEntry -ProductCode $productCode)) {
        Write-Warning 'MSI smoke did not reach normal cleanup; attempting a safety uninstall.'
        $cleanupExitCode = Invoke-MsiExec -Arguments @(
            '/x', $productCode, 'REBOOT=ReallySuppress', '/qn', '/norestart'
        ) -Phase 'MSI safety uninstall'
        if ($cleanupExitCode -notin @(0, 1605, 3010)) {
            Write-Warning "MSI safety uninstall failed with exit code $cleanupExitCode."
        }
    }
}
