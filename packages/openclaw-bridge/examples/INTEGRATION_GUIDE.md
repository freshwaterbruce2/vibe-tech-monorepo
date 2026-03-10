# OpenClaw Integration Guide

Complete guide for integrating `@vibetech/openclaw-bridge` with OpenClaw.

**OpenClaw Version**: 2026.2.19-2
**Bridge Version**: 2.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Integration Methods](#integration-methods)
4. [Webhook Integration](#webhook-integration)
5. [Extension Integration](#extension-integration)
6. [Command Handlers](#command-handlers)
7. [Common Use Cases](#common-use-cases)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Production Deployment](#production-deployment)

---

## Overview

The OpenClaw Bridge enables OpenClaw to interact with VibeTech's MCP (Model Context Protocol) servers through the IPC Bridge. This allows OpenClaw to:

- Access the filesystem (read, write, search files)
- Query GitHub repositories
- Execute desktop commands (via Desktop Commander)
- Call any MCP server in the Antigravity ecosystem

**Architecture:**

```
User → OpenClaw → openclaw-bridge → IPC Bridge → MCP Servers
         (Message)   (WebSocket)      (Router)     (Tools)
```

---

## Prerequisites

### 1. Install OpenClaw

```bash
# Install OpenClaw globally (if not already installed)
npm install -g openclaw

# Or use the latest version
npm install -g openclaw@2026.2.19-2
```

### 2. Install Bridge Package

```bash
# From VibeTech monorepo
cd C:\dev\packages\openclaw-bridge
pnpm install
pnpm build
pnpm link --global
```

### 3. Start IPC Bridge Server

The bridge requires the IPC Bridge server running on port 5004:

```bash
# From monorepo root
pnpm --filter ipc-bridge dev
```

**Verify it's running:**
```bash
openclaw-dispatch ping
# Should output: ✅ Pong! (XXms)
```

---

## Integration Methods

OpenClaw supports three integration methods:

| Method | Use Case | Complexity | Auto-trigger |
|--------|----------|------------|--------------|
| **Webhooks** | Process incoming messages | Simple | Yes |
| **Extensions** | Add commands and features | Medium | No |
| **Commands** | Slash commands (/mcp) | Simple | No |

---

## Webhook Integration

Webhooks automatically trigger when messages arrive.

### 1. Create Webhook Handler

**File**: `~/.openclaw/webhooks/on_message.js`

```javascript
import { OpenClawBridge } from '@vibetech/openclaw-bridge';

/**
 * Process incoming messages and call MCP tools
 * @param {Object} message - Message object from OpenClaw
 * @param {string} message.text - Message text
 * @param {string} message.from - Sender ID
 * @param {string} message.platform - Platform (telegram, discord, etc.)
 */
export default async function onMessage(message) {
    // Only process messages that start with /mcp
    if (!message.text.startsWith('/mcp')) {
        return null; // Let other handlers process
    }

    const bridge = new OpenClawBridge({
        url: process.env.IPC_BRIDGE_URL || 'ws://localhost:5004',
        autoReconnect: true,
        debug: false,
    });

    try {
        await bridge.connect();

        // Parse command: /mcp <server> <tool> <args>
        const parts = message.text.split(' ');
        const [, server, tool, ...argParts] = parts;

        if (!server || !tool) {
            return '❌ Usage: /mcp <server> <tool> [args]\n\nExample: /mcp filesystem list_directory {"path":"./"}';
        }

        // Parse args (JSON string or empty object)
        const args = argParts.length > 0 ? JSON.parse(argParts.join(' ')) : {};

        // Call MCP tool
        const result = await bridge.callTool({
            server,
            tool,
            args,
            timeout: 30000,
        });

        if (result.success) {
            return `✅ Result (${result.durationMs}ms):\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``;
        } else {
            return `❌ Error: ${result.error}`;
        }
    } catch (err) {
        return `❌ Bridge error: ${err.message}`;
    } finally {
        bridge.disconnect();
    }
}
```

### 2. Register Webhook

**File**: `~/.openclaw/openclaw.json`

```json
{
  "webhooks": {
    "on_message": {
      "enabled": true,
      "handler": "webhooks/on_message.js",
      "platforms": ["telegram", "discord", "slack"],
      "priority": 10
    }
  }
}
```

### 3. Test Webhook

Send a message to OpenClaw:
```
/mcp filesystem list_directory {"path":"C:\\dev"}
```

Expected response:
```
✅ Result (45ms):
{
  "files": ["package.json", "pnpm-workspace.yaml", ...],
  "directories": ["apps", "packages", "backend"]
}
```

---

## Extension Integration

Extensions add persistent commands to OpenClaw.

### 1. Create Extension Manifest

**File**: `~/.openclaw/extensions/vibetech-bridge/manifest.json`

```json
{
  "name": "vibetech-bridge",
  "version": "2.0.0",
  "description": "VibeTech Antigravity MCP Bridge",
  "author": "VibeTech",
  "entry": "index.js",
  "commands": [
    {
      "name": "mcp",
      "description": "Call an MCP tool",
      "usage": "/mcp <server> <tool> [args]",
      "handler": "commands/mcp.js",
      "platforms": ["telegram", "discord", "slack", "whatsapp"]
    },
    {
      "name": "files",
      "description": "List files in directory",
      "usage": "/files [path]",
      "handler": "commands/files.js"
    },
    {
      "name": "search",
      "description": "Search code in repository",
      "usage": "/search <query>",
      "handler": "commands/search.js"
    }
  ],
  "capabilities": [
    "filesystem",
    "codeberg",
    "desktop-commander"
  ],
  "config": {
    "ipc_bridge_url": "ws://localhost:5004",
    "auto_reconnect": true,
    "debug": false,
    "default_timeout": 30000
  }
}
```

### 2. Create Extension Entry Point

**File**: `~/.openclaw/extensions/vibetech-bridge/index.js`

```javascript
import { OpenClawBridge } from '@vibetech/openclaw-bridge';

class VibeTechBridgeExtension {
    constructor(config) {
        this.config = config;
        this.bridge = null;
    }

    async initialize() {
        console.log('[VibeTech Bridge] Initializing...');
        this.bridge = new OpenClawBridge({
            url: this.config.ipc_bridge_url,
            autoReconnect: this.config.auto_reconnect,
            debug: this.config.debug,
        });

        // Connect to bridge
        try {
            await this.bridge.connect();
            console.log('[VibeTech Bridge] Connected to IPC Bridge');

            // Health check
            const health = await this.bridge.healthCheck();
            console.log(`[VibeTech Bridge] Health: ${health.healthy}, Latency: ${health.latencyMs}ms`);
        } catch (err) {
            console.error('[VibeTech Bridge] Failed to connect:', err.message);
        }

        // Listen for disconnections
        this.bridge.on('disconnected', () => {
            console.log('[VibeTech Bridge] Disconnected from IPC Bridge');
        });

        this.bridge.on('reconnecting', ({ attempt, delay }) => {
            console.log(`[VibeTech Bridge] Reconnecting (attempt ${attempt}) in ${delay}ms...`);
        });
    }

    async shutdown() {
        console.log('[VibeTech Bridge] Shutting down...');
        if (this.bridge) {
            this.bridge.disconnect();
        }
    }

    getBridge() {
        return this.bridge;
    }
}

export default VibeTechBridgeExtension;
```

### 3. Create Command Handlers

See [Command Handlers](#command-handlers) section below.

---

## Command Handlers

Individual command implementations for the extension.

### /mcp Command

**File**: `~/.openclaw/extensions/vibetech-bridge/commands/mcp.js`

```javascript
/**
 * /mcp <server> <tool> [args]
 * Call any MCP tool via the bridge
 */
export default async function mcpCommand(context, extension) {
    const { args, message } = context;
    const bridge = extension.getBridge();

    if (!bridge || !bridge.isConnected) {
        return '❌ Bridge not connected. Please check IPC Bridge server.';
    }

    // Parse: /mcp <server> <tool> <json-args>
    if (args.length < 2) {
        return '❌ Usage: /mcp <server> <tool> [args]\n\n' +
               'Examples:\n' +
               '/mcp filesystem list_directory {"path":"./"}\\n' +
               '/mcp codeberg codeberg_search_repos {"query":"vibetech"}';
    }

    const [server, tool, ...jsonArgs] = args;
    const toolArgs = jsonArgs.length > 0 ? JSON.parse(jsonArgs.join(' ')) : {};

    try {
        const result = await bridge.callTool({
            server,
            tool,
            args: toolArgs,
            timeout: extension.config.default_timeout,
        });

        if (result.success) {
            return `✅ ${server}.${tool} (${result.durationMs}ms)\n\n` +
                   `\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``;
        } else {
            return `❌ Error: ${result.error}`;
        }
    } catch (err) {
        return `❌ Exception: ${err.message}`;
    }
}
```

### /files Command

**File**: `~/.openclaw/extensions/vibetech-bridge/commands/files.js`

```javascript
/**
 * /files [path]
 * List files in a directory (defaults to current directory)
 */
export default async function filesCommand(context, extension) {
    const { args } = context;
    const bridge = extension.getBridge();

    if (!bridge?.isConnected) {
        return '❌ Bridge not connected';
    }

    const path = args[0] || './';

    try {
        const result = await bridge.callTool({
            server: 'filesystem',
            tool: 'list_directory',
            args: { path },
            timeout: 10000,
        });

        if (!result.success) {
            return `❌ Error: ${result.error}`;
        }

        const { files = [], directories = [] } = result.data;

        let response = `📁 **${path}**\n\n`;

        if (directories.length > 0) {
            response += `📂 **Directories** (${directories.length}):\n`;
            response += directories.slice(0, 10).map(d => `  • ${d}`).join('\n');
            if (directories.length > 10) {
                response += `\n  ... and ${directories.length - 10} more`;
            }
            response += '\n\n';
        }

        if (files.length > 0) {
            response += `📄 **Files** (${files.length}):\n`;
            response += files.slice(0, 15).map(f => `  • ${f}`).join('\n');
            if (files.length > 15) {
                response += `\n  ... and ${files.length - 15} more`;
            }
        }

        return response;
    } catch (err) {
        return `❌ Error: ${err.message}`;
    }
}
```

### /search Command

**File**: `~/.openclaw/extensions/vibetech-bridge/commands/search.js`

```javascript
/**
 * /search <query>
 * Search for repositories on GitHub
 */
export default async function searchCommand(context, extension) {
    const { args } = context;
    const bridge = extension.getBridge();

    if (!bridge?.isConnected) {
        return '❌ Bridge not connected';
    }

    if (args.length === 0) {
        return '❌ Usage: /search <query>\n\nExample: /search vibetech';
    }

    const query = args.join(' ');

    try {
        const result = await bridge.callTool({
            server: 'codeberg',
            tool: 'codeberg_search_repos',
            args: { query, limit: 5 },
            timeout: 15000,
        });

        if (!result.success) {
            return `❌ Error: ${result.error}`;
        }

        const repos = result.data.repositories || [];

        if (repos.length === 0) {
            return `🔍 No repositories found for "${query}"`;
        }

        let response = `🔍 **Search Results for "${query}"**\n\n`;

        repos.forEach((repo, i) => {
            response += `${i + 1}. **${repo.full_name}**\n`;
            response += `   ${repo.description || 'No description'}\n`;
            response += `   ⭐ ${repo.stars_count} | 🍴 ${repo.forks_count}\n`;
            response += `   🔗 ${repo.html_url}\n\n`;
        });

        return response;
    } catch (err) {
        return `❌ Error: ${err.message}`;
    }
}
```

---

## Common Use Cases

### Use Case 1: File Operations

```javascript
// List files
await bridge.callTool({
    server: 'filesystem',
    tool: 'list_directory',
    args: { path: 'C:\\dev' }
});

// Read file
await bridge.callTool({
    server: 'filesystem',
    tool: 'read_file',
    args: { path: 'C:\\dev\\README.md' }
});

// Write file
await bridge.callTool({
    server: 'filesystem',
    tool: 'write_file',
    args: {
        path: 'C:\\dev\\output.txt',
        content: 'Hello from OpenClaw!'
    }
});
```

### Use Case 2: Code Search

```javascript
// Search GitHub repositories
await bridge.callTool({
    server: 'codeberg',
    tool: 'codeberg_search_repos',
    args: { query: 'vibetech', limit: 10 }
});

// Get repository details
await bridge.callTool({
    server: 'codeberg',
    tool: 'codeberg_get_repo_details',
    args: { owner: 'freshwaterbruce2', repo: 'Monorepo' }
});

// Read file from repository
await bridge.callTool({
    server: 'codeberg',
    tool: 'codeberg_read_file',
    args: {
        owner: 'freshwaterbruce2',
        repo: 'Monorepo',
        path: 'README.md'
    }
});
```

### Use Case 3: Desktop Automation

```javascript
// Take screenshot
await bridge.callTool({
    server: 'desktop-commander',
    tool: 'dc_take_screenshot',
    args: { path: 'D:\\screenshots\\capture.png' }
});

// Get system info
await bridge.callTool({
    server: 'desktop-commander',
    tool: 'dc_get_system_info',
    args: {}
});

// Run PowerShell command
await bridge.callTool({
    server: 'desktop-commander',
    tool: 'dc_run_powershell',
    args: { command: 'Get-Process | Select-Object -First 5' }
});
```

### Use Case 4: Multi-Step Tasks

```javascript
// Complex workflow with multiple steps
await bridge.dispatchTask({
    description: 'Analyze repository structure',
    priority: 'high',
    steps: [
        {
            server: 'codeberg',
            tool: 'codeberg_search_repos',
            args: { query: 'vibetech' }
        },
        {
            server: 'filesystem',
            tool: 'list_directory',
            args: { path: 'C:\\dev' }
        },
        {
            server: 'sequential-thinking',
            tool: 'sequentialthinking',
            args: {
                thought: 'Analyze the repository structure and file organization',
                thoughtNumber: 1,
                totalThoughts: 1,
                nextThoughtNeeded: false
            }
        }
    ],
    timeout: 120000
});
```

---

## Error Handling

### Best Practices

```javascript
import { OpenClawBridge } from '@vibetech/openclaw-bridge';

async function safelyCallTool(server, tool, args) {
    const bridge = new OpenClawBridge({
        autoReconnect: true,
        debug: false,
    });

    try {
        // Connect with timeout
        const connectTimeout = setTimeout(() => {
            throw new Error('Connection timeout (10s)');
        }, 10000);

        await bridge.connect();
        clearTimeout(connectTimeout);

        // Check connection health
        const health = await bridge.healthCheck();
        if (!health.healthy) {
            throw new Error(`Bridge unhealthy: ${health.error}`);
        }

        // Call tool with error handling
        const result = await bridge.callTool({
            server,
            tool,
            args,
            timeout: 30000,
        });

        if (!result.success) {
            console.error(`Tool error: ${result.error}`);
            return {
                success: false,
                error: result.error,
                userMessage: `❌ Failed to execute ${server}.${tool}: ${result.error}`
            };
        }

        return {
            success: true,
            data: result.data,
            userMessage: `✅ Success (${result.durationMs}ms)`
        };

    } catch (err) {
        console.error('Bridge exception:', err);

        // User-friendly error messages
        if (err.code === 'ECONNREFUSED') {
            return {
                success: false,
                error: err.message,
                userMessage: '❌ Cannot connect to IPC Bridge. Please ensure it\'s running on port 5004.'
            };
        }

        return {
            success: false,
            error: err.message,
            userMessage: `❌ Unexpected error: ${err.message}`
        };

    } finally {
        // Always clean up
        bridge.disconnect();
    }
}
```

### Retry Logic

```javascript
async function callToolWithRetry(bridge, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await bridge.callTool(options);

            if (result.success) {
                return result;
            }

            // Don't retry on non-retryable errors
            if (result.error.includes('not found') || result.error.includes('invalid')) {
                throw new Error(result.error);
            }

            console.log(`Attempt ${attempt}/${maxRetries} failed: ${result.error}`);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }

        } catch (err) {
            if (attempt === maxRetries) {
                throw err;
            }
            console.log(`Attempt ${attempt}/${maxRetries} exception: ${err.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }

    throw new Error('Max retries exceeded');
}
```

---

## Testing

### Test Extension Locally

```bash
# 1. Start IPC Bridge
pnpm --filter ipc-bridge dev

# 2. Test bridge connection
openclaw-dispatch ping

# 3. Load extension in OpenClaw
openclaw extensions load ~/.openclaw/extensions/vibetech-bridge

# 4. Test commands
openclaw test-command /mcp filesystem list_directory {"path":"./"}
openclaw test-command /files ./
openclaw test-command /search vibetech
```

### Integration Tests

Create test script: `~/.openclaw/extensions/vibetech-bridge/tests/integration.test.js`

```javascript
import { OpenClawBridge } from '@vibetech/openclaw-bridge';

async function runTests() {
    console.log('Starting integration tests...\n');

    const bridge = new OpenClawBridge({
        url: 'ws://localhost:5004',
        autoReconnect: false,
        debug: true,
    });

    try {
        // Test 1: Connection
        console.log('Test 1: Connection');
        await bridge.connect();
        console.log('✅ Connected\n');

        // Test 2: Health check
        console.log('Test 2: Health Check');
        const health = await bridge.healthCheck();
        console.log(`✅ Healthy: ${health.healthy}, Latency: ${health.latencyMs}ms\n`);

        // Test 3: Filesystem
        console.log('Test 3: List Directory');
        const files = await bridge.callTool({
            server: 'filesystem',
            tool: 'list_directory',
            args: { path: './' }
        });
        console.log(`✅ Found ${files.data.files?.length || 0} files\n`);

        // Test 4: GitHub
        console.log('Test 4: Search Repositories');
        const search = await bridge.callTool({
            server: 'codeberg',
            tool: 'codeberg_search_repos',
            args: { query: 'vibetech', limit: 3 }
        });
        console.log(`✅ Found ${search.data.repositories?.length || 0} repos\n`);

        console.log('All tests passed! ✅');

    } catch (err) {
        console.error('❌ Test failed:', err.message);
        process.exit(1);
    } finally {
        bridge.disconnect();
    }
}

runTests();
```

Run tests:
```bash
node ~/.openclaw/extensions/vibetech-bridge/tests/integration.test.js
```

---

## Production Deployment

### Environment Configuration

**File**: `~/.openclaw/.env`

```bash
# IPC Bridge
IPC_BRIDGE_URL=ws://localhost:5004
IPC_BRIDGE_TIMEOUT=30000

# Debug (set to false in production)
OPENCLAW_DEBUG=false
VIBETECH_BRIDGE_DEBUG=false

# Performance
VIBETECH_MAX_RECONNECT_ATTEMPTS=5
VIBETECH_RECONNECT_DELAY=5000
```

### Health Monitoring

Add health check to extension:

```javascript
// In extension index.js
setInterval(async () => {
    if (!this.bridge?.isConnected) {
        console.warn('[VibeTech Bridge] Not connected, attempting reconnect...');
        try {
            await this.bridge.connect();
        } catch (err) {
            console.error('[VibeTech Bridge] Reconnect failed:', err.message);
        }
        return;
    }

    const health = await this.bridge.healthCheck();
    if (!health.healthy) {
        console.warn(`[VibeTech Bridge] Unhealthy: ${health.error}, Latency: ${health.latencyMs}ms`);
    }
}, 60000); // Check every minute
```

### Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.VIBETECH_BRIDGE_DEBUG === 'true' ? 'debug' : 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: '~/.openclaw/logs/vibetech-bridge.log' }),
        new winston.transports.Console()
    ]
});

// Use in handlers
logger.info('Tool called', { server, tool, args });
logger.error('Tool failed', { error: err.message, stack: err.stack });
```

---

## Next Steps

1. **Install Examples**: Copy examples to `~/.openclaw/extensions/vibetech-bridge/`
2. **Configure OpenClaw**: Update `~/.openclaw/openclaw.json`
3. **Start IPC Bridge**: `pnpm --filter ipc-bridge dev`
4. **Test Integration**: Send `/mcp filesystem list_directory {"path":"./"}` to OpenClaw
5. **Monitor Logs**: Check `~/.openclaw/logs/` for issues

---

## Support

- **Documentation**: See `packages/openclaw-bridge/README.md`
- **Examples**: See `packages/openclaw-bridge/examples/`
- **Issues**: Report at VibeTech Monorepo GitHub

---

**Integration Complete!** 🎊 OpenClaw can now access all MCP servers in the Antigravity ecosystem.
