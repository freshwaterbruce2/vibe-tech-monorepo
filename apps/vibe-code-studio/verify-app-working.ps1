$ErrorActionPreference = 'Stop'

$candidates = @(
  (Join-Path $env:LOCALAPPDATA 'Programs\vibe-code-studio\Vibe Code Studio.exe'),
  (Join-Path (Get-Location).Path 'dist-electron\win-unpacked\Vibe Code Studio.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\Vibe Code Studio\Vibe Code Studio.exe')
)

$exe = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) {
  Write-Error "Vibe Code Studio executable not found. Checked:`n$($candidates -join "`n")"
  exit 1
}

Write-Host "Verifying executable: $exe"

$proc = Start-Process -FilePath $exe -PassThru
Start-Sleep -Seconds 3

if ($proc.HasExited) {
  if ($proc.ExitCode -eq 0) {
    Write-Host "App launched and exited cleanly (exit code 0)."
    exit 0
  }

  Write-Error "App exited with code $($proc.ExitCode)"
  exit 1
}

Write-Host "App is running (PID $($proc.Id)); stopping test process."
Stop-Process -Id $proc.Id -Force
Write-Host "Verification succeeded."
exit 0
