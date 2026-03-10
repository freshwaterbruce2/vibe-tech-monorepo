# Desktop Commander v3 - Claude Project Guide

## 🎯 Project Overview

**Desktop Commander v3** is a Model Context Protocol (MCP) server for desktop automation, command execution, and system integration. It provides Claude AI with powerful desktop control capabilities through a standardized MCP interface.

**Type**: MCP Server (Model Context Protocol)
**Stack**: Node.js + TypeScript + WebSocket + PowerShell + systeminformation
**Purpose**: Desktop automation, system monitoring, command execution for AI agents
**MCP SDK**: @modelcontextprotocol/sdk v1.20.2
**Location**: `C:\dev\apps\desktop-commander-v3`

---

## 📁 Project Structure

```
desktop-commander-v3/
├── src/                        # TypeScript source
│   ├── index.ts                # Main entry point (HTTP server)
│   ├── mcp.ts                  # MCP server entry point
│   ├── ClipboardTools.ts       # Clipboard operations
│   ├── CommandExecutor.ts      # Shell command execution
│   ├── FileSystemTools.ts      # File system operations
│   ├── InputTools.ts           # Keyboard/mouse input
│   ├── IPCClient.ts            # IPC communication
│   ├── Logger.ts               # Logging utility
│   ├── MediaTools.ts           # Media/screenshot tools
│   ├── PathValidator.ts        # Path validation & security
│   ├── PermissionManager.ts    # Permission system
│   ├── PowerShellTools.ts      # PowerShell integration
│   ├── ScreenshotTools.ts      # Screenshot capture
│   ├── SystemTools.ts          # System information
│   ├── WebTools.ts             # Web automation
│   ├── WindowTools.ts          # Window management
│   └── test/                   # Test files
├── dist/                       # Compiled JavaScript
│   ├── index.js
│   ├── mcp.js
│   ├── *.js (all compiled files)
│   └── *.js.map (source maps)
├── node_modules/               # Dependencies
├── package.json                # Project config
├── tsconfig.json               # TypeScript config
├── MCP_CONFIG.json             # MCP server configuration
├── CODEX_INTEGRATION.md        # Codex integration guide
├── FILE_OPS_DOCS.md            # File operations documentation
├── GEMINI.md                   # Gemini AI integration
├── PERMISSIONS_GUIDE.md        # Permission system guide
├── README.md                   # Main documentation
└── project.json                # Nx project config
```

---

## 🚀 Essential Commands

### Development

```bash
npm run dev                     # Start with tsx watch (hot reload)
npm start                       # Start HTTP server (compiled)
npm run start:mcp               # Start MCP server (compiled)
```

### Building

```bash
npm run build                   # Compile TypeScript to dist/
```

### Testing

```bash
npm test                        # Run Vitest tests
```

### Code Quality

```bash
npm run lint                    # ESLint check
```

---

## 🏗️ Architecture & Key Concepts

### MCP Server Architecture

- **Protocol**: Model Context Protocol (Anthropic standard)
- **Transport**: stdio (standard input/output for Claude integration)
- **SDK**: @modelcontextprotocol/sdk v1.20.2
- **Entry Point**: `src/mcp.ts` (MCP mode) or `src/index.ts` (HTTP mode)

### Tool Categories

**1. System Tools** (`SystemTools.ts`)

- Get system information (CPU, memory, disk, network)
- Monitor system resources
- Battery status
- Process listing

**2. File System Tools** (`FileSystemTools.ts`)

- Read/write files
- List directories
- Create/delete files and folders
- Move/rename files
- File metadata retrieval
- Path validation (security-critical)

**3. Command Execution** (`CommandExecutor.ts`, `PowerShellTools.ts`)

- Execute shell commands (bash, PowerShell, cmd)
- PowerShell-specific commands
- Command output capture
- Timeout handling

**4. Window Management** (`WindowTools.ts`)

- List windows
- Get active window
- Window manipulation (focus, resize, close)

**5. Input Control** (`InputTools.ts`)

- Mouse control (click, move, drag)
- Keyboard input (type, shortcuts)
- Input simulation

**6. Clipboard** (`ClipboardTools.ts`)

- Read clipboard content
- Write to clipboard
- Clipboard monitoring

**7. Screenshots** (`ScreenshotTools.ts`, `MediaTools.ts`)

- Capture screenshots (full screen or window)
- Screen recording
- Image processing

**8. Web Automation** (`WebTools.ts`)

- Browser automation (Puppeteer-like)
- Web scraping
- Form filling

### Security Layer

**Path Validation** (`PathValidator.ts`)

- Validates all file system paths
- Prevents directory traversal attacks
- Enforces allowed directories
- Normalizes paths across platforms

**Permission Manager** (`PermissionManager.ts`)

- Controls access to sensitive operations
- Configurable permission rules
- Auto-approve vs always-ask policies
- See `PERMISSIONS_GUIDE.md` for details

### IPC Communication

