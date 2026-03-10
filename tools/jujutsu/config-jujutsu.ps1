# Configure Jujutsu user settings
$ErrorActionPreference = "Stop"

$env:PATH = "C:\dev\tools\jujutsu;$env:PATH"

Write-Host "Configuring Jujutsu user settings...`n"

# Set user name and email (same as Git)
$gitName = git config --global user.name
$gitEmail = git config --global user.email

if ($gitName) {
    Write-Host "Setting user.name: $gitName"
    jj config set --user user.name "$gitName"
} else {
    Write-Host "[31;1mWarning:[0m Git user.name not set"
}

if ($gitEmail) {
    Write-Host "Setting user.email: $gitEmail"
    jj config set --user user.email "$gitEmail"
} else {
    Write-Host "[31;1mWarning:[0m Git user.email not set"
}

Write-Host "`nConfiguring editor..."
jj config set --user ui.editor "code --wait"

Write-Host "`nVerifying configuration..."
jj config list --user

Write-Host "`n✓ Jujutsu user configuration complete!"
