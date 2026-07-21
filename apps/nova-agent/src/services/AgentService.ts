import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { AgentState, WebSearchResult } from '../types/agent';

type IpcMessage = Record<string, unknown>;

/** A task waiting for human approval before the executor runs it. */
export interface PendingTask {
  id: string;
  title: string;
  status: string;
  created_at: number;
  updated_at: number;
  metadata: string | null;
}

export type CheckpointClassification =
  | 'resumable'
  | 'awaiting_approval'
  | 'needs_review'
  | 'stale'
  | 'corrupt'
  | 'completed';

export interface ResumeCandidate {
  task_id: string;
  revision: number;
  classification: CheckpointClassification;
  reason: string | null;
  pending_approval: { action_fingerprint: string; approval_digest: string } | null;
  uncertain_action_ids: string[];
}

export class AgentService {
  private readonly __instanceMarker = true;
  private static readonly taskMutations = new Map<string, Promise<void>>();

  private static async serializeTaskMutation(
    taskId: string,
    action: () => Promise<void>,
  ): Promise<void> {
    const previous = this.taskMutations.get(taskId);
    const current = previous ? previous.catch(() => undefined).then(action) : action();
    this.taskMutations.set(taskId, current);
    const cleanup = () => {
      if (this.taskMutations.get(taskId) === current) this.taskMutations.delete(taskId);
    };
    void current.then(cleanup, cleanup);
    return await current;
  }

  static filterResumeCandidates(candidates: ResumeCandidate[]): ResumeCandidate[] {
    const recoverable = new Set<CheckpointClassification>([
      'resumable',
      'stale',
      'corrupt',
      'needs_review',
    ]);
    return candidates.filter((candidate) => recoverable.has(candidate.classification));
  }

  static async chat(message: string, projectId?: string): Promise<string> {
    try {
      return await invoke('chat_with_agent', { message, projectId });
    } catch (error) {
      console.error('Failed to chat with agent:', error);
      throw error;
    }
  }

  static async getStatus(): Promise<AgentState> {
    try {
      return await invoke('get_agent_status');
    } catch (error) {
      console.error('Failed to get agent status:', error);
      throw error;
    }
  }

  static async searchWeb(query: string): Promise<WebSearchResult[]> {
    try {
      return await invoke('web_search', { query });
    } catch (error) {
      console.error('Failed to search web:', error);
      throw error;
    }
  }

  static async updateCapabilities(capabilities: string[]): Promise<void> {
    try {
      await invoke('update_capabilities', { capabilities });
    } catch (error) {
      console.error('Failed to update capabilities:', error);
      throw error;
    }
  }

  static async searchMemories(query: string): Promise<string[]> {
    try {
      return await invoke('search_memories', { query });
    } catch (error) {
      console.error('Failed to search memories:', error);
      throw error;
    }
  }

  static async sendIpcMessage(message: IpcMessage): Promise<void> {
    try {
      await invoke('send_ipc_message', { message });
    } catch (error) {
      console.error('Failed to send IPC message:', error);
      throw error;
    }
  }

  static async getProjectState(projectPath: string): Promise<unknown> {
    try {
      return await invoke('get_project_state', { projectPath });
    } catch (error) {
      console.error('Failed to get project state:', error);
      throw error;
    }
  }

  static async listProjects(): Promise<
    Array<{
      id: string;
      name: string;
      path: string;
      project_type: string;
      has_state: boolean;
    }>
  > {
    try {
      return await invoke('list_projects');
    } catch (error) {
      console.error('Failed to list projects:', error);
      throw error;
    }
  }

  static async onIpcMessage(callback: (payload: unknown) => void): Promise<UnlistenFn> {
    return await listen('ipc-message', (event) => {
      callback(event.payload);
    });
  }

  static async getAiConfig(): Promise<{
    deepseek_key_set: boolean;
    groq_key_set: boolean;
    openrouter_key_set: boolean;
    google_key_set: boolean;
    kimi_key_set: boolean;
  }> {
    try {
      return await invoke('get_api_key_status');
    } catch (error) {
      console.error('Failed to get AI config:', error);
      throw error;
    }
  }

