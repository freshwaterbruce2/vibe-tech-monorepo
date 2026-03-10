# Desktop Commander - Permission System Guide

## Overview

Desktop Commander now supports **auto-approval** of commands, similar to Claude Code's permission whitelist system. This dramatically reduces "permission fatigue" and speeds up your workflow.

## Configuration Location

Permissions are configured in `MCP_CONFIG.json` under the `autoApprove` and `alwaysAsk` arrays:

```json
{
  "mcpServers": {
    "desktop-commander": {
      "autoApprove": [
        "dc_read_file",
        "dc_list_directory"
      ],
      "alwaysAsk": [
        "dc_delete_file"
      ]
    }
  }
}
```

## Permission Levels

### 1. **Auto-Approve** - Zero Permission Prompts

Commands in the `autoApprove` array execute immediately without prompting.

**Safe for Auto-Approval (Read-Only Operations):**

```json
"autoApprove": [
  "dc_get_system_info",     // System information
  "dc_get_cpu",             // CPU stats
  "dc_get_mem",             // Memory stats
  "dc_list_processes",      // List processes
  "dc_list_windows",        // List windows
  "dc_get_active_window",   // Active window
  "dc_list_directory",      // Directory listing
  "dc_get_file_info",       // File metadata
  "dc_read_file",           // Read file
  "dc_read_files",          // Read multiple files
  "dc_search_files",        // Search by filename
  "dc_search_content",      // Search file contents
  "dc_get_clipboard",       // Read clipboard
  "dc_get_battery",         // Battery status
  "dc_get_network",         // Network info
  "dc_get_disks",           // Disk info
  "dc_list_cameras"         // Camera devices
]
```

**Moderate Risk (Write Operations):**

```json
"autoApprove": [
  "dc_write_file",          // Write single file
  "dc_write_files",         // Write multiple files
  "dc_apply_edits",         // Text replacements
  "dc_create_directory",    // Create folder
  "dc_move_file",           // Move/rename
  "dc_copy_file",           // Copy file
  "dc_set_clipboard",       // Write clipboard
  "dc_take_screenshot",     // Screenshot
  "dc_keyboard_type",       // Type text
  "dc_mouse_move",          // Move mouse
  "dc_mouse_click"          // Click mouse
]
```

**Advanced (Wildcards):**

```json
"autoApprove": [
  "dc_*",                   // Auto-approve ALL dc_ commands
  "dc_read_*",              // Auto-approve all read operations
  "dc_get_*"                // Auto-approve all get operations
]
```

**⚠️ DANGER - Full Trust Mode:**

```json
"autoApprove": [
  "*"                       // Auto-approve EVERYTHING (not recommended!)
]
```

### 2. **Always Ask** - Override Auto-Approval

Commands in `alwaysAsk` will ALWAYS prompt, even if they match an auto-approve pattern.

**Recommended Always-Ask List:**

```json
"alwaysAsk": [
  "dc_delete_file",         // Permanent deletion
  "dc_terminate_app",       // Kill processes
  "dc_run_powershell_unsafe", // Unrestricted PowerShell
  "dc_window_action"        // Close/minimize windows
]
```

### 3. **Default Behavior** - Prompt Every Time

Commands not in either list will prompt for permission every time.

## Recommended Configurations

### 🟢 **Conservative** (Minimal Risk)

Good for getting started while maintaining safety:

```json
{
  "autoApprove": [
    "dc_get_*",              // All read/get operations
    "dc_list_*",             // All list operations
    "dc_read_*",             // All read operations
    "dc_search_*"            // All search operations
  ],
  "alwaysAsk": [
    "dc_delete_file",
    "dc_terminate_app",
    "dc_run_powershell_unsafe"
  ]
}
```

### 🟡 **Balanced** (Speed + Safety)

For developers with git backups:

```json
{
  "autoApprove": [
    "dc_get_*",
    "dc_list_*",
    "dc_read_*",
    "dc_search_*",
    "dc_write_file",
    "dc_write_files",
    "dc_create_directory",
    "dc_move_file",
    "dc_copy_file",
    "dc_apply_edits"
  ],
  "alwaysAsk": [
    "dc_delete_file",
    "dc_terminate_app"
  ]
}
```

