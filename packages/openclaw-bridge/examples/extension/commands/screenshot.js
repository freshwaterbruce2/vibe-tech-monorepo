#!/usr/bin/env node
/**
 * /screenshot Command Handler
 *
 * Take a screenshot (Windows only via desktop-commander)
 * Usage: /screenshot [filename]
 */

export default async function screenshotCommand(context, extension) {
    const { args, platform } = context;
    const bridge = extension.getBridge();

    if (!bridge?.isConnected) {
        return '❌ Not connected to IPC Bridge';
    }

    // Check OS
    if (process.platform !== 'win32') {
        return `❌ **Platform Not Supported**

Screenshots are only available on Windows (via Desktop Commander).

**Your Platform**: ${process.platform}`;
    }

    const filename = args[0] || `screenshot-${Date.now()}.png`;
    const filepath = filename.startsWith('D:') || filename.startsWith('C:')
        ? filename
        : `D:\\screenshots\\${filename}`;

    try {
        const result = await bridge.callTool({
            server: 'desktop-commander',
            tool: 'dc_take_screenshot',
            args: { path: filepath },
            timeout: 10000,
        });

        if (!result.success) {
            return formatError(result.error);
        }

        return formatSuccess(filepath, platform);

    } catch (err) {
        if (err.message.includes('timeout')) {
            return `⏱️ Screenshot timed out`;
        }
        return `❌ Error: ${err.message}`;
    }
}

function formatSuccess(filepath, platform) {
    let response = `📸 **Screenshot Captured**\n\n`;
    response += `**Saved to**: \`${filepath}\`\n\n`;

    if (platform === 'telegram' || platform === 'discord') {
        response += `💡 **Tip**: Use \`/mcp desktop-commander dc_read_file {"path":"${filepath}"}\` to view`;
    } else {
        response += `💡 Screenshot saved successfully`;
    }

    return response;
}

function formatError(error) {
    if (error.includes('permission denied') || error.includes('access denied')) {
        return `❌ **Permission Denied**

Cannot save screenshot.

**Fix**:
• Ensure D:\\screenshots\\ directory exists
• Check write permissions
• Try a different path`;
    }

    if (error.includes('Desktop Commander')) {
        return `❌ **Desktop Commander Not Available**

**Requirements**:
1. Desktop Commander must be running
2. MCP server must be accessible
3. Windows OS required

**Start Desktop Commander**:
\`pnpm --filter desktop-commander-v3 dev\``;
    }

    return `❌ **Screenshot Failed**

${error}

**Common Issues**:
• Desktop Commander not running
• Invalid file path
• Insufficient permissions`;
}
