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

export async function startAgent(id: string, cmd: string, cwd: string): Promise<number> {
  return await invoke<number>('start_agent', { id, cmd, cwd });
}

export async function stopAgent(id: string): Promise<string> {
  return await invoke<string>('stop_agent', { id });
}

export async function getAgentStatus(): Promise<AgentStatus[]> {
  return await invoke<AgentStatus[]>('get_agent_status');
}

export async function listenToAgentLogs(callback: (payload: AgentLogPayload) => void) {
  return await listen<AgentLogPayload>('agent-log', (event) => {
    callback(event.payload);
  });
}
