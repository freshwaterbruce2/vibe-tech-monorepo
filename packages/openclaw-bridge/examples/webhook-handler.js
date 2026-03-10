#!/usr/bin/env node
/**
 * OpenClaw Webhook Handler for MCP Bridge
 *
 * Installation:
 * 1. Copy to: ~/.openclaw/webhooks/on_message.js
 * 2. Configure in: ~/.openclaw/openclaw.json
 * 3. Restart OpenClaw
 *
 * Usage:
 * Send message: /mcp <server> <tool> <json-args>
 * Example: /mcp filesystem list_directory {"path":"./"}
 */

import { OpenClawBridge } from '@vibetech/openclaw-bridge';

export default async function onMessage(message) {
    // Only process /mcp commands
    if (!message.text || !message.text.startsWith('/mcp')) {
        return null;
    }

    const bridge = new OpenClawBridge({
        url: process.env.IPC_BRIDGE_URL || 'ws://localhost:5004',
        autoReconnect: true,
        debug: process.env.OPENCLAW_DEBUG === 'true',
    });

    try {
        // Connect to IPC Bridge
        await bridge.connect();

        // Parse: /mcp <server> <tool> <args>
        const parts = message.text.split(' ');
        const [, server, tool, ...argParts] = parts;

        if (!server || !tool) {
            return formatHelp();
        }

        // Parse JSON args
        const args = argParts.length > 0
            ? JSON.parse(argParts.join(' '))
            : {};

        // Call MCP tool
        const result = await bridge.callTool({
            server,
            tool,
            args,
            timeout: 30000,
        });

        if (result.success) {
            return formatSuccess(server, tool, result);
        } else {
            return formatError(result.error);
        }

    } catch (err) {
        return formatException(err);
    } finally {
        bridge.disconnect();
    }
}

function formatHelp() {
    return `📡 **MCP Bridge Usage**

**Syntax**: \`/mcp <server> <tool> [args]\`

**Examples**:
• \`/mcp filesystem list_directory {"path":"./"}\`
• \`/mcp codeberg codeberg_search_repos {"query":"vibetech"}\`
• \`/mcp desktop-commander dc_get_system_info {}\`

**Available Servers**:
• filesystem - File operations
• codeberg - GitHub repository search
• desktop-commander - Desktop automation
• sequential-thinking - AI reasoning`;
}

function formatSuccess(server, tool, result) {
    const data = JSON.stringify(result.data, null, 2);
    const preview = data.length > 500
        ? data.substring(0, 500) + '\n... (truncated)'
        : data;

    return `✅ **${server}.${tool}** (${result.durationMs}ms)

\`\`\`json
${preview}
\`\`\``;
}

function formatError(error) {
    return `❌ **MCP Error**

${error}

💡 **Tips**:
• Check server name is correct
• Verify tool exists on server
• Ensure args are valid JSON`;
}

function formatException(err) {
    if (err.code === 'ECONNREFUSED') {
        return `❌ **Connection Failed**

Cannot connect to IPC Bridge on port 5004.

**Fix**:
1. Start IPC Bridge: \`pnpm --filter ipc-bridge dev\`
2. Verify port 5004 is available
3. Check firewall settings`;
    }

    return `❌ **Exception**: ${err.message}`;
}
