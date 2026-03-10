# Check Jujutsu status
$ErrorActionPreference = "Stop"

$env:PATH = "C:\dev\tools\jujutsu;$env:PATH"
Set-Location "C:\dev"

Write-Host "Checking Jujutsu status...`n"
jj status
