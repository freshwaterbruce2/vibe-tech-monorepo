# Claude Desktop Integration Instructions

## Overview

Desktop Commander v3 is now ready for integration with Claude Desktop as an MCP server. This provides Claude with 30+ desktop automation tools for Windows 11.

## Step 1: Locate Claude Desktop Config

**Windows Path:** `%APPDATA%\Claude\claude_desktop_config.json`

**Full Path Example:** `C:\Users\{USERNAME}\AppData\Roaming\Claude\claude_desktop_config.json`

**How to Open:**

1. Press `Win + R`
2. Type: `%APPDATA%\Claude`
3. Press Enter
4. Look for `claude_desktop_config.json`

If the file does not exist, create it with the contents from Step 2.

## Step 2: Add Desktop Commander MCP Server

Add this configuration to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "node",
      "args": ["C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important Notes:**

- Use double backslashes (`\\`) in Windows paths
- Ensure the path to `dist/mcp.js` matches your installation directory
- If you have other MCP servers, add this as another entry in `mcpServers`

## Step 3: Restart Claude Desktop

1. **Close Claude Desktop completely** (not just the window)

   - Right-click the system tray icon (if present)
   - Select "Quit" or "Exit"
   - OR: Close all Claude windows and wait 10 seconds

2. **Verify closure:**

   - Open Task Manager (`Ctrl+Shift+Esc`)
   - Check that no "Claude" processes are running
   - If still running, end the process

3. **Restart Claude Desktop**
   - Launch Claude Desktop normally

## Step 4: Verify Integration

In Claude Desktop, try these test commands:

### Test 1: System Information

```
Get my system information
```

**Expected Result:**
Claude should use `dc_get_system_info` tool and return CPU, memory, and OS details.

### Test 2: List Files

```
List files in C:\dev
```

**Expected Result:**
Claude should use `dc_list_directory` tool and show files/folders in C:\dev.

### Test 3: Read File

```
Read the file C:\dev\README.md
```

**Expected Result:**
Claude should use `dc_read_file` tool and show file contents.

### Test 4: Get Processes

```
Show me my running processes (limit 10)
```

**Expected Result:**
Claude should use `dc_list_processes` tool and list active processes.

## Available Tools (30+)

### System Tools (Auto-Approve)

- `dc_get_system_info` - CPU, memory, OS info
- `dc_get_cpu` - CPU load
- `dc_get_mem` - Memory usage
- `dc_get_battery` - Battery status
- `dc_get_network` - Network interfaces
- `dc_get_disks` - Disk usage
- `dc_list_processes` - Running processes

### File Operations (Mixed Permissions)

- `dc_read_file` - Read file (auto-approve)
- `dc_write_file` - Write file (auto-approve)
- `dc_list_directory` - List directory (auto-approve)
- `dc_delete_file` - Delete file (requires confirmation)
- `dc_move_file` - Move/rename file (auto-approve)
- `dc_copy_file` - Copy file (auto-approve)
- `dc_copy_directory_robocopy` - Fast directory copy via robocopy (auto-approve; mirror requires confirmation)
- `dc_get_file_info` - File metadata (auto-approve)
- `dc_get_item_attributes` - Windows attributes + timestamps + symlink info (auto-approve)
- `dc_get_acl` - Windows ACL (auto-approve)
- `dc_get_file_hash` - File hash (SHA256 default) (auto-approve)
- `dc_get_long_paths_status` - Check LongPathsEnabled setting (auto-approve)
- `dc_search_files` - Search by pattern (auto-approve)
- `dc_search_content` - Search file contents (auto-approve)

#### Windows filesystem examples

These examples show the exact arguments Desktop Commander expects for the Windows-optimized file tools.

**Get a file hash (SHA256 default):**

```json
{
  "path": "C:\\dev\\README.md",
  "algorithm": "sha256"
}
```

**Get Windows ACL (Get-Acl):**

```json
{
  "path": "C:\\dev\\apps\\desktop-commander-v3"
}
```

**Get Windows attributes and timestamps (Get-Item):**

```json
{
  "path": "C:\\dev\\apps\\desktop-commander-v3\\package.json"
}
```

**Check long path support (LongPathsEnabled):**

```json
{}
```

**Robust directory copy (robocopy /E):**

```json
{
  "source": "C:\\dev\\apps\\desktop-commander-v3",
  "destination": "D:\\backups\\desktop-commander-v3",
  "threads": 16,
  "restartable": true,
  "unbuffered": false,
  "copySecurity": false,
  "mirror": false,
  "maxRetries": 2,
  "waitSeconds": 1
}
```

**Robocopy mirror (robocopy /MIR) — destructive:**

When `mirror=true`, robocopy will delete files in the destination that do not exist in the source. Desktop Commander requires `confirmDangerous=true` to proceed.

```json
{
  "source": "C:\\dev\\apps\\desktop-commander-v3",
  "destination": "D:\\backups\\desktop-commander-v3",
  "mirror": true,
  "confirmDangerous": true
}
```

**Interpreting robocopy results:**

Robocopy exit codes `0-7` are considered success (including some copy mismatches). Exit codes `>=8` indicate failure.

### Window Management

- `dc_list_windows` - List open windows (auto-approve)
- `dc_get_active_window` - Get active window (auto-approve)
- `dc_window_action` - Minimize/maximize/close (auto-approve)
- `dc_launch_app` - Launch application (auto-approve for whitelisted apps)
- `dc_terminate_app` - Kill process (requires confirmation)

### Web Tools

- `dc_fetch_url` - HTTP GET/HEAD requests (auto-approve)
- `dc_web_search` - DuckDuckGo search (auto-approve)
- `dc_open_url` - Open URL in browser (auto-approve)

### Clipboard & Input

- `dc_get_clipboard` - Read clipboard (auto-approve)
- `dc_set_clipboard` - Write clipboard (auto-approve)
- `dc_clear_clipboard` - Clear clipboard (auto-approve)

### System Control

- `dc_set_volume` - Volume up/down/mute (auto-approve)
- `dc_set_brightness` - Set screen brightness (auto-approve)
- `dc_run_powershell` - Run whitelisted PowerShell (auto-approve)
- `dc_run_powershell_unsafe` - Unrestricted PowerShell (requires confirmation)

### Advanced Tools

- `dc_take_screenshot` - Screenshot (auto-approve)
- `dc_screenshot_window` - Window screenshot (auto-approve)
- `dc_record_screen` - Screen recording (auto-approve)

## Security & Permissions

### Allowed Paths

Desktop Commander enforces strict path validation:

- **C:\dev** - Full read/write access (development workspace)
- \*\*D:\*\* - Full read/write access (databases, learning system, large files)
- **C:\Users\fresh_zxae3v6\OneDrive** - Read-only access

All file operations outside these paths will be rejected.

### Auto-Approve vs. Always-Ask

**Auto-Approve (Safe Operations):**

- Reading files
- Listing directories
- System information retrieval
- Process listing
- Window management (except terminate)
- Web requests (HTTP/HTTPS only)

**Always-Ask (Dangerous Operations):**

- Deleting files (`dc_delete_file`)
- Terminating processes (`dc_terminate_app`)
- Unrestricted PowerShell (`dc_run_powershell_unsafe`)

### Blocked Commands

The following commands are completely blocked:

- File system formatting: `format`, `mkfs`, `diskpart`, `fdisk`
- System modifications: `shutdown`, `reboot`, `passwd`, `useradd`
- Network changes: `iptables`, `netsh`, `firewall-cmd`
- Registry edits: `reg`, `regedit`

## Troubleshooting

### Issue: MCP Server Not Appearing

**Solution:**

1. Check that `dist/mcp.js` exists in `C:\dev\apps\desktop-commander-v3\dist\`
2. If missing, rebuild: `cd C:\dev\apps\desktop-commander-v3 && corepack pnpm run build`
3. Verify Node.js is installed: `node --version` (requires v18+)
4. Check JSON syntax in `claude_desktop_config.json` (use JSON validator)

### Issue: "Access Denied" Errors

**Solution:**

1. Verify the file path is within allowed directories (C:\dev, D:\, OneDrive)
2. Check Windows file permissions for the target file
3. Run: `icacls <path>` to check permissions

### Issue: Tools Not Working

**Solution:**

1. Check Claude Desktop logs:
   - Location: `%APPDATA%\Claude\logs\`
   - Look for MCP server errors
2. Test MCP server manually:

   ```powershell
   cd C:\dev\apps\desktop-commander-v3
   node dist/mcp.js
   ```

   - Should show: `MCP Server initialized`
   - Press Ctrl+C to exit

### Issue: PowerShell Commands Blocked

**Solution:**
Only whitelisted PowerShell commands are allowed by default. To enable unrestricted PowerShell:

1. Set environment variable:

   ```powershell
   $env:DC_ALLOW_UNSAFE_POWERSHELL = "1"
   ```

2. Restart Claude Desktop

3. Use `dc_run_powershell_unsafe` tool (requires confirmation)

**Warning:** Unrestricted PowerShell can execute dangerous commands. Only enable if you trust the AI agent.

## Performance Tips

### Optimize for Large Directories

When listing directories with many files:

```
List C:\dev but limit to 100 files
```

This uses the `limit` parameter to avoid performance issues.

### Batch File Operations

Use batch tools when possible:

- `dc_read_files` - Read multiple files at once
- `dc_write_files` - Write multiple files atomically
- `dc_search_files` - Search with patterns

### Timeout Configuration

For long-running operations, the default timeout is 30 seconds. If operations are timing out, you may need to:

1. Split large operations into smaller chunks
2. Use file size limits (`maxBytes` parameter)

## Advanced Configuration

### Custom Allowed Paths

To add more allowed paths, edit `src/PathValidator.ts` and rebuild:

```typescript
const allowedPaths = [
  { path: "C:\\dev", permission: "readwrite" },
  { path: "D:\\", permission: "readwrite" },
  { path: "C:\\MyCustomPath", permission: "readwrite" }, // Add here
];
```

Then rebuild:

```bash
npm run build
```

### Environment Variables

Configure Desktop Commander with environment variables:

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "node",
      "args": ["C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"],
      "env": {
        "NODE_ENV": "production",
        "DC_ALLOW_UNSAFE_POWERSHELL": "0",
        "DC_MAX_FILE_SIZE": "10485760",
        "DC_LOG_LEVEL": "info"
      }
    }
  }
}
```

## Support & Documentation

**Project Documentation:**

- Main README: `C:\dev\apps\desktop-commander-v3\README.md`
- File Operations: `C:\dev\apps\desktop-commander-v3\FILE_OPS_DOCS.md`
- Permissions Guide: `C:\dev\apps\desktop-commander-v3\PERMISSIONS_GUIDE.md`
- MCP Config: `C:\dev\apps\desktop-commander-v3\MCP_CONFIG.json`

**Security Best Practices:**

1. Never disable path validation
2. Review auto-approve list before enabling unsafe PowerShell
3. Regularly check Claude Desktop logs for suspicious activity
4. Use read-only paths when possible

**Updating Desktop Commander:**

```bash
cd C:\dev\apps\desktop-commander-v3
git pull
npm install
npm run build
# Restart Claude Desktop
```

## Success Checklist

After completing setup, verify:

- [ ] Claude Desktop config file updated
- [ ] Claude Desktop restarted successfully
- [ ] System info tool works (`dc_get_system_info`)
- [ ] File reading works (`dc_read_file` on C:\dev)
- [ ] Directory listing works (`dc_list_directory`)
- [ ] No errors in Claude Desktop logs
- [ ] Auto-approve and always-ask permissions working as expected

---

**Version:** 1.0.0
**Last Updated:** 2026-01-02
**Platform:** Windows 11 only
**Node.js:** v18.0.0 or higher required
**MCP SDK:** v1.20.2
