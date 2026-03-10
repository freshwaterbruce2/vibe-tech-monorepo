/**
 * Type declarations for @nova/core/abstraction and @nova/types
 * These modules don't exist as separate packages in the monorepo.
 * Stubs provide the minimum type surface used by HttpAgentAdapter.
 */

declare module '@nova/core/abstraction' {
  export abstract class BaseAgentAdapter {
    abstract chat(message: string, projectId?: string): Promise<string>;
    abstract getStatus(): Promise<import('@nova/types').AgentState>;
    abstract searchWeb(query: string): Promise<import('@nova/types').WebSearchResult[]>;
    abstract updateCapabilities(capabilities: string[]): Promise<void>;
    abstract searchMemories(query: string): Promise<string[]>;
    abstract sendIpcMessage(message: any): Promise<void>;
  }
}

declare module '@nova/types' {
  export interface AgentState {
    status: 'idle' | 'busy' | 'error' | 'offline';
    currentTask?: string;
    capabilities?: string[];
  }

  export interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
  }
}
