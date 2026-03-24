import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface McpServerConfig {
    command: string;
    args: string[];
    env: Record<string, string>;
}

export interface GatewayConfig {
    ipcBridgeUrl: string;
    httpPort: number;
    apiKey: string | undefined;
    mcpServers: Record<string, McpServerConfig>;
}

const DEFAULT_IPC_URL = 'ws://localhost:5004';

/** Locate the Antigravity MCP config file */
function findMcpConfigPath(): string {
    const paths = [
        process.env.MCP_CONFIG_PATH,
        join(process.cwd(), '.mcp.json'),
        join(process.cwd(), '..', '..', '.mcp.json'),
        join(homedir(), '.gemini', 'antigravity', 'mcp_config.json'),
        join(homedir(), '.config', 'antigravity', 'mcp_config.json'),
    ].filter((path): path is string => Boolean(path));
    for (const p of paths) {
        if (existsSync(p)) return p;
    }
    throw new Error(
        `MCP config not found. Searched:\n${paths.map((p) => `  - ${p}`).join('\n')}`
    );
}

/** Parse the MCP config and return structured server definitions */
export function loadConfig(): GatewayConfig {
    const configPath = findMcpConfigPath();
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    const servers: Record<string, McpServerConfig> = {};

    const mcpBlock = raw.mcpServers ?? raw;
    for (const [name, def] of Object.entries(mcpBlock)) {
        const d = def as Record<string, unknown>;
        if (typeof d.command !== 'string') continue;
        servers[name] = {
            command: d.command,
            args: Array.isArray(d.args) ? (d.args as string[]) : [],
            env: (d.env as Record<string, string>) ?? {},
        };
    }

    return {
        ipcBridgeUrl: process.env.IPC_BRIDGE_URL ?? DEFAULT_IPC_URL,
        httpPort: parseInt(process.env.GATEWAY_HTTP_PORT ?? '3100', 10),
        apiKey: process.env.GATEWAY_API_KEY,
        mcpServers: servers,
    };
}

/** List available MCP server names */
export function listServers(config: GatewayConfig): string[] {
    return Object.keys(config.mcpServers);
}
