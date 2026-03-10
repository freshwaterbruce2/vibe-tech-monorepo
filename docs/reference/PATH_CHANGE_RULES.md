# PATH CHANGE RULES - Quick Reference

Read this before changing any paths.

---

## Mandatory rules

### Before Making ANY Path Change

1. **Document in AI.md**
   - Add entry to change history
   - Include rationale and impact analysis
   - Document rollback procedure

2. **Run Validation**

   Run .\check-vibe-paths.ps1 -Verbose

3. **Test Affected Projects**

   Run pnpm nx run-many -t test --projects=tag:filesystem --parallel=2

4. **Update This File**
   - Add your change to the history below

---

## Approved paths

```
C:\dev\                    # Source code ONLY
D:\learning-system\        # Learning data (NEW as of 2025-12-24)
D:\databases\              # SQLite databases
D:\logs\                   # Application logs
D:\data\                   # Other data files
```

---

## Deprecated paths

```
D:\learning\               # DEPRECATED 2025-12-24 → Use D:\learning-system\
C:\dev\data\               # NEVER store data here → Use D:\data\
C:\dev\logs\               # NEVER store logs here → Use D:\logs\
C:\dev\databases\          # NEVER store DB here → Use D:\databases\
```

---

## Change history

### 2025-12-24: D:\learning → D:\learning-system

- **Why:** Consolidation and clarity
- **Affected:** vibe-tutor, nova-agent, vibe-justice
- **Changes:** Tags only (no code changes)
- **Documented:** docs/PATH_CHANGES_2025-12-24.md

### 2026-01-19: Documentation cleanup + artifact removal

- **Why:** Remove remaining deprecated `D:\learning` references and delete accidental path-artifact files
- **Affected:** Documentation and example files only (no runtime path changes)
- **Changes:** `D:\learning` → `D:\learning-system` in docs; removed corrupted `C...` artifact files
- **Documented:** AI.md

---

## Quick validation commands

```powershell
# Check for deprecated paths
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.py,*.rs |
  Select-String "D:\\learning" |
  Select-String -NotMatch "D:\\learning-system"

# Run validation script
.\check-vibe-paths.ps1 -Verbose

# Test filesystem projects
pnpm nx run-many -t test --projects=tag:filesystem --parallel=2
```

---

## Full documentation

- **Complete Policy:** [AI.md](./AI.md)
- **Latest Changes:** [docs/PATH_CHANGES_2025-12-24.md](./docs/PATH_CHANGES_2025-12-24.md)
- **Workspace Guide:** [CLAUDE.md](./CLAUDE.md)
- **Validation Script:** [check-vibe-paths.ps1](./check-vibe-paths.ps1)

---

**Last Updated:** 2026-01-19
**Next Review:** 2026-03-24
