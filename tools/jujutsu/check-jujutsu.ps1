# Check Jujutsu status
$ErrorActionPreference = "Stop"

$env:PATH = "V:\monorepo\tools\jujutsu;$env:PATH"
Set-Location "V:\monorepo"

Write-Host "Checking Jujutsu status...`n"
jj status
