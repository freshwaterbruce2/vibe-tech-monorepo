# 🧠 Session Context Notepad

> **PROTOCOL**: This file is your persistent memory between sessions.
>
> 1. **READ** this at the start of every session to understand what was left pending.
> 2. **UPDATE** this before you finish a session or `notify_user`.
> 3. **LIMIT**: Keep this file under **200 lines**. Prune old completed items eagerly.

## 🧠 Active Context

<!-- High-level state of the system or current focus -->

- **Focus**: Debugging Vibe Tutor (Blank Screen on Phone).
- **Current Mode**: `Debugging` / `Restoration`.
- **Critical Issue**: `App.tsx` and `main.tsx` missing from `apps/vibe-tutor/src`.
- **Constraint**: Use **GitHub** for remote.

## 📝 Scratchpad

<!-- Temporary notes, partial thoughts, useful commands to remember -->

- [2026-01-22] **Autofixer Optimization**:
    - Removed Claude SDK dependency.
    - Implemented line-by-line parsing (O(N)) for large logs (3MB+).
    - Added Tier 1 (Regex) rules: `prefer-nullish-coalescing`, `prefer-optional-chain`, `no-unused-vars`.
    - **Result**: Fixed ~1120 lint errors across the workspace.
- [2026-01-19] Refactored `admin_scripts\Run-DatabaseBackup.ps1` to use valid backend.
- [2026-01-19] Found `apps/vibe-tutor/src` empty of entry points.

## ⏳ Pending Goals

<!-- Tasks that need to be picked up in the next session -->

- [x] Restore Vibe Tutor source code (Completed: 2026-01-22).
- [x] Deploy Vibe Tutor to Android device (Completed: 2026-01-22).
- [x] Fix "React is not defined" blank screen on Android (Completed: 2026-01-23).
- [ ] Monitor `database-backup.ps1` execution over the next few days.
- [ ] Consolidate empty databases in `D:\databases` using `consolidate-databases.ps1` (Pending user approval).
