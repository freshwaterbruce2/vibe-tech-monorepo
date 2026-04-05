import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CONFIG, PATHS } from '../config.js';
import type { MemoryRecord, MemorySearchOptions, StoredMemoryRecord } from '../types.js';

interface HttpToolResult {
  content?: Array<{ type: string; text?: string }>;
}

export interface AgentLearningContext {
  agent: string;
  recentExecutions: Array<{
    taskType: string;
    description: string;
    success: boolean;
    executionTime: number;
    timestamp: string;
  }>;
  knownPatterns: Array<{
    type: string;
    description: string;
    confidence: number;
    frequency: number;
  }>;
  knownMistakes: Array<{
    type: string;
    description: string;
    severity: string;
    remediation?: string;
  }>;
  stats: {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
  };
}

export interface LearningSyncResult {
  executionsIngested: number;
  patternsIngested: number;
  mistakesIngested: number;
  errors: string[];
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9-]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreRecord(record: StoredMemoryRecord, queryTokens: string[]): number {
  const haystack = tokenize(
    [record.title, record.text, JSON.stringify(record.metadata ?? {}), ...(record.tags ?? [])].join(
      ' ',
    ),
  );
  if (queryTokens.length === 0 || haystack.length === 0) {
    return 0;
  }

  const matched = queryTokens.filter((token) => haystack.includes(token)).length;
  return matched / queryTokens.length;
}

export class MemoryClient {
  private readonly storagePath: string;

  public constructor(
    private readonly baseUrl = CONFIG.MEMORY_MCP_HTTP_URL,
    storageRoot = PATHS.memoryDir,
  ) {
    mkdirSync(storageRoot, { recursive: true });
    this.storagePath = join(storageRoot, 'records.json');
  }

  public async add(record: MemoryRecord): Promise<boolean> {
    const storedRecord = this.persistLocal(record);

    const remoteStored = await this.tryRemoteWrite(record);
    if (!remoteStored && this.baseUrl) {
      storedRecord.metadata = {
        ...(storedRecord.metadata ?? {}),
        remoteWrite: 'unavailable',
      };
      this.saveAll(
        this.readAll().map((entry) => (entry.id === storedRecord.id ? storedRecord : entry)),
      );
    }

    return true;
  }

  public async logAntiPattern(
    title: string,
    text: string,
    metadata: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this.add({
      kind: 'semantic',
      title,
      text,
      tags: ['anti-pattern', 'rejected-candidate'],
      metadata: {
        category: 'anti-pattern',
        successful: false,
        ...metadata,
      },
    });
  }

  public getRecent(options: MemorySearchOptions = {}): StoredMemoryRecord[] {
    return this.filterRecords(this.readAll(), options)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, options.limit ?? 10);
  }

  public search(query: string, options: MemorySearchOptions = {}): StoredMemoryRecord[] {
    const queryTokens = tokenize(query);

    return this.filterRecords(this.readAll(), options)
      .map((record) => ({ record, score: scoreRecord(record, queryTokens) }))
      .filter((entry) => entry.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || right.record.createdAt.localeCompare(left.record.createdAt),
      )
      .slice(0, options.limit ?? 10)
      .map((entry) => entry.record);
  }

  private filterRecords(
    records: StoredMemoryRecord[],
    options: MemorySearchOptions,
  ): StoredMemoryRecord[] {
    return records.filter((record) => {
      if (options.kind && record.kind !== options.kind) {
        return false;
      }

      if (options.tag && !(record.tags ?? []).includes(options.tag)) {
        return false;
      }

      return true;
    });
  }

  private persistLocal(record: MemoryRecord): StoredMemoryRecord {
    const storedRecord: StoredMemoryRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      createdAt: record.createdAt ?? new Date().toISOString(),
      tags: [...new Set(record.tags ?? [])],
      metadata: {
        ...(record.metadata ?? {}),
        title: record.title,
      },
    };

    const records = this.readAll();
    records.push(storedRecord);
    this.saveAll(records);
    return storedRecord;
  }

  private readAll(): StoredMemoryRecord[] {
    try {
      return safeJsonParse<StoredMemoryRecord[]>(readFileSync(this.storagePath, 'utf-8'), []);
    } catch {
      return [];
    }
  }

  private saveAll(records: StoredMemoryRecord[]): void {
    writeFileSync(this.storagePath, JSON.stringify(records, null, 2), 'utf-8');
  }

  /**
   * Fetch per-agent learning context (recent executions, known patterns, mistakes)
   * from the memory-mcp LearningBridge. Returns null on failure.
   */
  public async getAgentLearningContext(
    agentId: string,
    limit = 10,
  ): Promise<AgentLearningContext | null> {
    const result = await this.callRemoteTool('memory_learning_agent_context', { agentId, limit });
    if (!result) {
      return null;
    }
    return safeJsonParse<AgentLearningContext | null>(result, null);
  }

  /**
   * Trigger a sync from the learning DB into semantic memory. Returns null on failure.
   * @param sinceTimestamp optional ms-epoch to sync from
   */
  public async syncFromLearning(sinceTimestamp?: number): Promise<LearningSyncResult | null> {
    const args: Record<string, unknown> = {};
    if (typeof sinceTimestamp === 'number') {
      args.since = sinceTimestamp;
    }
    const result = await this.callRemoteTool('memory_learning_sync', args);
    if (!result) {
      return null;
    }
    return safeJsonParse<LearningSyncResult | null>(result, null);
  }

  /**
   * Generic JSON-RPC tool caller for memory-mcp. Returns raw text of first text-content block,
   * or null on any failure (network, non-OK, no content).
   */
  private async callRemoteTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string | null> {
    if (!this.baseUrl) {
      return null;
    }
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `${Date.now()}`,
          method: 'tools/call',
          params: { name: toolName, arguments: args },
        }),
      });
      if (!response.ok) {
        return null;
      }
      const body = (await response.json()) as { result?: HttpToolResult };
      const textBlock = body.result?.content?.find((entry) => entry.type === 'text');
      return textBlock?.text ?? null;
    } catch {
      return null;
    }
  }

  private async tryRemoteWrite(record: MemoryRecord): Promise<boolean> {
    const method = record.kind === 'episodic' ? 'memory_add_episodic' : 'memory_add_semantic';

    const payload =
      record.kind === 'episodic'
        ? {
            sourceId: 'agent-engine',
            query: record.title,
            response: record.text,
            metadata: record.metadata,
          }
        : {
            text: record.text,
            category:
              record.kind === 'policy'
                ? 'policy'
                : ((record.metadata?.category as string | undefined) ?? 'agent-engine'),
            importance:
              typeof record.metadata?.importance === 'number' ? record.metadata.importance : 7,
            metadata: {
              title: record.title,
              tags: record.tags,
              ...record.metadata,
            },
          };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `${Date.now()}`,
          method: 'tools/call',
          params: {
            name: method,
            arguments: payload,
          },
        }),
      });

      if (!response.ok) {
        return false;
      }

      const body = (await response.json()) as { result?: HttpToolResult };
      return Boolean(body.result?.content?.some((entry) => entry.type === 'text'));
    } catch {
      return false;
    }
  }
}
