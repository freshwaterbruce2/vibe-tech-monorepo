# Initialize Jujutsu in V:\monorepo (colocated with Git)
$ErrorActionPreference = "Stop"

# Ensure jj is in PATH for this session
$env:PATH = "V:\monorepo\tools\jujutsu;$env:PATH"

# Navigate to repository
Set-Location "V:\monorepo"

Write-Host "Current directory: $(Get-Location)"
Write-Host "Git repository: $(Test-Path .git)"
Write-Host "`nInitializing Jujutsu in colocated mode..."

# Initialize Jujutsu (colocated with Git)
jj git init --colocate

Write-Host "`n✓ Jujutsu initialized successfully!"
Write-Host "`nVerifying setup..."
jj status
