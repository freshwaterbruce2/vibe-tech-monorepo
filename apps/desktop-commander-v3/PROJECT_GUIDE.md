# Desktop Commander v3 - Project Guide

**Project Path:** `C:\dev\apps\desktop-commander-v3`  
**Type:** MCP (Model Context Protocol) Server  
**Version:** 0.2.28 (Currently Running!)  
**Language:** TypeScript/Node.js  
**Status:** Production

---

## 🎯 Project Overview

Model Context Protocol (MCP) server that provides Claude with powerful file system operations, terminal commands, search capabilities, and process management. This is the tool currently enabling this conversation!

### Key Features

- File operations (read, write, edit, create, move)
- Terminal/process management
- Fast file and content search
- Python/Node REPL integration
- Multi-platform support (Windows/Mac/Linux)
- Smart detection (prompts, process completion)
- Streaming search results
- Process interaction

---

## 📁 Project Structure

```
desktop-commander-v3/
├── src/
│   ├── tools/
│   │   ├── filesystem.ts    # File operations
│   │   ├── terminal.ts      # Process management
│   │   ├── search.ts        # Search operations
│   │   └── config.ts        # Configuration
│   ├── server.ts            # MCP server
│   └── index.ts             # Entry point
├── dist/                    # Compiled output
├── packages/                # Internal packages
├── tests/                   # Test suite
├── MCP_CONFIG.json          # MCP configuration
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start

### Installation

```powershell
# Navigate to project
cd C:\dev\apps\desktop-commander-v3

# Install dependencies
pnpm install

# Build
pnpm build

# Test
pnpm test
```

### Configuration

**Default Config Location:**

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

**MCP Config Format:**

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "node",
      "args": ["C:\\dev\\apps\\desktop-commander-v3\\dist\\index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

## 🛠️ Tool Capabilities

### File Operations

#### `read_file`

Read files with pagination support.

```typescript
// Read entire file
read_file({ path: "C:/path/file.txt" })

// Read specific lines (offset + length)
read_file({ 
  path: "C:/path/file.txt",
  offset: 100,    // Start at line 100
  length: 50      // Read 50 lines
})

// Read last N lines (tail behavior)
read_file({ 
  path: "C:/path/file.txt",
  offset: -20     // Last 20 lines
})

// Excel files
read_file({ 
  path: "C:/path/data.xlsx",
  sheet: "Sheet1",
  range: "A1:D100"
})

// PDF files (returns markdown)
read_file({ 
  path: "C:/path/document.pdf",
  offset: 0,      // Start page
  length: 5       // Read 5 pages
})
```

#### `write_file`

Write to files with chunking support.

```typescript
// Write/rewrite file
write_file({ 
  path: "C:/output.txt",
  content: "File content",
  mode: "rewrite"  // or "append"
})

// IMPORTANT: Always chunk large files!
// Max recommended: 25-30 lines per write
```

#### `edit_block`

Surgical file editing.

```typescript
// Replace text
edit_block({ 
  file_path: "C:/path/file.ts",
  old_string: "const old = 'value'",
  new_string: "const old = 'newValue'",
  expected_replacements: 1
})

// Excel range update
edit_block({ 
  file_path: "C:/path/data.xlsx",
  range: "Sheet1!A1:C10",
  content: [[...], [...]]  // 2D array
})
```

#### Other File Operations

```typescript
// Create directory
create_directory({ path: "C:/new/dir" })

// List directory
list_directory({ 
  path: "C:/path",
  depth: 2  // Recursion depth
})

// Move/rename
move_file({ 
  source: "C:/old/path/file.txt",
  destination: "C:/new/path/file.txt"
})

// Get file metadata
get_file_info({ path: "C:/path/file.txt" })
```

---

### Search Operations

#### `start_search`

Start streaming search.

```typescript
// Search files by name
start_search({ 
  path: "C:/dev",
  pattern: "*.ts",
  searchType: "files"
})

