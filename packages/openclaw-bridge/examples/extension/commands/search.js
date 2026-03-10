#!/usr/bin/env node
/**
 * /search Command Handler
 *
 * Search GitHub repositories
 * Usage: /search <query> [--limit N]
 */

export default async function searchCommand(context, extension) {
    const { args } = context;
    const bridge = extension.getBridge();

    if (!bridge?.isConnected) {
        return '❌ Not connected to IPC Bridge';
    }

    if (args.length === 0) {
        return formatHelp();
    }

    // Parse args: /search <query> [--limit N]
    const limitIndex = args.indexOf('--limit');
    let query, limit = 5;

    if (limitIndex >= 0) {
        query = args.slice(0, limitIndex).join(' ');
        limit = parseInt(args[limitIndex + 1]) || 5;
    } else {
        query = args.join(' ');
    }

    try {
        const result = await bridge.callTool({
            server: 'codeberg',
            tool: 'codeberg_search_repos',
            args: { query, limit: Math.min(limit, 10) },
            timeout: 15000,
        });

        if (!result.success) {
            return `❌ Search failed: ${result.error}`;
        }

        return formatResults(query, result.data);

    } catch (err) {
        if (err.message.includes('timeout')) {
            return `⏱️ Search for "${query}" timed out. Try a more specific query.`;
        }
        return `❌ Error: ${err.message}`;
    }
}

function formatHelp() {
    return `🔍 **Search GitHub Repositories**

**Usage**:
\`/search <query> [--limit N]\`

**Examples**:
\`/search vibetech\`
\`/search "ai assistant" --limit 10\`
\`/search openclaw\`

**Options**:
• \`--limit N\` - Max results (default: 5, max: 10)

💡 **Tip**: Use quotes for multi-word queries`;
}

function formatResults(query, data) {
    const repos = data.repositories || [];

    if (repos.length === 0) {
        return `🔍 **No results for "${query}"**

**Tips**:
• Try different keywords
• Use broader search terms
• Check spelling`;
    }

    let response = `🔍 **Search Results for "${query}"** (${repos.length})\n\n`;

    repos.forEach((repo, i) => {
        response += `**${i + 1}. ${repo.full_name || repo.name}**\n`;

        if (repo.description) {
            response += `   ${repo.description}\n`;
        }

        response += `   ⭐ ${repo.stars_count || 0} | 🍴 ${repo.forks_count || 0}`;

        if (repo.language) {
            response += ` | 📝 ${repo.language}`;
        }

        if (repo.html_url) {
            response += `\n   🔗 ${repo.html_url}`;
        }

        response += '\n\n';
    });

    if (repos.length === 10) {
        response += `💡 Showing max results. Refine your search for better matches.`;
    }

    return response;
}
