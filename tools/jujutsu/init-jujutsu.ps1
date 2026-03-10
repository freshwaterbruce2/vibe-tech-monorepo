# Initialize Jujutsu in C:\dev (colocated with Git)
$ErrorActionPreference = "Stop"

# Ensure jj is in PATH for this session
$env:PATH = "C:\dev\tools\jujutsu;$env:PATH"

# Navigate to repository
Set-Location "C:\dev"

Write-Host "Current directory: $(Get-Location)"
Write-Host "Git repository: $(Test-Path .git)"
Write-Host "`nInitializing Jujutsu in colocated mode..."

# Initialize Jujutsu (colocated with Git)
jj git init --colocate

Write-Host "`n✓ Jujutsu initialized successfully!"
Write-Host "`nVerifying setup..."
jj status
