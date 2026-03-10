#!/usr/bin/env node
/**
 * /files Command Handler
 *
 * List files and directories
 * Usage: /files [path]
 */

export default async function filesCommand(context, extension) {
    const { args, platform } = context;
    const bridge = extension.getBridge();

    if (!bridge?.isConnected) {
        return '❌ Not connected to IPC Bridge. Try `/mcp help` for setup.';
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
            return formatError(path, result.error);
        }

        return formatFileList(path, result.data, platform);

    } catch (err) {
        if (err.message.includes('timeout')) {
            return `⏱️ **Timeout**: Listing "${path}" took too long`;
        }
        return `❌ **Error**: ${err.message}`;
    }
}

function formatFileList(path, data, platform) {
    const { files = [], directories = [] } = data;

    if (files.length === 0 && directories.length === 0) {
        return `📂 **${path}** is empty`;
    }

    let response = `📁 **${path}**\n\n`;

    // Directories
    if (directories.length > 0) {
        response += `📂 **Directories** (${directories.length}):\n`;

        const displayDirs = directories.slice(0, 15);
        response += displayDirs.map(d => `  • ${d}/`).join('\n');

        if (directories.length > 15) {
            response += `\n  ... and ${directories.length - 15} more`;
        }

        response += '\n\n';
    }

    // Files
    if (files.length > 0) {
        response += `📄 **Files** (${files.length}):\n`;

        const displayFiles = files.slice(0, 20);
        response += displayFiles.map(f => `  • ${f}`).join('\n');

        if (files.length > 20) {
            response += `\n  ... and ${files.length - 20} more`;
        }
    }

    // Add usage tip
    response += `\n\n💡 **Tip**: Use \`/files <path>\` to explore subdirectories`;

    return response;
}

function formatError(path, error) {
    if (error.includes('not found') || error.includes('does not exist')) {
        return `❌ **Path Not Found**

"${path}" does not exist.

**Examples**:
• \`/files\` - Current directory
• \`/files C:\\dev\` - Windows path
• \`/files /home/user\` - Linux path`;
    }

    if (error.includes('permission denied') || error.includes('access denied')) {
        return `❌ **Permission Denied**

Cannot access "${path}".

**Possible Causes**:
• Insufficient permissions
• Path requires elevation
• Restricted system directory`;
    }

    return `❌ **Error**: ${error}`;
}
