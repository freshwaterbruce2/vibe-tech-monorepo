# Install Jujutsu locally (no admin required)
$ErrorActionPreference = "Stop"

$version = "v0.37.0"
$url = "https://github.com/martinvonz/jj/releases/download/$version/jj-$version-x86_64-pc-windows-msvc.zip"
$zipFile = "C:\dev\jujutsu.zip"
$extractPath = "C:\dev\tools\jujutsu"

Write-Host "Downloading Jujutsu $version..."
Invoke-WebRequest -Uri $url -OutFile $zipFile -UseBasicParsing

Write-Host "Extracting to $extractPath..."
if (Test-Path $extractPath) {
    Remove-Item $extractPath -Recurse -Force
}
Expand-Archive -Path $zipFile -DestinationPath $extractPath -Force

Write-Host "Cleaning up..."
Remove-Item $zipFile -Force

Write-Host "`nJujutsu installed successfully!"
Write-Host "Location: $extractPath"
Write-Host "`nAdding to PATH for this session..."
$env:PATH = "$extractPath;$env:PATH"

Write-Host "`nTesting installation..."
& "$extractPath\jj.exe" --version