# Version Control

## Git Remote

- **Remote:** `https://github.com/freshwaterbruce2/vibe-tech-monorepo.git` (private)
- **CI/CD:** GitHub Actions (`.github/workflows/`)
- **Privacy:** 2FA enabled, fine-grained PATs, secret scanning on

## Local Backup: D:\ Snapshots

PowerShell-based local snapshots at `D:\repositories\vibetech`. Use before risky changes.

```powershell
cd C:\dev\scripts\version-control
.\Save-Snapshot.ps1 -Description "Before migration"
.\List-Snapshots.ps1
.\Restore-Snapshot.ps1 -SnapshotId "20260119-121005"
```

Full docs: `.claude/rules/d-drive-version-control.md`

## Merge & Commit Rules

- Merge to main every 10 commits (see `git-workflow.md`)
- Pre-commit hooks run automatically (see `git-workflow.md`)
- Bypass only in emergencies: `git commit --no-verify -m "emergency fix"`
