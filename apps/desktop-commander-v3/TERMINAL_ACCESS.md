# Desktop Commander v3 - Terminal Access

## Overview

Desktop Commander v3 now provides **unrestricted terminal access** to both PowerShell and Command Prompt for AI agents like Claude Desktop.

## Security Warning

⚠️ **IMPORTANT SECURITY NOTICE** ⚠️

These tools execute **arbitrary commands** on your Windows 11 system. Only use with:
- Trusted AI agents (Claude Desktop, etc.)
- Controlled environments
- Systems you control

**Never expose this MCP server to:**
- Untrusted users
- Public networks
- Production systems without proper security review

---

## Available Tools

### 1. PowerShell Access

**Tool Name:** `dc_run_powershell`

**Description:** Execute any PowerShell command with full system access.

**Parameters:**
- `command` (required): PowerShell command to execute
- `timeout` (optional): Max execution time in milliseconds (default: 60000 = 60 seconds)

**Returns:**
```json
{
  "output": "command output",
  "success": true,
  "exitCode": 0
}
```

**Examples:**

```typescript
// Get all running processes
dc_run_powershell {
  "command": "Get-Process | Select-Object Name, CPU | Sort-Object CPU -Descending | Select-Object -First 10"
}

// Check disk space
dc_run_powershell {
  "command": "Get-Volume | Format-Table -AutoSize"
}

// Install a package
dc_run_powershell {
  "command": "winget install Microsoft.PowerShell",
  "timeout": 120000
}

// Run a script
dc_run_powershell {
  "command": "C:\\scripts\\backup.ps1 -Force"
}

// Multi-line complex command
dc_run_powershell {
  "command": "$services = Get-Service | Where-Object {$_.Status -eq 'Running'}; $services | Format-Table Name, Status"
}
```

---

### 2. Command Prompt Access

**Tool Name:** `dc_run_cmd`

**Description:** Execute any Command Prompt (cmd.exe) command with full system access.

**Parameters:**
- `command` (required): CMD command to execute
- `timeout` (optional): Max execution time in milliseconds (default: 60000 = 60 seconds)

**Returns:**
```json
{
  "output": "command output",
  "success": true,
  "exitCode": 0
}
```

**Examples:**

```typescript
// Directory listing
dc_run_cmd {
  "command": "dir C:\\dev /s /b"
}

// System information
dc_run_cmd {
  "command": "systeminfo"
}

// Network configuration
dc_run_cmd {
  "command": "ipconfig /all"
}

// Run batch file
dc_run_cmd {
  "command": "C:\\scripts\\build.bat"
}

// Chain commands
dc_run_cmd {
  "command": "cd C:\\dev && npm install && npm run build"
}
```

---

## Key Features

### Unrestricted Access
- ✅ No command allow-list
- ✅ Can run scripts (.ps1, .bat, .cmd)
- ✅ Full PowerShell module support
- ✅ System administration commands
- ✅ Package managers (winget, choco, scoop)

### Performance
- **Buffer:** 50MB max output (handles large results)
- **Timeout:** Configurable, default 60 seconds
- **Async:** Non-blocking execution
- **Error Handling:** Returns stderr + exit codes

