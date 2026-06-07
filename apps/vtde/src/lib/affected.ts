import { invoke } from '@tauri-apps/api/core';

export interface NxParamPayload {
  name: string;
  type: string;
  data: {
    tags?: string[];
  };
}

export interface NxDependency {
  source: string;
  target: string;
}

export interface NxGraph {
  graph: {
    nodes: Record<string, NxParamPayload>;
    dependencies: Record<string, NxDependency[]>;
  };
}

export async function getAffectedGraph(): Promise<NxGraph> {
  const jsonStr = await invoke<string>('get_affected_graph');
  return JSON.parse(jsonStr) as NxGraph;
}

export async function runAffectedBuild(): Promise<number> {
  return await invoke<number>('run_affected_build');
}