**IPC Client** (`IPCClient.ts`)

- WebSocket-based communication
- Connects to host applications (like Vibe Code Studio)
- Bidirectional messaging
- Event-driven architecture

### Logging System

**Logger** (`Logger.ts`)

- Structured logging
- Multiple log levels (debug, info, warn, error)
- File and console output
- Performance tracking

---

## 📝 Coding Standards & Conventions

### TypeScript

- **Strict Mode**: Enabled
- **Target**: ES2022
- **Module**: ESNext (ES imports only)
- **No `any`**: Use proper types or `unknown`

### File Naming

- **Tools**: PascalCase (e.g., `ClipboardTools.ts`)
- **Utilities**: PascalCase (e.g., `PathValidator.ts`)
- **Tests**: `*.test.ts` or `*.spec.ts`
- **Entry Points**: lowercase (e.g., `index.ts`, `mcp.ts`)

### Tool Design Patterns

- **Single Responsibility**: Each tool file handles one domain
- **Error Handling**: Always wrap in try-catch, return structured errors
- **Validation**: Validate all inputs before execution
- **Security**: Never trust user input, always sanitize
- **Async/Await**: Prefer async/await over promises

### MCP Tool Interface

All MCP tools follow this pattern:

```typescript
{
  name: "tool_name",
  description: "What this tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "..." }
    },
    required: ["param1"]
  }
}
```

---

## 🔧 Configuration Files

### MCP Configuration

**File**: `MCP_CONFIG.json`

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "node",
      "args": ["C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"],
      "env": { "NODE_ENV": "production" },
      "disabled": false,
      "autoApprove": [
        "dc_get_system_info",
        "dc_list_processes",
        "dc_list_windows",
        "dc_read_file",
        // ... (see file for full list)
      ],
      "alwaysAsk": [
        "dc_delete_file",
        "dc_terminate_app",
        "dc_run_powershell_unsafe"
      ]
    }
  }
}
```

### TypeScript Config

**File**: `tsconfig.json`

- Target: ES2022
- Module: ESNext
- Strict: true
- Output: `dist/`
- Source maps: true

### Package Config

**File**: `package.json`

- Type: module (ES modules)
- Main: `dist/index.js` (HTTP server)
- MCP Entry: `dist/mcp.js` (MCP server)

---

## 🛡️ Security & Best Practices

### Path Security

**Critical**: All file paths MUST go through `PathValidator`

- Prevents directory traversal (`../../../etc/passwd`)
- Enforces allowed directories
- Normalizes paths (handles Windows/Unix differences)
- Validates existence before operations

### Command Execution Security

**Blocked Commands** (in MCP_CONFIG.json):

- File system formatting: `mkfs`, `format`, `fdisk`, `diskpart`
- System modifications: `sudo`, `passwd`, `useradd`, `shutdown`
- Network config: `iptables`, `netsh`, `firewall`
- Registry edits: `reg`, `regedit`

**Safe Execution**:

- Use whitelisted commands when possible
- Validate command strings before execution
- Set timeouts to prevent hanging
- Capture and sanitize output

### Permission System

**Auto-Approve** (low-risk operations):

- System info retrieval
- File reading
- Process listing
- Window listing

**Always Ask** (high-risk operations):

- File deletion
- Process termination
- Unrestricted PowerShell
- System configuration changes

---

## 🔌 MCP Integration

### How It Works

1. **Client connects** via stdio (Claude Desktop/Code)
2. **Tool discovery**: Client requests available tools
3. **Tool execution**: Client calls tools with parameters
4. **Result return**: Server returns structured results

### Supported MCP Clients

- **Claude Desktop**: Main use case
- **Claude Code**: CLI integration
- **Custom Clients**: Any MCP-compatible client

### Tool Naming Convention

All tools prefixed with `dc_` (Desktop Commander):

- `dc_get_system_info`
- `dc_read_file`
- `dc_execute_command`
- `dc_list_windows`
- etc.

### Adding New Tools

1. Create tool in appropriate `*Tools.ts` file
2. Define MCP tool interface in `mcp.ts`
3. Add to `autoApprove` or `alwaysAsk` in `MCP_CONFIG.json`
4. Test with MCP client
5. Document in `FILE_OPS_DOCS.md` or similar

---

## 🐛 Debugging & Troubleshooting

### Common Issues

1. **MCP Connection Fails**: Check `dist/mcp.js` exists (run `npm run build`)
2. **Path Errors**: Verify `PathValidator` is being used
3. **Permission Denied**: Check `MCP_CONFIG.json` permissions
4. **Command Hangs**: Increase timeout or check for blocking commands
5. **WebSocket Errors**: Verify IPC server is running

### Debugging Techniques

```bash
# Build and test
npm run build
node dist/mcp.js

# Enable verbose logging
# (modify Logger.ts to set log level to 'debug')