// Search file contents
start_search({ 
  path: "C:/dev",
  pattern: "function.*export",
  searchType: "content",
  literalSearch: false  // Use regex
})

// Literal search (for code with special chars)
start_search({ 
  path: "C:/dev",
  pattern: "toast.error('test')",
  searchType: "content",
  literalSearch: true
})
```

#### `get_more_search_results`

Retrieve search results with pagination.

```typescript
// Get first 100 results
get_more_search_results({ 
  sessionId: "search_123",
  offset: 0,
  length: 100
})

// Get next page
get_more_search_results({ 
  sessionId: "search_123",
  offset: 100,
  length: 100
})
```

#### `stop_search`

Stop active search.

```typescript
stop_search({ sessionId: "search_123" })
```

---

### Process Management

#### `start_process`

Start terminal process with smart detection.

```typescript
// Python REPL (recommended for data analysis)
start_process({ 
  command: "python -i",
  timeout_ms: 8000
})

// Node.js REPL
start_process({ 
  command: "node -i",
  timeout_ms: 8000
})

// Shell command
start_process({ 
  command: "dir C:\\dev",
  timeout_ms: 5000
})

// Long-running process
start_process({ 
  command: "npm run dev",
  timeout_ms: 30000
})
```

#### `interact_with_process`

Send input to running process.

```typescript
// Send to REPL
interact_with_process({ 
  pid: 12345,
  input: "import pandas as pd",
  timeout_ms: 8000,
  wait_for_prompt: true
})

// Without waiting for prompt
interact_with_process({ 
  pid: 12345,
  input: "exit()",
  wait_for_prompt: false
})
```

#### `read_process_output`

Read process output with pagination.

```typescript
// Read new output
read_process_output({ 
  pid: 12345,
  offset: 0,      // Get new output
  length: 100
})

// Read from specific line
read_process_output({ 
  pid: 12345,
  offset: 500,
  length: 50
})

// Get last N lines
read_process_output({ 
  pid: 12345,
  offset: -20     // Last 20 lines
})
```

#### Other Process Operations

```typescript
// Force terminate
force_terminate({ pid: 12345 })

// List active sessions
list_sessions()

// List all processes
list_processes()

// Kill process
kill_process({ pid: 12345 })
```

---

### Configuration Management

```typescript
// Get current config
get_config()

// Set config value (use in separate chat!)
set_config_value({ 
  key: "fileReadLineLimit",
  value: 5000
})

// Available config keys:
// - fileReadLineLimit (default: 5000)
// - fileWriteLineLimit (default: 500)
// - blockedCommands (array)
// - defaultShell (string)
// - allowedDirectories (array, empty = all)
// - telemetryEnabled (boolean)
```

---

## 📊 Configuration Options

### Security Settings

```typescript
{
  // Blocked commands (for safety)
  blockedCommands: [
    "mkfs", "format", "shutdown", "reboot",
    "sudo", "passwd", "rm -rf /", ...
  ],
  
  // Directory access (empty = full access)
  allowedDirectories: [],
  
  // Default shell
  defaultShell: "powershell.exe"  // Windows
  // defaultShell: "bash"          // Linux/Mac
}
```

### Performance Settings

```typescript
{
  // File operation limits
  fileReadLineLimit: 5000,   // Max lines per read
  fileWriteLineLimit: 500,   // Warning threshold
  
  // Telemetry
  telemetryEnabled: false
}
```

---

## 🧪 Testing

### Run Tests

```powershell
# All tests
pnpm test

# Specific test file
pnpm test filesystem.test.ts

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Test Structure

```
tests/
├── tools/
│   ├── filesystem.test.ts
│   ├── terminal.test.ts
│   ├── search.test.ts
│   └── config.test.ts
├── integration/
│   └── mcp-integration.test.ts
└── mocks/
    └── fs-mock.ts
```

---

## 🔧 Development

### Building

```powershell
# Development build
pnpm build

# Watch mode
pnpm build:watch

# Production build
pnpm build:prod
```

### Type Checking

