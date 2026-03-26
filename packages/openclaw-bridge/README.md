# @vibetech/openclaw-bridge

OpenClaw IPC Bridge Client for dispatching tasks to MCP servers through the gateway bridge.

**Version:** 2.0.0
**Compatible with:** current [OpenClaw](https://github.com/openclaw/openclaw) gateway-centric releases

---

## Overview

This package provides a WebSocket-based IPC client that connects OpenClaw (your personal AI assistant) to the VibeTech MCP server ecosystem through the gateway bridge. It enables OpenClaw to dispatch tasks, call MCP tools, and interact with the monorepo's AI infrastructure.

### What is OpenClaw?

[OpenClaw](https://github.com/openclaw/openclaw) is a personal AI assistant you run on your own devices that integrates with messaging platforms like WhatsApp, Telegram, Slack, Discord, and more. Current gateway-centric releases continue to emphasize:

- Multi-platform messaging support
- Code safety scanning
- Tool and gateway routing improvements
- Security-focused path handling
- Configuration refresh without restart

**Sources:**
- [OpenClaw Releases](https://github.com/openclaw/openclaw/releases)
- [OpenClaw Repository](https://github.com/openclaw/openclaw)

---

## Features

- ✅ **Auto-reconnection** with exponential backoff
- ✅ **Request/response correlation** tracking
- ✅ **Timeout handling** per operation
- ✅ **Debug logging** support
- ✅ **Health check** monitoring
- ✅ **Multi-step task** dispatching
- ✅ **Single tool calls** with argument passing
- ✅ **Event-based** architecture (EventEmitter)

---

## Installation

```bash
# From monorepo root
pnpm install --filter @vibetech/openclaw-bridge

# Build
pnpm --filter @vibetech/openclaw-bridge build
```

---

## Usage

### Basic Connection

```typescript
import { OpenClawBridge } from '@vibetech/openclaw-bridge';

const bridge = new OpenClawBridge({
  url: 'ws://localhost:5004',
  autoReconnect: true,
  debug: true,
});

await bridge.connect();
console.log('Connected to IPC Bridge!');
```

### Call a Single MCP Tool

```typescript
const result = await bridge.callTool({
  server: 'filesystem',
  tool: 'read_file',
  args: { path: './example.txt' },
  timeout: 30000, // 30 seconds
});

if (result.success) {
  console.log('File contents:', result.data);
} else {
  console.error('Error:', result.error);
}
```

### Dispatch Multi-Step Task

```typescript
const taskResult = await bridge.dispatchTask({
  description: 'Process documentation files',
  priority: 'high',
  steps: [
    {
      server: 'filesystem',
      tool: 'list_directory',
      args: { path: './docs' },
    },
    {
      server: 'codeberg',
      tool: 'codeberg_search_repos',
      args: { query: 'documentation' },
    },
  ],
  timeout: 120000, // 2 minutes
});

console.log(`Task ${taskResult.status} in ${taskResult.durationMs}ms`);
for (const step of taskResult.results) {
  console.log(`Step ${step.stepIndex}: ${step.success ? '✅' : '❌'}`);
}
```

### Health Check

```typescript
const health = await bridge.healthCheck();
console.log(`Bridge healthy: ${health.healthy}, latency: ${health.latencyMs}ms`);
```

### Event Handling

```typescript
bridge.on('connected', () => {
  console.log('Bridge connected!');
});

bridge.on('disconnected', ({ code, reason }) => {
  console.log(`Disconnected: ${code} - ${reason}`);
});

bridge.on('reconnecting', ({ attempt, delay }) => {
  console.log(`Reconnecting (attempt ${attempt}) in ${delay}ms...`);
});

bridge.on('reconnect_failed', () => {
  console.error('Max reconnect attempts reached');
});

bridge.on('error', (err) => {
  console.error('Bridge error:', err);
});
```

---

## CLI Usage

The package includes a CLI tool `openclaw-dispatch` for testing and manual operations.

### Installation

```bash
# Build and link
pnpm --filter @vibetech/openclaw-bridge build

# The binary is available as: openclaw-dispatch
```

### Commands

#### Call a Tool

```bash
openclaw-dispatch call <server> <tool> [--args '{"key":"value"}']

# Example: Read a file
openclaw-dispatch call filesystem read_file --args '{"path":"./README.md"}'
```

#### Dispatch a Task

```bash
openclaw-dispatch task "<description>" --steps '[{"server":"s","tool":"t","args":{}}]'

# Example: Multi-step workflow
openclaw-dispatch task "Search and analyze repos" --steps '[
  {"server":"codeberg","tool":"codeberg_search_repos","args":{"query":"vibetech"}},
  {"server":"sequential-thinking","tool":"sequentialthinking","args":{"thought":"Analyze results","thoughtNumber":1}}
]'
```

#### Ping Test

```bash
openclaw-dispatch ping
```

---

## Configuration

### BridgeOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | `ws://localhost:5004` | IPC Bridge WebSocket URL |
| `autoReconnect` | `boolean` | `true` | Auto-reconnect on disconnect |
| `reconnectDelay` | `number` | `5000` | Reconnect delay in ms |
| `maxReconnectAttempts` | `number` | `5` | Max reconnect attempts (0 = infinite) |
| `debug` | `boolean` | `false` | Enable debug logging |

### Environment Variables

```bash
# Set IPC Bridge URL
export IPC_BRIDGE_URL=ws://localhost:5004

# CLI will use this by default
openclaw-dispatch ping
```

---

## OpenClaw Integration

**Complete integration examples available in `examples/` directory!**

### Quick Start

```powershell
# Install the extension and webhook handler
cd examples
.\install.ps1
```

This installs:
- ✅ Extension with `/mcp`, `/files`, `/search`, `/screenshot` commands
- ✅ Webhook handler for automatic message processing
- ✅ OpenClaw configuration

### Webhooks

OpenClaw can trigger this bridge via webhooks when messages arrive.

**See**: `examples/webhook-handler.js` for complete implementation

**Usage**: Send `/mcp <server> <tool> <args>` to OpenClaw

### Extensions

Full-featured extension with 4 commands.

**See**: `examples/extension/` for complete implementation

**Commands**:
- `/mcp` - Call any MCP tool
- `/files` - List files/directories
- `/search` - Search GitHub repos
- `/screenshot` - Capture screen (Windows)

### Documentation

- **Integration Guide**: `examples/INTEGRATION_GUIDE.md` - Complete setup guide
- **Examples README**: `examples/README.md` - Quick reference
- **Config Example**: `examples/openclaw-config.json` - OpenClaw configuration

---

## Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│  OpenClaw   │ ←────────────────────────→ │ IPC Bridge  │
│  (Client)   │   @vibetech/openclaw-bridge │ (ws:5004)   │
└─────────────┘                             └─────────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │ Gateway-routed│
                                            │ MCP Servers   │
                                            └───────────────┘
                                                    │
                                     ┌──────────────┼──────────────┐
                                     ▼              ▼              ▼
                              ┌─────────┐   ┌──────────┐   ┌──────────┐
                              │Filesystem│   │  GitHub  │   │ Desktop  │
                              │   MCP    │   │   MCP    │   │Commander │
                              └─────────┘   └──────────┘   └──────────┘
```

**Message Flow:**

1. OpenClaw receives user message/command
2. OpenClaw hook/extension uses `@vibetech/openclaw-bridge`
3. Bridge sends IPC message to IPC Bridge server (port 5004)
4. IPC Bridge routes to the appropriate gateway-backed MCP server
5. MCP server executes tool and returns result
6. Bridge receives result and resolves promise
7. OpenClaw processes result and responds to user

---

## Development

### Build

```bash
pnpm --filter @vibetech/openclaw-bridge build
```

### Watch Mode

```bash
pnpm --filter @vibetech/openclaw-bridge dev
```

### Type Check

```bash
pnpm --filter @vibetech/openclaw-bridge typecheck
```

### Run Tests

```bash
pnpm --filter @vibetech/openclaw-bridge test
```

---

## Troubleshooting

### Connection Refused

**Issue:** `Error: connect ECONNREFUSED 127.0.0.1:5004`

**Solution:**
1. Ensure IPC Bridge server is running on port 5004
2. Check `backend/ipc-bridge/` is running: `pnpm --filter ipc-bridge dev`
3. Verify firewall isn't blocking port 5004

### Auto-Reconnect Not Working

**Issue:** Bridge doesn't reconnect after disconnect

**Solution:**
1. Check `autoReconnect: true` in BridgeOptions
2. Verify not hitting `maxReconnectAttempts` limit
3. Listen to `reconnect_failed` event for debugging

### Timeout Errors

**Issue:** Operations timing out consistently

**Solution:**
1. Increase `timeout` parameter for slow operations
2. Check MCP server responsiveness with `healthCheck()`
3. Review server logs for bottlenecks

### Debug Logging

**Issue:** Need to see what's happening internally

**Solution:**
```typescript
const bridge = new OpenClawBridge({ debug: true });
// Now all operations log to console
```

---

## Related Packages

- `@vibetech/shared-ipc` - Shared IPC schemas and types
- `backend/ipc-bridge` - IPC Bridge server (port 5004)
- `apps/desktop-commander-v3` - MCP server example
- `apps/mcp-codeberg` - GitHub MCP server

---

## License

MIT

---

## Changelog

### v2.0.0 (2026-02-19)

- 🎉 **BREAKING:** Updated for current OpenClaw gateway-centric compatibility
- ✨ Added auto-reconnection with exponential backoff
- ✨ Added health check endpoint
- ✨ Added connection state tracking
- ✨ Enhanced debug logging
- ✨ Improved error handling
- 📚 Comprehensive documentation
- 🔧 Modernized to match 2026 monorepo patterns

### v1.0.0 (2025)

- Initial release
- Basic tool calling and task dispatching

---

**Built with ❤️ for the VibeTech Monorepo**
