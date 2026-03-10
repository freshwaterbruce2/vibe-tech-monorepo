# Add Jujutsu to system PATH permanently
$ErrorActionPreference = "Stop"

$jjPath = "C:\dev\tools\jujutsu"

Write-Host "Adding Jujutsu to User PATH..."

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::User)

# Check if already in PATH
if ($currentPath -notlike "*$jjPath*") {
    $newPath = "$jjPath;$currentPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, [EnvironmentVariableTarget]::User)
    Write-Host "✓ Added $jjPath to User PATH"
} else {
    Write-Host "✓ Jujutsu is already in User PATH"
}

# Also add to current session
$env:PATH = "$jjPath;$env:PATH"

Write-Host "`nVerifying installation..."
jj --version