```powershell
# Type check
pnpm typecheck

# Type check in watch mode
pnpm typecheck:watch
```

### Linting

```powershell
# Lint
pnpm lint

# Lint fix
pnpm lint:fix
```

---

## 🐛 Debugging

### Enable Verbose Logging

```typescript
// In tool calls
start_process({ 
  command: "python -i",
  timeout_ms: 8000,
  verbose_timing: true  // Enable timing info
})

interact_with_process({ 
  pid: 12345,
  input: "code",
  verbose_timing: true
})
```

### Check Logs

```powershell
# MCP logs (check Claude Desktop logs)
# Windows: %APPDATA%\Claude\logs

# Desktop Commander usage stats
DC: get_usage_stats

# Recent tool calls
DC: get_recent_tool_calls
```

---

## 🔧 Troubleshooting

### MCP Not Loading

```powershell
# Check config file
code "%APPDATA%\Claude\claude_desktop_config.json"

# Verify paths
Test-Path C:\dev\apps\desktop-commander-v3\dist\index.js

# Check Node.js
node --version  # Should be 18+

# Rebuild
pnpm clean
pnpm install
pnpm build
```

### File Operations Failing

```powershell
# Check allowedDirectories
DC: get_config

# Set to allow all (empty array)
DC: set_config_value --key "allowedDirectories" --value []

# Always use absolute paths!
# ✅ C:\dev\file.txt
# ❌ file.txt (may fail)
```

### Process Issues

```powershell
# List stuck sessions
DC: list_sessions

# Force terminate
DC: force_terminate --pid <pid>

# Check blocked commands
DC: get_config
# See: blockedCommands
```

---

## 📚 Important Documentation

### Project Docs

- `README.md` - Overview
- `FILE_OPS_DOCS.md` - File operation details
- `PRODUCTION_READINESS_REPORT.md` - Production status
- `TEST_SUITE_REPORT.md` - Test coverage
- `MCP_INTEGRATION_REPORT.md` - MCP integration
- `PERMISSIONS_GUIDE.md` - Security and permissions

### MCP Documentation

- `MCP_CONFIG.json` - MCP configuration
- `CLAUDE_DESKTOP_CONFIG.md` - Claude Desktop setup
- `CLAUDE_DESKTOP_SETUP.md` - Setup guide

---

## 🎯 Best Practices

### File Operations

1. **Always use absolute paths** - Relative paths may fail
2. **Chunk large files** - 25-30 lines max per write
3. **Use pagination** - For reading large files
4. **Handle errors** - Check tool responses

### Process Management

1. **Use REPLs for analysis** - Python REPL for CSV/JSON
2. **Wait for prompts** - Set wait_for_prompt: true
3. **Check session status** - Use list_sessions
4. **Terminate cleanly** - Close processes when done

### Search Operations

1. **Choose correct type** - files vs content
2. **Use literal search** - For code with special chars
3. **Paginate results** - Don't load all at once
4. **Stop when done** - Call stop_search

---

## 🔄 Maintenance

### Version Updates

```powershell
# Update dependencies
pnpm update

# Test after update
pnpm test

# Rebuild
pnpm build

# Restart Claude Desktop to reload
```

### Usage Monitoring

```powershell
# Check usage stats
DC: get_usage_stats

# View recent tool calls
DC: get_recent_tool_calls --maxResults 50

# Check performance
# See: verbose_timing in tool calls
```

---

## 🎓 Advanced Features

### Smart Detection

- Detects REPL prompts (>>>, >, $, etc.)
- Identifies process completion
- Early exit prevents timeouts
- Periodic checks for output

### Performance Optimization

- Streaming search results
- Paginated file reading
- Efficient process I/O
- Memory-efficient operations

### Cross-Platform

- Windows (PowerShell default)
- macOS (bash/zsh)
- Linux (bash)
- Auto-detects platform

---

**Last Updated:** January 2, 2026  
**Current Version:** 0.2.28  
**Status:** Production - Active

This tool is currently running and powering this conversation!

