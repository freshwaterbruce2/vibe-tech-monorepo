# Quick file size checker for 500-line limit
$files = Get-ChildItem -Path src,electron -Recurse -Include *.ts,*.tsx -File -ErrorAction SilentlyContinue

$violations = @()

foreach ($file in $files) {
    $lineCount = (Get-Content $file.FullName | Measure-Object -Line).Lines
    if ($lineCount -gt 500) {
        $violations += [PSCustomObject]@{
            File = $file.FullName.Replace("$PWD\", "")
            Lines = $lineCount
            Excess = $lineCount - 500
        }
    }
}

if ($violations.Count -eq 0) {
    Write-Host "✅ All files are under 500 lines!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Found $($violations.Count) files exceeding 500 lines:" -ForegroundColor Yellow
    $violations | Sort-Object -Property Lines -Descending | Format-Table -AutoSize
}

