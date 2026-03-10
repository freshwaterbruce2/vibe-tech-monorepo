# Quick test script for development tools

Write-Host "`n🚀 Testing Development Tools" -ForegroundColor Cyan
Write-Host "=" * 50

# Test 1: Check prerequisites
Write-Host "`n1. Prerequisites Check:" -ForegroundColor Yellow
$preReqs = @{
    "Node.js" = Get-Command node -ErrorAction SilentlyContinue
    "pnpm" = Get-Command pnpm -ErrorAction SilentlyContinue
    "Docker" = Get-Command docker -ErrorAction SilentlyContinue
    "Git" = Get-Command git -ErrorAction SilentlyContinue
}

foreach ($tool in $preReqs.Keys) {
    if ($preReqs[$tool]) {
        Write-Host "  ✅ $tool installed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $tool not found" -ForegroundColor Red
    }
}

# Test 2: Project counts
Write-Host "`n2. Monorepo Projects:" -ForegroundColor Yellow
$projects = @(
    "apps\crypto-enhanced",
    "apps\vibe-tutor",
    "apps\digital-content-builder",
    "apps\business-booking-platform",
    "backend"
)

$existingProjects = 0
foreach ($project in $projects) {
    $path = "C:\dev\$project"
    if (Test-Path $path) {
        $existingProjects++
        Write-Host "  ✅ $project" -ForegroundColor Green
    }
}
Write-Host "  Total: $existingProjects projects found"

# Test 3: Quick file stats
Write-Host "`n3. Quick Stats:" -ForegroundColor Yellow
$tsFiles = (Get-ChildItem -Path "C:\dev\apps" -Include "*.ts","*.tsx" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules" }).Count
$jsFiles = (Get-ChildItem -Path "C:\dev\apps" -Include "*.js","*.jsx" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules" }).Count

Write-Host "  TypeScript files: $tsFiles"
Write-Host "  JavaScript files: $jsFiles"

# Test 4: Disk usage
Write-Host "`n4. Disk Usage:" -ForegroundColor Yellow
$cDrive = Get-PSDrive C
$dDrive = Get-PSDrive D -ErrorAction SilentlyContinue

$cPercent = [math]::Round($cDrive.Used / ($cDrive.Used + $cDrive.Free) * 100, 1)
Write-Host "  C:\ $([math]::Round($cDrive.Used/1GB, 2))GB / $([math]::Round(($cDrive.Used + $cDrive.Free)/1GB, 2))GB ($cPercent%)"

if ($dDrive) {
    $dPercent = [math]::Round($dDrive.Used / ($dDrive.Used + $dDrive.Free) * 100, 1)
    Write-Host "  D:\ $([math]::Round($dDrive.Used/1GB, 2))GB / $([math]::Round(($dDrive.Used + $dDrive.Free)/1GB, 2))GB ($dPercent%)"
}

# Test 5: Available commands
Write-Host "`n5. PowerShell Shortcuts Available:" -ForegroundColor Yellow
$shortcuts = @(
    "cdev - Navigate to C:\dev",
    "dlogs - Navigate to D:\logs",
    "gs - git status",
    "nxdev <project> - Start dev server",
    "nxbuild - Build all projects"
)

foreach ($shortcut in $shortcuts) {
    Write-Host "  • $shortcut" -ForegroundColor Cyan
}

Write-Host "`n✅ Testing complete!" -ForegroundColor Green
Write-Host "You can now use these commands in your PowerShell session." -ForegroundColor Gray