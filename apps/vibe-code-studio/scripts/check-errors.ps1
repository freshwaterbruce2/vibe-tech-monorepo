# Quick TypeScript error checker
# Runs tsc and shows first 30 errors with context

Write-Host "Running TypeScript compiler..." -ForegroundColor Cyan
pnpm exec tsc --noEmit 2>&1 | Select-Object -First 30 | ForEach-Object {
    if ($_ -match "error TS") {
        Write-Host $_ -ForegroundColor Red
    } else {
        Write-Host $_
    }
}

Write-Host "`nShowing error summary..." -ForegroundColor Cyan
pnpm exec tsc --noEmit 2>&1 | Select-String "error TS" | Group-Object | Select-Object -First 10 Count, Name

