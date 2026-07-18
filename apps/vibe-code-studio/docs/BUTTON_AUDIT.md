# Chrome button audit (Wave 3)

**Date:** 2026-07-15  
**Scope:** TitleBar, StatusBar, Sidebar, AIChat main controls + keyboard/palette.

## Summary

| Area      | Click handlers                       | Notes                                                    |
| --------- | ------------------------------------ | -------------------------------------------------------- |
| TitleBar  | All wired from AppLayout             | Shortcut _labels_ now match global bindings where listed |
| StatusBar | Chat / Agent / Tasks / Review        | Review gated by flag                                     |
| Sidebar   | Explorer CRUD + footer               | Wired                                                    |
| AIChat    | Mode, send, cancel, clear, approvals | Wired                                                    |

## Wave 3 fixes applied

1. **Palette AI Chat** opens in **chat** mode (same as StatusBar Chat).
2. **Palette “Open Coding Agent”** → agent mode (`Ctrl+Shift+A`).
3. **Global shortcuts** bound: Ctrl+N/O/B/L/T/S (shift combos), Ctrl+,, save-all.
4. **Ctrl+K** no longer `preventDefault` on bare key — Editor Cmd+K inline edit works; chord Ctrl+K then Ctrl+S still opens shortcuts help.
5. **Shortcut collisions fixed** in palette labels: Generate Tests → `Ctrl+Alt+T`; Fix Bugs → `Ctrl+Alt+B`; Tasks own `Ctrl+Shift+T`.
6. Deleted orphan **`useInlineEdit`** (Editor path already uses InlineEditWidget).

## Intentional non-bugs

- Find/Replace menu items both open global search (not Monaco find).
- Review button absent unless `VITE_ENABLE_REVIEW_AGENTS=true`.
- TitleBar Find does not seed replace mode.

## Remaining (optional Wave 5)

- Bind Ctrl+Shift+V / Ctrl+Shift+I for preview / screenshot if desired.
- Seed replace mode when Edit → Replace is chosen.
- Wire or delete unused `Sidebar/*` panels (AgentPanel clones).
