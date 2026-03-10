#!/usr/bin/env node
/**
 * /mcp Command Handler
 *
 * Call any MCP tool via the bridge
 * Usage: /mcp <server> <tool> [args]
 */

export default async function mcpCommand(context, extension) {
    const { args, message, platform } = context;
    const bridge = extension.getBridge();

    // Check connection
    if (!bridge || !bridge.isConnected) {
        return formatConnectionError(extension);
    }

    // Parse arguments
    if (args.length < 2) {
        return formatHelp();
    }

    const [server, tool, ...jsonArgs] = args;

    // Parse JSON args (or default to {})
    let toolArgs;
    try {
        toolArgs = jsonArgs.length > 0
            ? JSON.parse(jsonArgs.join(' '))
            : {};
    } catch (err) {
        return `❌ **Invalid JSON args**

Error: ${err.message}

**Tip**: Args must be valid JSON
Example: \`/mcp filesystem list_directory {"path":"./"}\``;
    }

    // Call MCP tool
    try {
        const result = await bridge.callTool({
            server,
            tool,
            args: toolArgs,
            timeout: extension.config.default_timeout,
        });

        if (result.success) {
            return formatSuccess(server, tool, result, platform);
        } else {
            return formatToolError(server, tool, result.error);
        }
    } catch (err) {
        return formatException(err);
    }
}

function formatHelp() {
    return `📡 **MCP Bridge - Call Any Tool**

**Syntax**:
\`/mcp <server> <tool> [args]\`

**Available Servers**:
• \`filesystem\` - File operations (read, write, list, search)
• \`codeberg\` - GitHub repository search and file reading
• \`desktop-commander\` - Desktop automation (Windows)
• \`sequential-thinking\` - AI reasoning engine

**Examples**:

**List files**:
\`/mcp filesystem list_directory {"path":"./"}\`

**Search repos**:
\`/mcp codeberg codeberg_search_repos {"query":"vibetech","limit":5}\`

**System info**:
\`/mcp desktop-commander dc_get_system_info {}\`

**AI thinking**:
\`/mcp sequential-thinking sequentialthinking {"thought":"Analyze this","thoughtNumber":1}\`

💡 **Tip**: Args must be valid JSON (use \`{}\` for no args)`;
}

function formatConnectionError(extension) {
    const state = extension.getConnectionState();

    return `❌ **Not Connected to IPC Bridge**

**Current State**: ${state}

**To Fix**:
1. Ensure IPC Bridge is running:
   \`pnpm --filter ipc-bridge dev\`

2. Check connection:
   \`openclaw-dispatch ping\`

3. Verify configuration:
   URL: ${extension.config.ipc_bridge_url}

**Auto-reconnect**: ${extension.config.auto_reconnect ? 'Enabled ✅' : 'Disabled ❌'}

💡 Try again in a few seconds if auto-reconnect is enabled`;
}

function formatSuccess(server, tool, result, platform) {
    const data = JSON.stringify(result.data, null, 2);

    // Truncate for messaging platforms
    const maxLength = platform === 'telegram' ? 4000 : 2000;
    const truncated = data.length > maxLength;
    const preview = truncated
        ? data.substring(0, maxLength) + '\n... (truncated)'
        : data;

    let response = `✅ **${server}.${tool}** completed (${result.durationMs}ms)\n\n`;

    if (platform === 'telegram' || platform === 'discord') {
        response += `\`\`\`json\n${preview}\n\`\`\``;
    } else {
        response += preview;
    }

    if (truncated) {
        response += `\n\n📝 Full output: ${data.length} characters`;
    }

    return response;
}

function formatToolError(server, tool, error) {
    return `❌ **${server}.${tool} Failed**

**Error**: ${error}

**Common Issues**:
• Server name incorrect (check available servers)
• Tool doesn't exist on this server
• Invalid arguments for this tool
• Tool execution failed

💡 **Tip**: Use \`/mcp help\` to see examples`;
}

function formatException(err) {
    if (err.message.includes('timeout') || err.message.includes('Timeout')) {
        return `⏱️ **Operation Timed Out**

The operation took too long to complete.

**Possible Causes**:
• MCP server is slow or unresponsive
• Operation is computationally expensive
• Network issues

💡 **Try**: Increase timeout or simplify the request`;
    }

    if (err.code === 'ECONNREFUSED') {
        return `❌ **Connection Refused**

Cannot connect to IPC Bridge on port 5004.

**Fix**:
1. Start IPC Bridge: \`pnpm --filter ipc-bridge dev\`
2. Check port 5004 availability
3. Verify firewall settings`;
    }

    return `❌ **Unexpected Error**

${err.message}

💡 **Debug**: Enable debug mode in extension config`;
}
