param(
    [int]$First = 20
)

$ErrorActionPreference = 'Stop'


$include = @('*.ts', '*.tsx', '*.py', '*.rs', '*.json', '*.ps1')
$excludeRegex = '(\\node_modules\\|\\dist\\|\\build\\|\\target\\|\\.git\\)'
$excludePathRegex = '(\\scripts\\check-vibe-paths\.ps1$|\\scripts\\search-deprecated-paths\.ps1$)'

# Only scan source/code areas (docs may intentionally mention deprecated paths)
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$searchRoots = @(
    (Join-Path $repoRoot 'apps')
    (Join-Path $repoRoot 'packages')
    (Join-Path $repoRoot 'backend')
    (Join-Path $repoRoot 'scripts')
) | Where-Object { Test-Path -LiteralPath $_ }

$files = foreach ($root in $searchRoots) {
    Get-ChildItem -LiteralPath $root -Recurse -File -Include $include -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch $excludeRegex -and $_.FullName -notmatch $excludePathRegex }
}

$deprecatedPattern = 'D:\\\\learning(?!-system)'

$matches = $files |
Select-String -Pattern $deprecatedPattern -ErrorAction SilentlyContinue

$matches |
Select-Object -First $First |
ForEach-Object {
    $preview = $_.Line
    if ($preview.Length -gt 200) { $preview = $preview.Substring(0, 200) + '...' }
    '{0}:{1}:{2}' -f $_.Path, $_.LineNumber, $preview.Trim()
}

if ($matches) {
    exit 1
}

exit 0
