# fix-electron-as-any.ps1
# Removes unnecessary 'as any' casts from window.electron usage
# Author: Claude Architect
# Date: 2026-01-25

$ErrorActionPreference = "Stop"
$Root = "C:\dev\apps\vibe-code-studio\src"

Write-Host "=== Fixing window.electron 'as any' casts ===" -ForegroundColor Cyan

# Files to fix
$filesToFix = @(
    "$Root\components\PerformanceMonitor.tsx"
)

foreach ($file in $filesToFix) {
    if (Test-Path $file) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw
        
        # Replace patterns
        $content = $content -replace '\(window\.electron as any\)\?\.ipc', 'window.electron?.ipc'
        $content = $content -replace '\(window\.electron as any\)\.ipc', 'window.electron?.ipc'
        $content = $content -replace '_: any, metrics:', '_event: unknown, metrics:'
        
        Set-Content $file -Value $content -NoNewline
        Write-Host "  Fixed: $file" -ForegroundColor Green
    } else {
        Write-Host "  Not found: $file" -ForegroundColor Red
    }
}

Write-Host "`n=== Fixes Applied ===" -ForegroundColor Cyan
Write-Host "Run 'pnpm nx run vibe-code-studio:typecheck' to verify" -ForegroundColor White
