import { config } from '../config';

// Inlined from @nova/types — eliminates workspace dependency for Metro bundling
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

// Inlined from @nova/core/abstraction — pure abstract class, zero runtime logic
export abstract class BaseAgentAdapter {
  abstract chat(message: string, projectId?: string): Promise<string>;
  abstract getStatus(): Promise<AgentState>;
  abstract searchWeb(query: string): Promise<WebSearchResult[]>;
  abstract updateCapabilities(capabilities: string[]): Promise<void>;
  abstract searchMemories(query: string): Promise<string[]>;
  abstract listProjects(): Promise<ProjectInfo[]>;
  abstract getProjectState(projectPath: string): Promise<unknown>;
  abstract sendIpcMessage(message: Record<string, unknown>): Promise<void>;
}

interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  project_type: string;
  has_state: boolean;
}

interface RetryOptions {
  maxRetries: number;
  timeoutMs: number;
}

const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 1,
  timeoutMs: config.API_TIMEOUT,
};

export class HttpAgentAdapter extends BaseAgentAdapter {
  private baseUrl: string;
  private bridgeToken: string;
  private retryOptions: RetryOptions;

  constructor(baseUrl: string = config.API_URL, retryOptions?: Partial<RetryOptions>) {
    super();
    this.baseUrl = baseUrl;
    this.bridgeToken = config.BRIDGE_TOKEN;
    this.retryOptions = { ...DEFAULT_RETRY, ...retryOptions };
  }

  /** Update the bridge URL (e.g. when user changes it in Settings) */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /** Update the bridge token */
  setBridgeToken(token: string): void {
    this.bridgeToken = token;
  }

  private async fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.retryOptions.timeoutMs);

    const doFetch = async (): Promise<Response> => {
      try {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${this.bridgeToken}`);

        const response = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal,
        });
        return response;
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      return await doFetch();
    } catch (error) {
      if (this.retryOptions.maxRetries > 0) {
        return doFetch();
      }
      throw error;
    }
  }

  async chat(message: string, projectId?: string): Promise<string> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, projectId }),
    });

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content;
  }

  async getStatus(): Promise<AgentState> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/status`);
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }
    return response.json();
  }

  async getHealth(): Promise<{ ok: boolean; uptime: number }> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }

  async searchMemories(query: string): Promise<string[]> {
    const response = await this.fetchWithRetry(
      `${this.baseUrl}/memories/search?query=${encodeURIComponent(query)}`,
    );
    if (!response.ok) {
      throw new Error(`Memory search failed: ${response.status}`);
    }
    const data = await response.json();
    return data.results ?? [];
  }

  async getProjects(): Promise<Array<{ id: string; name: string; status: string }>> {
    const projects = await this.listProjects();
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: (p as any).status ?? p.project_type,
    }));
  }

  async listProjects(): Promise<ProjectInfo[]> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects`);
    if (!response.ok) {
      throw new Error(`Projects fetch failed: ${response.status}`);
    }
    return response.json();
  }

  async getProjectState(projectPath: string): Promise<unknown> {
    const projects = await this.listProjects();
    const project = projects.find((p) => p.path === projectPath || p.id === projectPath);
    if (!project) {
      throw new Error(`Project not found: ${projectPath}`);
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/projects/${project.id}`);
    if (!response.ok) {
      throw new Error(`Project state fetch failed: ${response.status}`);
    }
    const data = await response.json();
    return data.state ?? null;
  }

  async registerDevice(pushToken: string): Promise<void> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken }),
    });

    if (!response.ok) {
      throw new Error(`Device registration failed: ${response.status} ${response.statusText}`);
    }
  }

  async searchWeb(_query: string): Promise<WebSearchResult[]> {
    return [];
  }

  async updateCapabilities(_capabilities: string[]): Promise<void> {
    // Not implemented on mobile
  }

  async sendIpcMessage(_message: unknown): Promise<void> {
    // Not applicable for mobile bridge
  }
}