### 🔴 **Aggressive** (Maximum Speed)

For experienced users with comprehensive backups:

```json
{
  "autoApprove": [
    "dc_*"                   // Everything except what's in alwaysAsk
  ],
  "alwaysAsk": [
    "dc_delete_file",
    "dc_terminate_app",
    "dc_run_powershell_unsafe"
  ]
}
```

### ⚫ **Full Trust** (Zero Prompts)

Only use if you completely trust the AI and have backups:

```json
{
  "autoApprove": [
    "*"                      // EVERYTHING, NO PROMPTS EVER
  ]
}
```

## Implementation Details

### How It Works

1. When a command executes, `PermissionManager` checks if it matches `autoApprove`
2. If `alwaysAsk` contains the command, it overrides auto-approval
3. Matching supports exact names, wildcards (`*`), and patterns (`dc_read_*`)

### Pattern Matching Examples

- `"dc_read_file"` - Exact match only
- `"dc_read_*"` - Matches dc_read_file, dc_read_files, etc.
- `"dc_*"` - Matches all dc_ commands
- `"*"` - Matches everything

### Reloading Permissions

Permissions are loaded at startup. To reload after editing `MCP_CONFIG.json`:

1. Stop the MCP server
2. Edit `MCP_CONFIG.json`
3. Restart the server (or reload Claude Desktop)

## Comparison with Claude Code

This system is designed to match Claude Code's permission behavior:

| Feature | Claude Code | Desktop Commander |
|---------|-------------|-------------------|
| Config Location | `~/.claude/settings.json` | `MCP_CONFIG.json` |
| Auto-Approve | `permissions.allow` | `autoApprove` |
| Wildcard Support | ✅ Yes | ✅ Yes |
| Pattern Matching | ✅ Yes | ✅ Yes |
| Override Safety | ❌ No | ✅ Yes (`alwaysAsk`) |

## Safety Tips

1. **Start Conservative**: Begin with just read operations auto-approved
2. **Use Git**: Keep your code in version control before auto-approving writes
3. **Review Logs**: Check logs to see what's being auto-approved
4. **Test First**: Try new auto-approvals in a test project first
5. **Always-Ask Critical**: Put dangerous operations in `alwaysAsk`

## Example Workflows

### For Development Work

```json
{
  "autoApprove": [
    "dc_get_*",
    "dc_list_*", 
    "dc_read_*",
    "dc_write_file",
    "dc_create_directory"
  ]
}
```

### For Data Analysis

```json
{
  "autoApprove": [
    "dc_read_file",
    "dc_list_directory",
    "dc_search_*",
    "dc_get_*"
  ]
}
```

### For System Monitoring

```json
{
  "autoApprove": [
    "dc_get_cpu",
    "dc_get_mem",
    "dc_list_processes",
    "dc_get_battery",
    "dc_get_network",
    "dc_get_disks"
  ]
}
```

## Logging

Permission decisions are logged:

- `✓ Auto-approved: dc_read_file` - Command was auto-approved
- `⚠️ Command "dc_delete_file" requires approval` - Command not auto-approved

## Troubleshooting

**Problem**: Commands still prompt despite being in autoApprove

- Check the exact command name matches
- Verify MCP_CONFIG.json is valid JSON
- Restart Desktop Commander after config changes

**Problem**: Dangerous commands execute without prompting

- Move them to `alwaysAsk` array
- Remove wildcard patterns if too broad

## Security Considerations

⚠️ **Auto-approving commands means the AI can execute them without your explicit permission each time.**

- Only auto-approve commands you fully trust
- Be especially careful with:
  - File deletion
  - Process termination  
  - PowerShell execution
  - System modifications
- Keep backups of important data
- Use version control for code

## Advanced: Custom Permission Logic

Want more control? You can modify `PermissionManager.ts` to add:

- Time-based restrictions
- File path-based rules
- Confirmation thresholds
- Audit logging
- Remote permission management

---

**Need Help?** Check the logs at startup to see your permission configuration loading.
