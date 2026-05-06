# Pre-Commit Hooks Setup Guide

## Overview

This workspace uses the native Git hook at `.git/hooks/pre-commit` plus the
tracked PowerShell implementation in `scripts/pre-commit.ps1`.

The hook currently enforces:

- no direct commits to `main`, `master`, or `develop`
- active-project lock boundaries from `D:/active-project/active-project.json`
- Nx affected lint for staged JS/TS files
- Nx affected typecheck for staged TS/TSX files
- a 5 MB staged-file size guard

## Current Setup

The local hook should call the tracked script:

```sh
pwsh.exe -NoProfile -ExecutionPolicy Bypass -File "C:/dev/scripts/pre-commit.ps1"
```

The tracked script uses pnpm and Nx only:

```powershell
pnpm exec nx affected -t lint --files="<staged-files>" --outputStyle=static
pnpm exec nx affected -t typecheck --files="<staged-files>" --outputStyle=static
```

This replaces the older npm/Husky guidance and the previous
`bash -c 'tsc --noEmit || true'` lint-staged command that masked typecheck
failures on Windows.

## lint-staged

The repo still keeps `.lintstagedrc.json` for editors and optional local flows:

```json
{
  "*.{js,jsx,ts,tsx,mjs,cjs}": ["pnpm exec eslint --fix --max-warnings 0"],
  "*.{ts,tsx}": ["pnpm exec nx affected -t typecheck --files"],
  "*.{json,md,yml,yaml}": ["pnpm exec prettier --write"]
}
```

Run it manually with:

```powershell
pnpm exec lint-staged
```

## Manual Checks

Use these commands when validating before a larger commit:

```powershell
pnpm run sync:audit:report
pnpm run quality:affected
pnpm run workspace:health
```

## Bypass Hooks

Use `git commit --no-verify` only for emergency recovery. If a hook failure is
wrong, fix `scripts/pre-commit.ps1` or the relevant Nx target instead of
normalizing bypasses.

---

**Last Updated:** May 4, 2026
**Status:** Active native hook plus tracked PowerShell implementation
