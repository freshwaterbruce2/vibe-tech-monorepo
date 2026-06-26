[CmdletBinding()]
param(
    [string]$ProjectRoot,
    [switch]$RequireSigning,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $scriptRoot
}

function Add-StatusCheck {
    param(
        [System.Collections.Generic.List[object]]$Checks,
        [string]$Name,
        [bool]$Passed,
        [string]$Details
    )

    $Checks.Add([pscustomobject]@{
            name    = $Name
            passed  = $Passed
            details = $Details
        })
}

function Test-BooleanEnvValue {
    param([string]$Name)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $false
    }

    return $value -match '^(?i:true|1|yes|on)$'
}

function Resolve-CommandBinary {
    param([string]$CommandLine)

    if ([string]::IsNullOrWhiteSpace($CommandLine)) {
        return $null
    }

    $trimmed = $CommandLine.Trim()
    if ($trimmed.StartsWith('"')) {
        $quoteEnd = $trimmed.IndexOf('"', 1)
        if ($quoteEnd -gt 1) {
            return $trimmed.Substring(1, $quoteEnd - 1)
        }
    }

    return ($trimmed -split '\s+', 2)[0]
}

function Find-SignToolPath {
    if (-not [string]::IsNullOrWhiteSpace($env:TAURI_WINDOWS_SIGNTOOL_PATH)) {
        if (Test-Path -LiteralPath $env:TAURI_WINDOWS_SIGNTOOL_PATH) {
            return (Resolve-Path -LiteralPath $env:TAURI_WINDOWS_SIGNTOOL_PATH).Path
        }

        return $null
    }

    $resolvedCommand = Get-Command -Name 'signtool.exe' -ErrorAction SilentlyContinue
    if ($resolvedCommand) {
        return $resolvedCommand.Source
    }

    if ([string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        return $null
    }

    $kitsPath = Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'
    if (-not (Test-Path -LiteralPath $kitsPath)) {
        return $null
    }

    $candidate = Get-ChildItem -Path $kitsPath -Filter 'signtool.exe' -Recurse -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    if ($candidate) {
        return $candidate.FullName
    }

    return $null
}

function Find-CertificateByThumbprint {
    param([string]$Thumbprint)

    if ([string]::IsNullOrWhiteSpace($Thumbprint)) {
        return $null
    }

    $normalized = ($Thumbprint -replace '\s+', '').ToUpperInvariant()
    foreach ($storePath in @('Cert:\CurrentUser\My', 'Cert:\LocalMachine\My')) {
        if (-not (Test-Path -LiteralPath $storePath)) {
            continue
        }

        $match = Get-ChildItem -Path $storePath -ErrorAction SilentlyContinue |
            Where-Object { (($_.Thumbprint -replace '\s+', '').ToUpperInvariant()) -eq $normalized } |
            Select-Object -First 1

        if ($match) {
            return [pscustomobject]@{
                store      = $storePath
                thumbprint = $match.Thumbprint
                subject    = $match.Subject
            }
        }
    }

    return $null
}

$configPath = Join-Path $ProjectRoot 'src-tauri\tauri.conf.json'
if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Missing Tauri config: $configPath"
}

$tauriConfig = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$windowsConfig = $tauriConfig.bundle.windows
if (-not $windowsConfig) {
    $windowsConfig = [pscustomobject]@{}
}

$checks = [System.Collections.Generic.List[object]]::new()
$missing = [System.Collections.Generic.List[string]]::new()
$notes = [System.Collections.Generic.List[string]]::new()

$signCommand = [string]$windowsConfig.signCommand
$certificateThumbprint = [string]$windowsConfig.certificateThumbprint
$digestAlgorithm = [string]$windowsConfig.digestAlgorithm
$timestampUrl = [string]$windowsConfig.timestampUrl
$hasSignCommand = -not [string]::IsNullOrWhiteSpace($signCommand)
$hasThumbprint = -not [string]::IsNullOrWhiteSpace($certificateThumbprint)
$configured = $hasSignCommand -or $hasThumbprint
$mode = if ($hasSignCommand) { 'signCommand' } elseif ($hasThumbprint) { 'certificateThumbprint' } else { 'unsigned' }

if ($hasSignCommand) {
    Add-StatusCheck -Checks $checks -Name 'signCommand configured' -Passed $true -Details $signCommand

    $commandBinary = Resolve-CommandBinary -CommandLine $signCommand
    $commandExists = $false
    $commandResolvedPath = $null
    if (-not [string]::IsNullOrWhiteSpace($commandBinary)) {
        if (Test-Path -LiteralPath $commandBinary) {
            $commandExists = $true
            $commandResolvedPath = (Resolve-Path -LiteralPath $commandBinary).Path
        } else {
            $commandLookup = Get-Command -Name $commandBinary -ErrorAction SilentlyContinue
            if ($commandLookup) {
                $commandExists = $true
                $commandResolvedPath = $commandLookup.Source
            }
        }
    }

    $commandDetails = if (-not [string]::IsNullOrWhiteSpace($commandResolvedPath)) { $commandResolvedPath } else { $commandBinary }
    Add-StatusCheck -Checks $checks -Name 'signCommand binary available' -Passed $commandExists -Details $commandDetails
    if (-not $commandExists) {
        $missing.Add("Cannot resolve signCommand binary '$commandBinary'.")
    }

    $placeholderExists = $signCommand -match '%1'
    Add-StatusCheck -Checks $checks -Name 'signCommand placeholder' -Passed $placeholderExists -Details "Expected '%1' in signCommand."
    if (-not $placeholderExists) {
        $missing.Add("signCommand is missing '%1' placeholder required by Tauri.")
    }

    if ($signCommand -match '(?i)(relic|trusted-signing-cli|azure)') {
        foreach ($name in @('AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID')) {
            $valueSet = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))
            $valueDetails = if ($valueSet) { 'present' } else { 'missing' }
            Add-StatusCheck -Checks $checks -Name "$name set" -Passed $valueSet -Details $valueDetails
            if (-not $valueSet) {
                $missing.Add("$name must be set for Azure-backed signing commands.")
            }
        }
    }
}

