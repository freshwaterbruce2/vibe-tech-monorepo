import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { RagSearchQuery, RagSearchResult, RagHit } from '../../shared/types';

export interface RagClientOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export class RagClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private readonly opts: Required<Pick<RagClientOptions, 'command' | 'args' | 'connectTimeoutMs' | 'requestTimeoutMs'>> & { cwd?: string };
  private connected = false;

  constructor(opts: RagClientOptions = {}) {
    this.opts = {
      command: opts.command ?? 'node.exe',
      args: opts.args ?? ['C:\\dev\\apps\\mcp-rag-server\\dist\\index.js'],
      cwd: opts.cwd,
      connectTimeoutMs: opts.connectTimeoutMs ?? 5_000,
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
      this.client = new Client({ name: 'command-center', version: '0.1.0' }, { capabilities: {} });
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

  async search(query: RagSearchQuery): Promise<RagSearchResult> {
    const start = Date.now();
    const baseline: Omit<RagSearchResult, 'source'> = { query: query.query, hits: [], latencyMs: 0 };

    if (!this.connected) {
      const ok = await this.connect();
      if (!ok) {
        return { ...baseline, latencyMs: Date.now() - start, source: 'unavailable', error: 'rag server not reachable' };
      }
    }

    const client = this.client;
    if (!client) {
      return { ...baseline, latencyMs: Date.now() - start, source: 'unavailable', error: 'rag client unavailable' };
    }

    try {
      const response = await client.callTool(
        { name: 'rag_search', arguments: { query: query.query, topK: query.topK ?? 8, filter: query.filter } },
        undefined,
        { timeout: this.opts.requestTimeoutMs }
      );
      const hits = this.parseHits(response);
      return { ...baseline, hits, latencyMs: Date.now() - start, source: 'mcp-rag-server' };
    } catch (err) {
      return { ...baseline, latencyMs: Date.now() - start, source: 'unavailable', error: (err as Error).message };
    }
  }

  private parseHits(response: unknown): RagHit[] {
    const r = response as { content?: Array<{ type?: string; text?: string }> };
    if (!Array.isArray(r.content)) return [];
    for (const block of r.content) {
      if (block.type === 'text' && typeof block.text === 'string') {
        try {
          const parsed = JSON.parse(block.text) as { hits?: unknown[] };
          if (!Array.isArray(parsed.hits)) continue;
          return parsed.hits.map((h): RagHit => {
            const hit = h as Partial<RagHit>;
            return {
              score: typeof hit.score === 'number' ? hit.score : 0,
              path: typeof hit.path === 'string' ? hit.path : '',
              language: typeof hit.language === 'string' ? hit.language : null,
              snippet: typeof hit.snippet === 'string' ? hit.snippet : '',
              startLine: typeof hit.startLine === 'number' ? hit.startLine : null,
              endLine: typeof hit.endLine === 'number' ? hit.endLine : null
            };
          });
        } catch { /* fall through */ }
      }
    }
    return [];
  }
}