# Test individual tools
npm test
```

### Log Files

- **Console logs**: stderr for MCP communication
- **Logger output**: Configured in `Logger.ts`
- **Error traces**: Capture full stack traces in production

---

## 📚 Important Documentation

### In-Repo Docs

- **`README.md`**: Main documentation
- **`MCP_CONFIG.json`**: MCP server configuration
- **`PERMISSIONS_GUIDE.md`**: Permission system
- **`FILE_OPS_DOCS.md`**: File operations guide
- **`CODEX_INTEGRATION.md`**: Codex AI integration
- **`GEMINI.md`**: Gemini AI integration

### External Resources

- **MCP Spec**: <https://modelcontextprotocol.io/>
- **MCP SDK**: <https://github.com/anthropics/mcp-sdk-typescript>
- **systeminformation**: <https://systeminformation.io/>
- **PowerShell**: <https://docs.microsoft.com/powershell>

---

## 💡 Special Instructions for Claude

### When Adding Tools

1. **Security first**: Review `PathValidator` and `PermissionManager`
2. **MCP compliance**: Follow MCP tool schema strictly
3. **Error handling**: Always return structured errors
4. **Documentation**: Update relevant docs
5. **Testing**: Write tests in `src/test/`

### When Modifying Existing Tools

1. **Backward compatibility**: Don't break existing MCP clients
2. **Version changes**: Update package.json if breaking
3. **Permission review**: Check if permission level should change
4. **Testing**: Test with actual MCP client (Claude Desktop)

### When Debugging

1. **Build first**: Always run `npm run build` after changes
2. **Check logs**: Enable debug logging in `Logger.ts`
3. **Test standalone**: Run `node dist/mcp.js` directly
4. **Verify MCP config**: Check `MCP_CONFIG.json` is valid JSON

### When Deploying

1. **Build production**: `npm run build`
2. **Test MCP connection**: Use with Claude Desktop
3. **Verify permissions**: Review auto-approve vs always-ask
4. **Update config paths**: Ensure paths in `MCP_CONFIG.json` are correct

### Project-Specific Rules

- **All file paths through PathValidator**: No exceptions
- **All commands must be validated**: Check blocklist
- **All tools must return structured data**: Use consistent error format
- **No direct console.log**: Use `Logger` instead
- **ES modules only**: No CommonJS (`require`)
- **Async by default**: All I/O operations should be async
- **Windows-first**: Primary target is Windows (but cross-platform safe)

---

## 🚨 Common Gotchas

1. **Path separators**: Use `path.join()`, not string concatenation
2. **Windows PowerShell**: Different behavior than bash/cmd
3. **MCP stdio**: All stdout is consumed by MCP client (use stderr for logs)
4. **Synchronous operations**: Avoid blocking the event loop
5. **WebSocket lifecycle**: Properly handle connection/disconnection
6. **Permission changes**: Require client restart to take effect
7. **TypeScript compilation**: Must build before running MCP server
8. **Node.js version**: Ensure compatibility with Electron if used as dependency
9. **Workspace packages**: Uses `workspace:*` for monorepo dependencies
10. **IPC timing**: WebSocket connections may take time to establish

---

## 🎯 Current Development Focus

**Phase**: Stable MCP Server with Desktop Automation Capabilities
**Priority**:

1. Maintain MCP protocol compliance
2. Enhance security and permission system
3. Optimize performance for large file operations
4. Expand tool coverage (new automation capabilities)

**Next Steps**:

- Add more sophisticated window management
- Implement advanced screenshot/screen recording
- Enhance web automation capabilities
- Create comprehensive test suite

---

## 🔗 Integration Examples

### With Claude Desktop

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "desktop-commander": {
      "command": "node",
      "args": ["C:\\dev\\apps\\desktop-commander-v3\\dist\\mcp.js"],
      "env": { "NODE_ENV": "production" }
    }
  }
}
```

### With Vibe Code Studio

Desktop Commander integrates via:

1. **IPC Client**: `IPCClient.ts` connects to Vibe's WebSocket
2. **Shared Types**: `@vibetech/shared-ipc` package
3. **Tool Registration**: Tools exposed via MCP for AI access

### With Custom Clients

Any MCP-compatible client can use Desktop Commander:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: 'my-client',
  version: '1.0.0',
});

// Connect to Desktop Commander
await client.connect({
  command: 'node',
  args: ['path/to/desktop-commander-v3/dist/mcp.js'],
});

// List available tools
const tools = await client.listTools();

// Call a tool
const result = await client.callTool({
  name: 'dc_get_system_info',
  arguments: {},
});
```

---

## 📞 Need Help?

- **MCP Issues**: Check MCP SDK documentation
- **Security**: Review `PERMISSIONS_GUIDE.md`
- **File Operations**: See `FILE_OPS_DOCS.md`
- **Integration**: Check `CODEX_INTEGRATION.md` or `GEMINI.md`
- **Debugging**: Enable debug logs in `Logger.ts`

---

*Last Updated*: 2025-01-01 (Auto-generated from package.json v1.0.0)
