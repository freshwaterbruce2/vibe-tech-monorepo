# Claude-Specific Configuration

## MCP Tools Available

- Desktop Commander v3 - File operations
- GitHub MCP - Git operations
- Memory Bank MCP - Knowledge persistence
- Skills Server MCP - Skill library

## File Operation Rules

- Chunk writes: 25-30 lines max per write_file call
- Always use absolute paths
- Use `list_directory` before assuming file locations

## Preferences

- Direct action over explanation
- PowerShell for Windows commands
- Backup commands before destructive operations

## Context Files to Read

1. `C:\dev\WORKSPACE.json`
2. `D:\learning-system\sessions\CURRENT.md`
3. `C:\dev\docs\ai\RULES.md`
