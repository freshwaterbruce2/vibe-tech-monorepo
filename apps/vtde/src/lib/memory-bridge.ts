/**
 * Memory Bridge — connects VTDE to the @vibetech/memory system
 * via the memory-mcp server (HTTP/stdio fallback).
 *
 * Provides session context, semantic search, and decay stats
 * to give the desktop environment persistent memory.
 */

const MEMORY_MCP_PORT = 3200;
const BASE_URL = `http://localhost:${MEMORY_MCP_PORT}`;

export interface MemorySearchResult {
  id: string;
  content: string;
  category: string;
  score: number;
  created_at: string;
}

export interface SessionSummary {
  summary: string;
  key_topics: string[];
  duration_minutes: number;
  memory_count: number;
}

export interface DecayStats {
  total_memories: number;
  decayed_count: number;
  active_count: number;
  avg_score: number;
  oldest_memory: string | null;
}

export interface SessionContext {
  apps_opened: string[];
  session_start: string;
  interactions: number;
}

/**
 * Call a memory-mcp tool via JSON-RPC over HTTP.
 */
async function callMcpTool<T>(tool: string, params: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: tool, arguments: params },
    }),
  });

  if (!response.ok) {
    throw new Error(`Memory MCP error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message ?? 'MCP tool error');
  }

  return data.result?.content?.[0]?.text ? JSON.parse(data.result.content[0].text) : data.result;
}

/** Search semantic memory for context-relevant results */
export async function searchMemory(query: string, limit = 5): Promise<MemorySearchResult[]> {
  try {
    return await callMcpTool<MemorySearchResult[]>('memory_search', { query, limit });
  } catch {
    console.warn('[MemoryBridge] Search unavailable — MCP server not running');
    return [];
  }
}

/** Summarize the current desktop session */
export async function summarizeSession(context: SessionContext): Promise<SessionSummary> {
  try {
    return await callMcpTool<SessionSummary>('memory_summarize_session', {
      session_data: JSON.stringify(context),
    });
  } catch {
    return {
      summary: 'Memory system offline — session not summarized',
      key_topics: [],
      duration_minutes: 0,
      memory_count: 0,
    };
  }
}

/** Get memory decay statistics */
export async function getDecayStats(): Promise<DecayStats> {
  try {
    return await callMcpTool<DecayStats>('memory_decay_stats');
  } catch {
    return {
      total_memories: 0,
      decayed_count: 0,
      active_count: 0,
      avg_score: 0,
      oldest_memory: null,
    };
  }
}

/** Store an episodic memory (app launch, interaction, etc.) */
export async function storeMemory(content: string, category: string): Promise<void> {
  try {
    await callMcpTool('memory_store', { content, category, memory_type: 'episodic' });
  } catch {
    console.warn('[MemoryBridge] Store unavailable');
  }
}

/** Check if the memory MCP server is reachable */
export async function isMemoryAvailable(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { method: 'OPTIONS' });
    return res.ok || res.status === 405;
  } catch {
    return false;
  }
}
