import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createLogger } from '@vibetech/logger';
import type { McpServerConfig } from './config.js';

const logger = createLogger('McpClientManager');

/**
 * Manages MCP client connections to tool servers.
 * Spawns server processes on-demand and caches connections.
 */
export class McpClientManager {
    private clients = new Map<string, Client>();
    private configs: Record<string, McpServerConfig>;

    constructor(configs: Record<string, McpServerConfig>) {
        this.configs = configs;
    }

    /** Get or create a client for the named MCP server */
    async getClient(serverName: string): Promise<Client> {
        const existing = this.clients.get(serverName);
        if (existing) return existing;

        const config = this.configs[serverName];
        if (!config) {
            throw new Error(
                `Unknown MCP server: "${serverName}". Available: ${Object.keys(this.configs).join(', ')}`
            );
        }

        const transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: { ...process.env, ...config.env } as Record<string, string>,
        });

        const client = new Client(
            { name: `mcp-gateway/${serverName}`, version: '1.0.0' },
            { capabilities: {} }
        );

        await client.connect(transport);
        this.clients.set(serverName, client);
        logger.info(`Connected to MCP server: ${serverName}`);
        return client;
    }

    /** Call a tool on a specific MCP server */
    async callTool(
        serverName: string,
        toolName: string,
        args: Record<string, unknown>
    ): Promise<{ success: boolean; data?: unknown; error?: string }> {
        const startMs = performance.now();
        try {
            const client = await this.getClient(serverName);
            const result = await client.callTool({ name: toolName, arguments: args });
            const elapsed = Math.round(performance.now() - startMs);
            logger.info(`${serverName}.${toolName} completed in ${elapsed}ms`);
            return { success: true, data: result };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`${serverName}.${toolName} failed: ${message}`);
            return { success: false, error: message };
        }
    }

    /** List tools available on a specific MCP server (full definitions) */
    async listTools(serverName: string) {
        const client = await this.getClient(serverName);
        const result = await client.listTools();
        return result.tools;
    }

    /** Disconnect all clients */
    async shutdown(): Promise<void> {
        for (const [name, client] of this.clients) {
            try {
                await client.close();
                logger.info(`Disconnected from: ${name}`);
            } catch {
                // Best effort cleanup
            }
        }
        this.clients.clear();
    }
}
