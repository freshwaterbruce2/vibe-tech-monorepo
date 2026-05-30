import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface NxMcpClientOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export class NxMcpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private readonly opts: Required<Pick<NxMcpClientOptions, 'command' | 'args' | 'connectTimeoutMs' | 'requestTimeoutMs'>> & { cwd?: string };
  private connected = false;

  constructor(opts: NxMcpClientOptions = {}) {
    const isWin = process.platform === 'win32';
    this.opts = {
      command: opts.command ?? (isWin ? 'pnpm.cmd' : 'pnpm'),
      args: opts.args ?? ['exec', 'nx-mcp', '--transport', 'stdio'],
      cwd: opts.cwd ?? 'C:\\dev',
      connectTimeoutMs: opts.connectTimeoutMs ?? 8_000,
      requestTimeoutMs: opts.requestTimeoutMs ?? 15_000
    };
  }

  async connect(): Promise<boolean> {
    if (this.connected) return true;
    try {
      this.transport = new StdioClientTransport({
        command: this.opts.command,
        args: this.opts.args,
        cwd: this.opts.cwd
      });
      this.client = new Client({ name: 'command-center-nx', version: '0.1.0' }, { capabilities: {} });
      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('connect timeout')), this.opts.connectTimeoutMs)
      );
      await Promise.race([connectPromise, timeoutPromise]);
      this.connected = true;
      return true;
    } catch {
      await this.disconnect();
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try { await this.client?.close(); } catch {}
    try { await this.transport?.close(); } catch {}
    this.client = null;
    this.transport = null;
    this.connected = false;
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.connected) {
      const ok = await this.connect();
      if (!ok) {
        throw new Error('Nx MCP server not reachable');
      }
    }
    const client = this.client;
    if (!client) {
      throw new Error('Nx MCP client unavailable');
    }
    const response = await client.callTool(
      { name, arguments: args },
      undefined,
      { timeout: this.opts.requestTimeoutMs }
    );
    return response;
  }
}
