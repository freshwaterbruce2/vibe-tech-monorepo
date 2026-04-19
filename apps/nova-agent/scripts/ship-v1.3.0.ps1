# Nova Agent v1.3.0 Ship Playbook
# Run from C:\dev in PowerShell 7+. Copy-paste in stages; each stage is idempotent.
# Mirrors the release checklist in RELEASE_NOTES_v1.3.0.md.

$ErrorActionPreference = 'Stop'
Set-Location C:\dev\apps\nova-agent

# ---------------------------------------------------------------------------
# Stage 0 - BACKUP (always first, per .claude rules)
# ---------------------------------------------------------------------------
if (-not (Test-Path .\_backups)) { New-Item -ItemType Directory -Path .\_backups | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
Compress-Archive `
    -Path .\src,.\src-tauri\src,.\package.json,.\tsconfig.json,.\vite.config.ts,.\playwright.config.ts,.\.stylelintrc.json,.\.husky,.\e2e `
    -DestinationPath ".\_backups\Backup_$stamp.zip"
Write-Host "BACKUP: _backups\Backup_$stamp.zip" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Stage 1 - Install deps (nova-agent only, with new devDeps for Stylelint)
# ---------------------------------------------------------------------------
Set-Location C:\dev
pnpm add -D --filter nova-agent stylelint@^17 stylelint-config-standard@^40
pnpm install --filter nova-agent --frozen-lockfile=false

# ---------------------------------------------------------------------------
# Stage 2 - Quality pass (fail-fast before rebuilding installers)
# ---------------------------------------------------------------------------
pnpm --filter nova-agent run lint
pnpm --filter nova-agent run typecheck
pnpm --filter nova-agent run lint:css
pnpm --filter nova-agent run test

# ---------------------------------------------------------------------------
# Stage 3 - Establish Playwright baselines (one-time, commit the snapshots)
# ---------------------------------------------------------------------------
# First run generates snapshots under e2e/__screenshots__/ ; commit those.
# Subsequent runs assert against them.
pnpm --filter nova-agent exec playwright install chromium
pnpm --filter nova-agent run test:visual:update
pnpm --filter nova-agent run test:visual   # should be all green now

# ---------------------------------------------------------------------------
# Stage 4 - Activate Husky pre-commit hook (one-time)
# ---------------------------------------------------------------------------
# Points git at apps/nova-agent/.husky so the pre-commit script runs.
# If other apps add their own hooks later, swap to a root-level .husky instead.
Set-Location C:\dev
git config core.hooksPath apps/nova-agent/.husky

# ---------------------------------------------------------------------------
# Stage 5 - Build Tauri release (produces MSI + NSIS installers)
# ---------------------------------------------------------------------------
Set-Location C:\dev\apps\nova-agent
pnpm run build   # = tauri build

# ---------------------------------------------------------------------------
# Stage 6 - Verify installers exist and record hashes
# ---------------------------------------------------------------------------
$msi  = Get-ChildItem .\src-tauri\target\release\bundle\msi\*.msi   -ErrorAction Stop
$nsis = Get-ChildItem .\src-tauri\target\release\bundle\nsis\*.exe  -ErrorAction Stop
Write-Host "MSI:  $($msi.FullName)  $([math]::Round($msi.Length/1MB,1)) MB"  -ForegroundColor Cyan
Write-Host "NSIS: $($nsis.FullName) $([math]::Round($nsis.Length/1MB,1)) MB" -ForegroundColor Cyan
Get-FileHash $msi.FullName, $nsis.FullName -Algorithm SHA256 |
    Format-Table -AutoSize |
    Out-File .\src-tauri\target\release\bundle\SHA256SUMS.txt
Get-Content .\src-tauri\target\release\bundle\SHA256SUMS.txt

# ---------------------------------------------------------------------------
# Stage 7 - Smoke-test the installer
# ---------------------------------------------------------------------------
# Manual step: run one of these, launch the app, confirm the dashboard loads
# with a 4-column grid at >=1024px width. Then uninstall.
#    msiexec /i "$($msi.FullName)"
#    Start-Process "$($nsis.FullName)"

# ---------------------------------------------------------------------------
# Stage 8 - Cut the GitHub release
# ---------------------------------------------------------------------------
# Requires: gh CLI authenticated against github.com/freshwaterbruce2/Monorepo (or
# wherever this repo's remote points). Tag convention: nova-agent-v1.3.0
Set-Location C:\dev
$tag = "nova-agent-v1.3.0"
git tag -a $tag -m "NOVA Agent v1.3.0"
git push origin $tag

gh release create $tag `
    --title "NOVA Agent v1.3.0" `
    --notes-file apps/nova-agent/RELEASE_NOTES_v1.3.0.md `
    "$($msi.FullName)" `
    "$($nsis.FullName)" `
    "C:\dev\apps\nova-agent\src-tauri\target\release\bundle\SHA256SUMS.txt"

Write-Host "Release $tag published." -ForegroundColor Green
