Set-StrictMode -Version Latest

function Add-PathEntry {
    param(
        [string]$PathEntry
    )

    if ([string]::IsNullOrWhiteSpace($PathEntry) -or -not (Test-Path $PathEntry)) {
        return
    }

    $segments = @($env:Path -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($segments -contains $PathEntry) {
        return
    }

    if ([string]::IsNullOrWhiteSpace($env:Path)) {
        $env:Path = $PathEntry
        return
    }

    $env:Path = "$PathEntry;$env:Path"
}

function Get-PreferredNodeDirectory {
    $roamingAppData = $env:APPDATA
    if ([string]::IsNullOrWhiteSpace($roamingAppData) -and -not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
        $roamingAppData = Join-Path $env:USERPROFILE 'AppData\Roaming'
    }

    $candidates = @(
        $(if (-not [string]::IsNullOrWhiteSpace($roamingAppData)) { Join-Path $roamingAppData 'fnm\aliases\default' }),
        'C:\Program Files\nodejs'
    )

    foreach ($candidate in $candidates) {
        if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path (Join-Path $candidate 'node.exe'))) {
            return $candidate
        }
    }

    return $null
}

function Initialize-DevProcessEnvironment {
    if ([string]::IsNullOrWhiteSpace($env:SystemRoot)) {
        $env:SystemRoot = 'C:\Windows'
    }

    if ([string]::IsNullOrWhiteSpace($env:WINDIR)) {
        $env:WINDIR = $env:SystemRoot
    }

    if ([string]::IsNullOrWhiteSpace($env:ComSpec)) {
        $env:ComSpec = Join-Path $env:SystemRoot 'System32\cmd.exe'
    }

    if ([string]::IsNullOrWhiteSpace($env:PATHEXT) -or ($env:PATHEXT -eq '.CPL')) {
        $env:PATHEXT = '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.CPL'
    }

    if ([string]::IsNullOrWhiteSpace($env:PROCESSOR_ARCHITECTURE)) {
        $env:PROCESSOR_ARCHITECTURE = 'AMD64'
    }

    Add-PathEntry (Join-Path $env:SystemRoot 'System32')
    Add-PathEntry (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0')

    $localAppData = $env:LOCALAPPDATA
    if ([string]::IsNullOrWhiteSpace($localAppData) -and -not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
        $localAppData = Join-Path $env:USERPROFILE 'AppData\Local'
    }

    if ([string]::IsNullOrWhiteSpace($env:PNPM_HOME) -and -not [string]::IsNullOrWhiteSpace($localAppData)) {
        $env:PNPM_HOME = Join-Path $localAppData 'pnpm'
    }

    if (-not [string]::IsNullOrWhiteSpace($env:PNPM_HOME)) {
        Add-PathEntry $env:PNPM_HOME
    }

    $nodeDirectory = Get-PreferredNodeDirectory
    if ($nodeDirectory) {
        Add-PathEntry $nodeDirectory
    }

    return [pscustomobject]@{
        SystemRoot = $env:SystemRoot
        ComSpec = $env:ComSpec
        Pathext = $env:PATHEXT
        ProcessorArchitecture = $env:PROCESSOR_ARCHITECTURE
        PnpmHome = $env:PNPM_HOME
        NodeDirectory = $nodeDirectory
    }
}
