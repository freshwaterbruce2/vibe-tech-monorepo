# Claude Code Installation Cleanup Script
# Removes old npm-based installations and keeps only native installer

Write-Host "=== Claude Code Installation Cleanup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Find all claude executables in PATH
Write-Host "Finding Claude Code executables..." -ForegroundColor Yellow
$claudeCommands = Get-Command claude -All -ErrorAction SilentlyContinue
if ($claudeCommands) {
    Write-Host "Found Claude installations:" -ForegroundColor Green
    $claudeCommands | ForEach-Object {
        Write-Host "  - $($_.Source)" -ForegroundColor White
    }
} else {
    Write-Host "No claude commands found in PATH" -ForegroundColor Gray
}
Write-Host ""

# 2. Check for npm global installation
Write-Host "Checking for npm global installation..." -ForegroundColor Yellow
try {
    $npmList = npm list -g @anthropic/claude-code --depth=0 2>&1
    if ($npmList -match "@anthropic/claude-code") {
        Write-Host "Found npm installation:" -ForegroundColor Red
        Write-Host $npmList -ForegroundColor White
        Write-Host ""
        Write-Host "To remove: npm uninstall -g @anthropic/claude-code" -ForegroundColor Cyan
    } else {
        Write-Host "No npm installation found" -ForegroundColor Green
    }
} catch {
    Write-Host "Could not check npm (npm may not be installed)" -ForegroundColor Gray
}
Write-Host ""

# 3. Find Claude installations in AppData\Local
Write-Host "Checking AppData\Local for Claude installations..." -ForegroundColor Yellow
$localAppData = "$env:USERPROFILE\AppData\Local"
$claudeFolders = Get-ChildItem -Path $localAppData -Directory -Filter "*claude*" -ErrorAction SilentlyContinue

if ($claudeFolders) {
    Write-Host "Found Claude folders in AppData\Local:" -ForegroundColor Yellow
    foreach ($folder in $claudeFolders) {
        Write-Host "  - $($folder.FullName)" -ForegroundColor White
        $size = (Get-ChildItem -Path $folder.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "    Size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "No Claude folders found in AppData\Local" -ForegroundColor Green
}
Write-Host ""

# 4. Find Claude installations in Program Files
Write-Host "Checking Program Files for Claude installations..." -ForegroundColor Yellow
$programFiles = @("$env:PROGRAMFILES", "${env:PROGRAMFILES(x86)}")
foreach ($pfPath in $programFiles) {
    if (Test-Path $pfPath) {
        $claudePrograms = Get-ChildItem -Path $pfPath -Directory -Filter "*claude*" -ErrorAction SilentlyContinue
        if ($claudePrograms) {
            Write-Host "Found in ${pfPath}:" -ForegroundColor Yellow
            foreach ($program in $claudePrograms) {
                Write-Host "  - $($program.FullName)" -ForegroundColor White
            }
        }
    }
}
Write-Host ""

# 5. Check for installer files
Write-Host "Checking Downloads for Claude installers..." -ForegroundColor Yellow
$downloads = "$env:USERPROFILE\Downloads"
if (Test-Path $downloads) {
    $installers = Get-ChildItem -Path $downloads -Filter "*claude*" -File -ErrorAction SilentlyContinue
    if ($installers) {
        Write-Host "Found installer files:" -ForegroundColor Yellow
        foreach ($installer in $installers) {
            Write-Host "  - $($installer.Name) ($([math]::Round($installer.Length / 1MB, 2)) MB)" -ForegroundColor White
        }
    } else {
        Write-Host "No Claude installers found in Downloads" -ForegroundColor Green
    }
}
Write-Host ""

# 6. Summary and recommendations
Write-Host "=== Cleanup Recommendations ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "The correct installation method (2026):" -ForegroundColor Green
Write-Host "  - Native installer from: https://docs.anthropic.com/en/docs/claude-code/getting-started" -ForegroundColor White
Write-Host "  - Location: C:\Users\<username>\AppData\Local\Programs\claude-code" -ForegroundColor White
Write-Host ""

Write-Host "To remove old npm installation:" -ForegroundColor Yellow
Write-Host "  npm uninstall -g @anthropic/claude-code" -ForegroundColor Cyan
Write-Host ""

Write-Host "To install native version:" -ForegroundColor Yellow
Write-Host "  1. Download installer from Anthropic" -ForegroundColor Cyan
Write-Host "  2. Run installer" -ForegroundColor Cyan
Write-Host "  3. Or use: claude install" -ForegroundColor Cyan
Write-Host ""

# Interactive cleanup option
Write-Host "Would you like to automatically remove npm installation? (Y/N): " -NoNewline -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host ""
    Write-Host "Removing npm installation..." -ForegroundColor Yellow
    try {
        npm uninstall -g @anthropic/claude-code
        Write-Host "npm installation removed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to remove npm installation: $_" -ForegroundColor Red
    }
} else {
    Write-Host "Skipping automatic cleanup" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Cleanup scan complete!" -ForegroundColor Green
