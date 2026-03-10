# Fix Outdated React Imports in Test Files (React 19+)
# Removes unnecessary 'import React from "react"' lines
# Created: 2026-01-25

$files = @(
    'apps\vibe-tutor\src\components\features\__tests__\ChatWindow.test.tsx',
    'apps\vibe-tutor\src\components\dashboard\__tests__\HomeworkDashboard.test.tsx',
    'apps\shipping-pwa\src\components\__tests__\ErrorBoundary.test.tsx',
    'apps\vibe-code-studio\src\__tests__\integration\BasicComponents.integration.test.tsx',
    'apps\nova-agent\src\components\ui\__tests__\sidebar.test.tsx',
    'apps\vibe-code-studio\src\__tests__\components\ErrorBoundary.test.tsx',
    'apps\vibe-code-studio\src\__tests__\components\VirtualList.test.tsx',
    'apps\vibe-code-studio\src\__tests__\components\GlobalSearch.test.tsx',
    'apps\vibe-code-studio\src\__tests__\components\AICodeEditor.test.tsx',
    'apps\vibe-subscription-guard\__tests__\components\ExampleComponent.test.tsx',
    'apps\shipping-pwa\src\components\voice\__tests__\VoiceCommandButton.test.tsx'
)

$fixedCount = 0
$skippedCount = 0

Write-Host "Starting React import cleanup..." -ForegroundColor Cyan

foreach ($file in $files) {
    $fullPath = Join-Path 'C:\dev' $file

    if (-not (Test-Path $fullPath)) {
        Write-Host "Skipped (not found): $file" -ForegroundColor Yellow
        $skippedCount++
        continue
    }

    $lines = Get-Content $fullPath
    $newLines = @()
    $changed = $false

    foreach ($line in $lines) {
        # Skip lines that are standalone React default imports
        if ($line -match "^import React from ['\`"]react['\`"];?$") {
            $changed = $true
            continue
        }

        # Transform "import React, { ... }" to "import { ... }"
        if ($line -match "^import React,\s*(\{[^}]+\})\s*from\s+['\`"]react['\`"]") {
            $line = $line -replace "import React,\s*", "import "
            $changed = $true
        }

        $newLines += $line
    }

    if ($changed) {
        $newLines | Set-Content $fullPath
        Write-Host "Fixed: $file" -ForegroundColor Green
        $fixedCount++
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Summary:"
Write-Host "  Fixed: $fixedCount files" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount files" -ForegroundColor Yellow
Write-Host "========================================"

if ($fixedCount -gt 0) {
    Write-Host ""
    Write-Host "React import fixes complete!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: pnpm run lint --fix"
    Write-Host "  2. Run: pnpm run test:unit"
    Write-Host "  3. Verify no TypeScript errors"
}