  static async saveApiKeys(keys: {
    deepseek_key?: string;
    groq_key?: string;
    openrouter_key?: string;
    google_key?: string;
    kimi_key?: string;
  }): Promise<void> {
    try {
      await invoke('save_api_keys', {
        deepseekKey: keys.deepseek_key,
        groqKey: keys.groq_key,
        openrouterKey: keys.openrouter_key,
        googleKey: keys.google_key,
        kimiKey: keys.kimi_key,
      });
    } catch (error) {
      console.error('Failed to save API keys:', error);
      throw error;
    }
  }

  static async setActiveModel(model: string): Promise<void> {
    try {
      await invoke('set_active_model', { model });
    } catch (error) {
      console.error('Failed to set active model:', error);
      throw error;
    }
  }

  static async verifyProvider(provider: string, key: string): Promise<string> {
    if (!provider || provider.trim() === '') {
      throw new Error('Provider name cannot be empty');
    }
    if (!key || key.trim() === '') {
      throw new Error('API key cannot be empty');
    }

    const trimmedKey = key.trim();
    if (trimmedKey.length < 8 || /\s/.test(trimmedKey)) {
      throw new Error(`Invalid API key format for ${provider}`);
    }

    // Lightweight format check only; a real verification would call the provider.
    return `Key format validated for ${provider}; live verification not implemented.`;
  }

  static async executeCode(language: string, code: string, confirmed = false): Promise<string> {
    try {
      return await invoke<string>('execute_code', {
        language,
        code,
        approved: confirmed,
      });
    } catch (error) {
      console.error('Failed to execute code:', error);
      throw error;
    }
  }

  static async getPendingTasks(): Promise<PendingTask[]> {
    try {
      return await invoke<PendingTask[]>('get_tasks', {
        statusFilter: 'awaiting_approval',
        limit: 20,
      });
    } catch (error) {
      console.error('Failed to get pending tasks:', error);
      throw error;
    }
  }

  static async approveTask(taskId: string): Promise<void> {
    return this.serializeTaskMutation(taskId, async () => {
      const candidates = await this.getResumeCandidates();
      const candidate = candidates.find((item) => item.task_id === taskId);
      const fingerprint = candidate?.pending_approval?.action_fingerprint;
      if (!candidate || !fingerprint) throw new Error('Pending approval checkpoint is unavailable');
      await invoke('decide_task_approval', {
        taskId,
        revision: candidate.revision,
        actionFingerprint: fingerprint,
        approved: true,
      });
    });
  }

  static async rejectTask(taskId: string): Promise<void> {
    return this.serializeTaskMutation(taskId, async () => {
      const candidates = await this.getResumeCandidates();
      const candidate = candidates.find((item) => item.task_id === taskId);
      const fingerprint = candidate?.pending_approval?.action_fingerprint;
      if (!candidate || !fingerprint) throw new Error('Pending approval checkpoint is unavailable');
      await invoke('decide_task_approval', {
        taskId,
        revision: candidate.revision,
        actionFingerprint: fingerprint,
        approved: false,
      });
    });
  }

  static async getResumeCandidates(): Promise<ResumeCandidate[]> {
    return await invoke<ResumeCandidate[]>('get_resume_candidates');
  }

  static async resumeTask(candidate: ResumeCandidate): Promise<void> {
    return this.serializeTaskMutation(candidate.task_id, async () => {
      await invoke('resume_task', {
        taskId: candidate.task_id,
        revision: candidate.revision,
      });
    });
  }

  static async startTaskOver(taskId: string): Promise<void> {
    return this.serializeTaskMutation(taskId, async () => {
      await invoke('start_task_over', { taskId });
    });
  }

  static async reconcileTaskAction(
    taskId: string,
    actionId: string,
    decision: 'confirm_completed' | 'retry' | 'abandon',
    evidence?: string,
  ): Promise<void> {
    return this.serializeTaskMutation(taskId, async () => {
      await invoke('reconcile_task_action', { taskId, actionId, decision, evidence });
    });
  }
}
