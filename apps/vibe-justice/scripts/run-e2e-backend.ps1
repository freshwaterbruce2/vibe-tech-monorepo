[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $appRoot 'backend'
$pythonPath = Join-Path $backendRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
    throw "Vibe Justice backend Python was not found at $pythonPath"
}

$tempBase = [System.IO.Path]::GetTempPath()
$runRoot = if ($env:VIBE_JUSTICE_E2E_RUN_ROOT) {
    $env:VIBE_JUSTICE_E2E_RUN_ROOT
} else {
    Join-Path $tempBase "vibe-justice-e2e-$([guid]::NewGuid().ToString('N'))"
}
$resolvedTempBase = [System.IO.Path]::GetFullPath($tempBase)
$resolvedRunRoot = [System.IO.Path]::GetFullPath($runRoot)

if (-not $resolvedRunRoot.StartsWith($resolvedTempBase, [System.StringComparison]::OrdinalIgnoreCase) -or
    -not ([System.IO.Path]::GetFileName($resolvedRunRoot) -match '^vibe-justice-e2e-[a-f0-9]{32}$')) {
    throw "Refusing unsafe E2E temporary path: $resolvedRunRoot"
}

if (-not (Test-Path -LiteralPath $resolvedRunRoot -PathType Container)) {
    New-Item -ItemType Directory -Path $resolvedRunRoot | Out-Null
}

$env:VIBE_JUSTICE_ENV = 'test'
$env:VIBE_JUSTICE_BIND_HOST = '127.0.0.1'
$env:VIBE_JUSTICE_DATA_DIR = Join-Path $resolvedRunRoot 'data'
$env:VIBE_JUSTICE_LOG_DIR = Join-Path $resolvedRunRoot 'logs'
$env:VIBE_JUSTICE_CHROMA_DIR = Join-Path $resolvedRunRoot 'chroma'
$env:VIBE_JUSTICE_DB_DIR = Join-Path $resolvedRunRoot 'database'
$env:VIBE_JUSTICE_API_KEY = 'vibe-justice-e2e-local-only-key-2026'
$env:VIBE_JUSTICE_ENABLE_DOCS = 'false'
$env:PYTHONUTF8 = '1'

try {
    Push-Location $backendRoot
    try {
        & $pythonPath -c "from vibe_justice.utils.startup import run_server; run_server('main:app', reload=False, port=8000)"
        if ($LASTEXITCODE -ne 0) {
            throw "E2E backend exited with code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    $checkedRunRoot = [System.IO.Path]::GetFullPath($resolvedRunRoot)
    $preserveForSupervisedRestart = $env:VIBE_JUSTICE_E2E_PRESERVE_RUN_ROOT -eq 'true'
    if (-not $preserveForSupervisedRestart -and
        $checkedRunRoot.StartsWith($resolvedTempBase, [System.StringComparison]::OrdinalIgnoreCase) -and
        ([System.IO.Path]::GetFileName($checkedRunRoot) -match '^vibe-justice-e2e-[a-f0-9]{32}$') -and
        (Test-Path -LiteralPath $checkedRunRoot)) {
        Remove-Item -LiteralPath $checkedRunRoot -Recurse -Force
    }
}
