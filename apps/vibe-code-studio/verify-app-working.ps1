param(
  [string]$ExecutablePath
)

$ErrorActionPreference = 'Stop'

$candidates = @(
  'V:\Apps\Vibe_Code_Studio\vibe-code-studio.exe'
)

if (-not [string]::IsNullOrWhiteSpace($ExecutablePath)) {
  $candidates = @($ExecutablePath)
}

$exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) {
  Write-Error "Vibe Code Studio executable not found. Checked:`n$($candidates -join "`n")"
  exit 1
}
$exe = (Resolve-Path -LiteralPath $exe).Path
if (-not $exe.StartsWith('V:\Apps\', [System.StringComparison]::OrdinalIgnoreCase)) {
  Write-Error "Installed-app verification only accepts executables under V:\Apps: $exe"
  exit 1
}

Write-Host "Verifying executable: $exe"

$proc = Start-Process -FilePath $exe -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 5

if ($proc.HasExited) {
  if ($proc.ExitCode -eq 0) {
    Write-Host "App launched and exited cleanly (exit code 0)."
    exit 0
  }

  Write-Error "App exited with code $($proc.ExitCode)"
  exit 1
}

Write-Host "App is running (PID $($proc.Id)); requesting a normal close."
$null = $proc.CloseMainWindow()
$proc.WaitForExit(10000) | Out-Null
if (-not $proc.HasExited) {
  Write-Warning 'App did not close within 10 seconds; forcing only the verified test process to stop.'
  Stop-Process -Id $proc.Id -Force
  $proc.WaitForExit(5000) | Out-Null
}
Start-Sleep -Milliseconds 500
Write-Host "Verification succeeded."
exit 0
