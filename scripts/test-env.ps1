 . (Join-Path $PSScriptRoot 'Initialize-DevProcessEnvironment.ps1')
$null = Initialize-DevProcessEnvironment

node -v
npm -v
pnpm --version
corepack --version
pnpm nx --version
