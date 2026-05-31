import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AgentStatus {
  status: string;
  version: string;
  uptime: number;
  activeProject: string | null;
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    tasksQueued: number;
  };
}

export class NovaClient {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = env.NOVA_AGENT_URL.replace(/\/$/, '');
    this.token = env.NOVA_AGENT_TOKEN || null;
  }

  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const mergedOptions: RequestInit = {
      ...options,
      headers,
    };

    // Implements a strict timeout of 30 seconds for agent operations
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    mergedOptions.signal = controller.signal;

    try {
      const response = await fetch(url, mergedOptions);
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Sends a conversational chat prompt to Nova Agent.
   * Returns the agent's textual response content.
   */
  public async chat(message: string, projectId: string | null = null): Promise<string> {
    try {
      logger.info(`Sending chat prompt to Nova Agent (project: ${projectId || 'none'})...`);
      
      const response = await this.request('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, projectId }),
      });

      if (!response.ok) {
        throw new Error(`Nova Agent HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { content: string };
      return data.content;
    } catch (err) {
      logger.error('Failed to send chat message to Nova Agent:', {}, err as Error);
      throw err;
    }
  }

  /**
   * Retrieves runtime telemetry and status from Nova Agent.
   */
  public async getStatus(): Promise<AgentStatus> {
    try {
      const response = await this.request('/status');
      if (!response.ok) {
        throw new Error(`Nova Agent status request failed with status: ${response.status}`);
      }
      return await response.json() as AgentStatus;
    } catch (err) {
      logger.error('Failed to retrieve status from Nova Agent:', {}, err as Error);
      throw err;
    }
  }

  /**
   * Checks the liveness of the Nova Agent HTTP server.
   */
  public async checkHealth(): Promise<{ ok: boolean; uptime: number }> {
    try {
      const response = await this.request('/health');
      if (!response.ok) {
        return { ok: false, uptime: 0 };
      }
      const data = await response.json() as { ok: boolean; uptime?: number };
      return { ok: data.ok, uptime: data.uptime || 0 };
    } catch {
      // Gracefully capture offline status
      return { ok: false, uptime: 0 };
    }
  }

  /**
   * Queries Nova Agent's vector memory databases.
   */
  public async searchMemories(query: string): Promise<string[]> {
    try {
      const response = await this.request(`/memories/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`Nova Agent memory search failed with status: ${response.status}`);
      }
      const data = await response.json() as { results?: string[] };
      return data.results || [];
    } catch (err) {
      logger.error(`Failed to search memories with query "${query}":`, {}, err as Error);
      throw err;
    }
  }

  /**
   * Retrieves list of projects from Nova Agent.
   */
  public async getProjects(): Promise<any> {
    try {
      const response = await this.request('/projects');
      if (!response.ok) {
        throw new Error(`Nova Agent projects request failed with status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      logger.error('Failed to retrieve projects from Nova Agent:', {}, err as Error);
      throw err;
    }
  }

  /**
   * Retrieves project details from Nova Agent.
   */
  public async getProjectDetail(id: string): Promise<any> {
    try {
      const response = await this.request(`/projects/${id}`);
      if (!response.ok) {
        throw new Error(`Nova Agent project detail request failed with status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      logger.error(`Failed to retrieve project detail for "${id}" from Nova Agent:`, {}, err as Error);
      throw err;
    }
  }
}

export const novaClient = new NovaClient();
