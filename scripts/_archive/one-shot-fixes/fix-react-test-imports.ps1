# Fix Outdated React Imports in Test Files
# Removes 'import React from "react"' lines (React 19+ doesn't need it)
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
    'apps\vibe-code-studio\.deploy-test\.deploy\src\__tests__\integration\BasicComponents.integration.test.tsx',
    'apps\vibe-code-studio\.deploy-test\src\__tests__\integration\BasicComponents.integration.test.tsx',
    'apps\vibe-code-studio\.deploy\src\__tests__\integration\BasicComponents.integration.test.tsx',
    'apps\vibe-code-studio\.deploy-test\.deploy\src\__tests__\components\VirtualList.test.tsx',
    'apps\vibe-code-studio\.deploy-test\src\__tests__\components\VirtualList.test.tsx',
    'apps\vibe-code-studio\.deploy\src\__tests__\components\VirtualList.test.tsx',
    'apps\vibe-code-studio\.deploy-test\.deploy\src\__tests__\components\GlobalSearch.test.tsx',
    'apps\vibe-code-studio\.deploy-test\src\__tests__\components\GlobalSearch.test.tsx',
    'apps\vibe-code-studio\.deploy\src\__tests__\components\GlobalSearch.test.tsx',
    'apps\vibe-code-studio\.deploy-test\.deploy\src\__tests__\components\ErrorBoundary.test.tsx',
    'apps\vibe-code-studio\.deploy-test\src\__tests__\components\ErrorBoundary.test.tsx',
    'apps\vibe-code-studio\.deploy\src\__tests__\components\ErrorBoundary.test.tsx',
    'apps\vibe-code-studio\.deploy-test\.deploy\src\__tests__\components\AICodeEditor.test.tsx',
    'apps\vibe-code-studio\.deploy-test\src\__tests__\components\AICodeEditor.test.tsx',
    'apps\vibe-code-studio\.deploy\src\__tests__\components\AICodeEditor.test.tsx',
    'apps\vibe-subscription-guard\__tests__\components\ExampleComponent.test.tsx',
    'apps\shipping-pwa\src\components\voice\__tests__\VoiceCommandButton.test.tsx'
)

$fixedCount = 0
$skippedCount = 0

foreach ($file in $files) {
    $fullPath = Join-Path 'C:\dev' $file

    if (-not (Test-Path $fullPath)) {
        Write-Host "⚠️  Skipped (not found): $file" -ForegroundColor Yellow
        $skippedCount++
        continue
    }

    $content = Get-Content $fullPath -Raw
    $originalContent = $content

    # Remove standalone "import React from 'react'" or "import React from "react""
    $content = $content -replace "^import React from ['\`"]react['\`"];?\r?\n", ""

    # Remove "import React, { ... }" and keep only "import { ... }"
    $content = $content -replace "import React,\s*(\{[^}]+\})\s*from\s+['\`"]react['\`"]", "import `$1 from 'react'"

    if ($content -ne $originalContent) {
        Set-Content $fullPath $content -NoNewline
        Write-Host "✅ Fixed: $file" -ForegroundColor Green
        $fixedCount++
    } else {
        Write-Host "ℹ️  No changes needed: $file" -ForegroundColor Cyan
    }
}

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "Summary:" -ForegroundColor Magenta
Write-Host "  Fixed: $fixedCount files" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount files" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Magenta

if ($fixedCount -gt 0) {
    Write-Host "✅ React import fixes complete!" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: pnpm run lint --fix" -ForegroundColor White
    Write-Host "  2. Run: pnpm run test:unit" -ForegroundColor White
    Write-Host "  3. Verify no TypeScript errors" -ForegroundColor White
}
