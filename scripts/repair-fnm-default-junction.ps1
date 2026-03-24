param(
    [Parameter(Mandatory=$false, HelpMessage="Version to set as default. If omitted, uses 'fnm current'.")]
    [string]$Version
)

$ErrorActionPreference = 'Stop'

try {
    # If no version passed, figure out what the current fnm memory sees
    if (-not $Version) {
        $Version = (fnm current)
        if ($Version -eq "none" -or -not $Version) {
            Write-Error "No active fnm version detected and no version provided. Run 'fnm use <version>' first, or pass a version."
            exit 1
        }
    }

    $fnmDir = Join-Path $env:APPDATA "fnm"
    $targetDir = Join-Path $fnmDir "node-versions\$Version\installation"
    $aliasDir = Join-Path $fnmDir "aliases\default"

    if (-not (Test-Path $targetDir)) {
        Write-Error "Target installation directory not found: $targetDir"
        exit 1
    }

    Write-Host "Target fnm installation found at: $targetDir" -ForegroundColor Cyan

    # Remove existing alias/junction if it exists
    if (Test-Path $aliasDir) {
        Write-Host "Removing existing default alias/junction..." -ForegroundColor Yellow
        # Safely remove without deleting contents of target if it's a junction
        # Using cmd /c rmdir to cleanly drop a junction, or Remove-Item works in modern PWSH
        Remove-Item -Path $aliasDir -Force -Recurse
    }

    # Recreate the default alias as a directory junction
    Write-Host "Creating new directory junction: $aliasDir -> $targetDir" -ForegroundColor Cyan
    New-Item -ItemType Junction -Path $aliasDir -Target $targetDir | Out-Null

    Write-Host "Success: The global cmd.exe fallback junction is now repointed to $Version." -ForegroundColor Green
}
catch {
    Write-Error "Failed to repoint fnm default junction: $_"
    exit 1
}
