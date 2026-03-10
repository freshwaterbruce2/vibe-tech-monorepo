# Archive old Python learning system code
# Moves Python files from D:\learning-system to D:\learning-system\_archive

$sourceDir = "D:\learning-system"
$archiveDir = "D:\learning-system\_archive"

# Ensure archive directory exists
if (-not (Test-Path $archiveDir)) {
    New-Item -Path $archiveDir -ItemType Directory -Force | Out-Null
}

Write-Host "Archiving Python code from $sourceDir to $archiveDir..."

# Move Python files
$pythonFiles = Get-ChildItem -Path $sourceDir -Filter "*.py" -File -ErrorAction SilentlyContinue
if ($pythonFiles.Count -gt 0) {
    $pythonFiles | Move-Item -Destination $archiveDir -Force
    Write-Host "Moved $($pythonFiles.Count) Python files"
}

# Move .venv directory if it exists
if (Test-Path "$sourceDir\.venv") {
    Move-Item -Path "$sourceDir\.venv" -Destination "$archiveDir\.venv" -Force
    Write-Host "Moved .venv directory"
}

# Move requirements.txt if it exists
if (Test-Path "$sourceDir\requirements.txt") {
    Move-Item -Path "$sourceDir\requirements.txt" -Destination $archiveDir -Force
    Write-Host "Moved requirements.txt"
}

# Move pyproject.toml if it exists
if (Test-Path "$sourceDir\pyproject.toml") {
    Move-Item -Path "$sourceDir\pyproject.toml" -Destination $archiveDir -Force
    Write-Host "Moved pyproject.toml"
}

# Move uv.lock if it exists
if (Test-Path "$sourceDir\uv.lock") {
    Move-Item -Path "$sourceDir\uv.lock" -Destination $archiveDir -Force
    Write-Host "Moved uv.lock"
}

Write-Host "Archive complete!"