if ($hasThumbprint) {
    Add-StatusCheck -Checks $checks -Name 'certificateThumbprint configured' -Passed $true -Details $certificateThumbprint

    $certificate = Find-CertificateByThumbprint -Thumbprint $certificateThumbprint
    $certificateStore = if ($null -ne $certificate) { $certificate.store } else { 'not found' }
    Add-StatusCheck -Checks $checks -Name 'certificate installed' -Passed ($null -ne $certificate) -Details $certificateStore
    if (-not $certificate) {
        $missing.Add("Certificate thumbprint not found in CurrentUser/LocalMachine personal stores.")
    }

    $digestConfigured = -not [string]::IsNullOrWhiteSpace($digestAlgorithm)
    $digestDetails = if ($digestConfigured) { $digestAlgorithm } else { 'missing' }
    Add-StatusCheck -Checks $checks -Name 'digestAlgorithm configured' -Passed $digestConfigured -Details $digestDetails
    if (-not $digestConfigured) {
        $missing.Add('digestAlgorithm must be set when using certificateThumbprint signing.')
    }

    $timestampConfigured = -not [string]::IsNullOrWhiteSpace($timestampUrl)
    $timestampDetails = if ($timestampConfigured) { $timestampUrl } else { 'missing' }
    Add-StatusCheck -Checks $checks -Name 'timestampUrl configured' -Passed $timestampConfigured -Details $timestampDetails
    if (-not $timestampConfigured) {
        $missing.Add('timestampUrl should be set to keep signatures valid after certificate expiry.')
    }

    $signToolPath = Find-SignToolPath
    $signToolAvailable = -not [string]::IsNullOrWhiteSpace($signToolPath)
    $signToolDetails = if ($signToolAvailable) { $signToolPath } else { 'not found' }
    Add-StatusCheck -Checks $checks -Name 'signtool available' -Passed $signToolAvailable -Details $signToolDetails
    if (-not $signToolAvailable) {
        $missing.Add('signtool.exe was not found. Install Windows SDK or set TAURI_WINDOWS_SIGNTOOL_PATH.')
    }
}

if (-not $configured) {
    $notes.Add('No Windows signing configuration found in tauri.conf.json.')
    $notes.Add('Unsigned builds remain supported by default.')
}

$requireSigningEffective = $RequireSigning -or (Test-BooleanEnvValue -Name 'VCS_REQUIRE_WINDOWS_SIGNING')
$ready = $configured -and $missing.Count -eq 0

$summary = [pscustomobject]@{
    projectRoot       = $ProjectRoot
    configPath        = $configPath
    mode              = $mode
    configured        = $configured
    ready             = $ready
    requireSigning    = $requireSigningEffective
    unsignedFallback  = $true
    checks            = @($checks)
    missing           = @($missing)
    notes             = @($notes)
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 20
} else {
    Write-Host 'Windows code-signing readiness report' -ForegroundColor Cyan
    Write-Host "Project root:   $ProjectRoot" -ForegroundColor DarkGray
    Write-Host "Config path:    $configPath" -ForegroundColor DarkGray
    Write-Host "Signing mode:   $mode" -ForegroundColor DarkGray
    Write-Host "Configured:     $configured" -ForegroundColor DarkGray
    Write-Host "Ready:          $ready" -ForegroundColor DarkGray
    Write-Host "Require signing:$requireSigningEffective" -ForegroundColor DarkGray
    Write-Host ''

    foreach ($check in $checks) {
        $prefix = if ($check.passed) { '[OK] ' } else { '[!!] ' }
        $color = if ($check.passed) { 'Green' } else { 'Yellow' }
        Write-Host "$prefix$($check.name): $($check.details)" -ForegroundColor $color
    }

    if ($notes.Count -gt 0) {
        Write-Host ''
        foreach ($note in $notes) {
            Write-Host "[INFO] $note" -ForegroundColor Yellow
        }
    }

    if ($missing.Count -gt 0) {
        Write-Host ''
        foreach ($item in $missing) {
            Write-Host "[MISSING] $item" -ForegroundColor Yellow
        }
    }

    if (-not $configured) {
        Write-Host ''
        Write-Host '[INFO] Build output will remain unsigned until signing config is provided.' -ForegroundColor Yellow
    }
}

if ($requireSigningEffective -and -not $ready) {
    Write-Error 'Windows code signing is required but readiness checks failed.'
    exit 1
}

exit 0
