# Fix Jest to Vitest Migration
# Replaces jest.fn() with vi.fn() and other jest patterns
# Created: 2026-01-25

Write-Host "Finding files with jest patterns..." -ForegroundColor Cyan

# Find all files with jest. patterns in shipping-pwa
$files = Get-ChildItem -Path "C:\dev\apps\shipping-pwa" -Recurse -Include "*.ts","*.tsx" |
    Where-Object { $_.FullName -notmatch "node_modules" } |
    Where-Object { (Get-Content $_.FullName -Raw) -match "jest\." }

$fixedCount = 0
$changedFiles = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    # Replace jest.fn() with vi.fn()
    $content = $content -replace "jest\.fn\(\)", "vi.fn()"

    # Replace jest.mock() with vi.mock()
    $content = $content -replace "jest\.mock\(", "vi.mock("

    # Replace jest.spyOn() with vi.spyOn()
    $content = $content -replace "jest\.spyOn\(", "vi.spyOn("

    # Replace jest.clearAllMocks() with vi.clearAllMocks()
    $content = $content -replace "jest\.clearAllMocks\(\)", "vi.clearAllMocks()"

    # Replace jest.resetAllMocks() with vi.resetAllMocks()
    $content = $content -replace "jest\.resetAllMocks\(\)", "vi.resetAllMocks()"

    # Replace jest.restoreAllMocks() with vi.restoreAllMocks()
    $content = $content -replace "jest\.restoreAllMocks\(\)", "vi.restoreAllMocks()"

    # Replace jest.useFakeTimers() with vi.useFakeTimers()
    $content = $content -replace "jest\.useFakeTimers\(\)", "vi.useFakeTimers()"

    # Replace jest.useRealTimers() with vi.useRealTimers()
    $content = $content -replace "jest\.useRealTimers\(\)", "vi.useRealTimers()"

    # Replace jest.advanceTimersByTime() with vi.advanceTimersByTime()
    $content = $content -replace "jest\.advanceTimersByTime\(", "vi.advanceTimersByTime("

    # Replace jest.runAllTimers() with vi.runAllTimers()
    $content = $content -replace "jest\.runAllTimers\(\)", "vi.runAllTimers()"

    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline
        $relativePath = $file.FullName.Replace("C:\dev\", "")
        Write-Host "Fixed: $relativePath" -ForegroundColor Green
        $fixedCount++
        $changedFiles += $relativePath
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "Summary:" -ForegroundColor Magenta
Write-Host "  Fixed: $fixedCount files" -ForegroundColor Green
Write-Host "========================================"

if ($fixedCount -gt 0) {
    Write-Host ""
    Write-Host "Files changed:" -ForegroundColor Cyan
    foreach ($file in $changedFiles) {
        Write-Host "  - $file"
    }

    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Add to setupTests.ts: import { vi } from 'vitest';"
    Write-Host "  2. Replace import '@testing-library/jest-dom' with '@testing-library/vitest-dom'"
    Write-Host "  3. Run: pnpm --filter shipping-pwa test"
    Write-Host "  4. Verify all tests pass"
}
