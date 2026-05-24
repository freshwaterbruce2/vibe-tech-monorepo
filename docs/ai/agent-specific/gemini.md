# Gemini-Specific Configuration

## MCP Tools Available

- `desktop-commander` — System, CLI, and utility operations
- `filesystem` — File reading and editing
- `notebooklm` — Document and research utility

## File Operation Rules

- **Chunk Writes**: Larger file chunk writes are permitted (up to 200–300 lines) when modifying code compared to Claude, but still prefer targeted replacements over full-file overwrites.
- **Paths**: Always use **absolute paths** when referencing files or folders.
- **Progress Tracking**: Always create and update a `task.md` artifact in the active conversation artifact directory to track progress.

## Workspace & Development Preferences

- **Session Context**: Always read `WORKSPACE.json` and `CURRENT.md` at the start of a session.
- **Shell Commands**: Use PowerShell 7+. Chain commands with semicolons (`;`) rather than `&&`.
- **Package Manager**: pnpm only (store at `D:\pnpm-store`). Do not invoke `npm` or `yarn` in scripts.
- **Code standards**: Adhere to the soft 500-line limit per file. Split components early.
- **Backups**: Backup files before performing destructive modifications:
  ```powershell
  Compress-Archive -Path .\src -DestinationPath .\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip
  ```

## Context Files to Read

1. `C:\dev\WORKSPACE.json`
2. `D:\learning-system\sessions\CURRENT.md`
3. `C:\dev\docs\ai\RULES.md`
4. `C:\dev\AI.md`