### Security Features
- ✅ Empty command validation
- ✅ Timeout protection (prevents hanging)
- ✅ Windows-only (won't run on Linux/macOS)
- ✅ Hidden windows (no UI popups)

---

## Common Use Cases

### 1. Package Management

```powershell
# Install PowerShell module
dc_run_powershell {
  "command": "Install-Module -Name PSReadLine -Force"
}

# Winget install
dc_run_powershell {
  "command": "winget install -e --id Git.Git"
}
```

### 2. File Operations

```powershell
# Bulk file operations
dc_run_powershell {
  "command": "Get-ChildItem C:\\logs -Filter *.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item"
}

# Robocopy (CMD)
dc_run_cmd {
  "command": "robocopy C:\\source D:\\backup /MIR /R:2 /W:1"
}
```

### 3. System Administration

```powershell
# Service management
dc_run_powershell {
  "command": "Restart-Service -Name W32Time -Force"
}

# Task scheduler
dc_run_cmd {
  "command": "schtasks /create /tn 'MyTask' /tr 'C:\\scripts\\task.ps1' /sc daily /st 09:00"
}
```

### 4. Development Operations

```powershell
# Git operations
dc_run_cmd {
  "command": "cd C:\\dev && git status && git pull"
}

# Build and test
dc_run_powershell {
  "command": "cd C:\\dev; pnpm install; pnpm run build; pnpm run test",
  "timeout": 180000
}

# Docker
dc_run_cmd {
  "command": "docker ps -a"
}
```

### 5. Network Operations

```powershell
# Connectivity check
dc_run_powershell {
  "command": "Test-Connection google.com -Count 4"
}

# Port scanning
dc_run_cmd {
  "command": "netstat -ano | findstr :8080"
}
```

---

## Error Handling

Both tools return structured error information:

```json
{
  "output": "Error message from stderr",
  "success": false,
  "exitCode": 1
}
```

**Common error codes:**
- `0` - Success
- `1` - General error
- `2` - Command not found
- `5` - Access denied
- `9009` - File/command not found (CMD)

---

## Best Practices

### 1. Use Appropriate Shell

**PowerShell** for:
- Object-oriented operations
- .NET/Windows APIs
- Complex scripting
- Modern Windows administration

**CMD** for:
- Legacy batch files
- Simple file operations
- Tools that require CMD environment
- Compatibility with old scripts

### 2. Quote Handling

```powershell
# PowerShell - use single quotes inside command
dc_run_powershell {
  "command": "Get-Process | Where-Object {$_.Name -like 'node*'}"
}

# CMD - escape quotes carefully
dc_run_cmd {
  "command": "echo \"Hello World\""
}
```

### 3. Timeout Management

```powershell
# Quick operations - use default
dc_run_powershell {
  "command": "Get-Service"
}

# Long operations - increase timeout
dc_run_powershell {
  "command": "Install-Module -Name Az -Force",
  "timeout": 300000
}
```

### 4. Path Handling

```powershell
# Use absolute paths
dc_run_cmd {
  "command": "cd C:\\dev && npm install"
}

# Or PowerShell Set-Location
dc_run_powershell {
  "command": "Set-Location C:\\dev; npm install"
}
```

---

## Limitations

1. **No interactive commands** - Commands requiring user input will hang until timeout
2. **No elevation prompt** - Cannot trigger UAC elevation (must run as admin)
3. **Buffer limit** - 50MB max output (large outputs will truncate)
4. **Timeout enforced** - Max 60 seconds default (configurable)
5. **Windows only** - PowerShell/CMD are Windows-specific

---

## Troubleshooting

### Command Hangs

**Cause:** Interactive command waiting for input

**Solution:** Add `-Confirm:$false` or `-Force` flags

```powershell
dc_run_powershell {
  "command": "Remove-Item C:\\temp\\* -Recurse -Force"
}
```

### Permission Denied

**Cause:** Insufficient privileges

**Solution:** Run MCP server as Administrator, or use commands that don't require elevation

### Output Truncated

**Cause:** Output exceeds 50MB buffer

**Solution:** Filter output or redirect to file

```powershell
dc_run_powershell {
  "command": "Get-Process | Select-Object -First 100"
}
```

---

## Security Recommendations

1. **Run in sandboxed environment** when testing untrusted AI agents
2. **Monitor command execution** via logs
3. **Use Windows Defender** to scan executed scripts
4. **Restrict file system access** using Windows permissions
5. **Review AI agent prompts** before connecting to this MCP server
6. **Keep MCP server updated** for security patches

---

## Version History

- **v2.0.0** - Added unrestricted PowerShell and CMD access
- **v1.x** - Restricted PowerShell allow-list

---

**Last Updated:** 2026-02-05
**Author:** VibeTech Monorepo Team
