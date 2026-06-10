import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface AgentStatus {
  id: string;
  status: string;
  pid: number | null;
}

export interface AgentLogPayload {
  id: string;
  log: string;
}

function isTauri(): boolean {
  return typeof window !== 'undefined'
    && (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;
}

export async function startAgent(id: string, cmd: string, cwd: string): Promise<number> {
  if (!isTauri()) {
    console.warn(`[Orchestrator] startAgent called outside Tauri context for agent: ${id}`);
    return 0;
  }
  return await invoke<number>('start_agent', { id, cmd, cwd });
}

export async function stopAgent(id: string): Promise<string> {
  if (!isTauri()) {
    console.warn(`[Orchestrator] stopAgent called outside Tauri context for agent: ${id}`);
    return 'stopped';
  }
  return await invoke<string>('stop_agent', { id });
}

export async function getAgentStatus(): Promise<AgentStatus[]> {
  if (!isTauri()) {
    return [];
  }
  try {
    return await invoke<AgentStatus[]>('get_agent_status');
  } catch (error) {
    console.error('Failed to get agent status from Tauri:', error);
    return [];
  }
}

export async function listenToAgentLogs(callback: (payload: AgentLogPayload) => void) {
  if (!isTauri()) {
    return () => {};
  }
  try {
    return await listen<AgentLogPayload>('agent-log', (event) => {
      callback(event.payload);
    });
  } catch (error) {
    console.error('Failed to listen to agent logs from Tauri:', error);
    return () => {};
  }
}

