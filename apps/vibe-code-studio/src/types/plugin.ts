import type { ReactNode } from 'react';

export type PluginType = 'core' | 'extension' | 'theme';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  main?: string; // Entry point for logic
  dependencies?: string[];
  permissions?: string[]; // e.g. ['fs:read', 'network']
}

export interface PluginContext {
  registerCommand(id: string, callback: () => void): void;
  registerView(id: string, component: ReactNode): void;
  registerSidebarItem(id: string, icon: ReactNode, title: string): void;
  // Add more extension points as needed
}

export interface IPlugin {
  manifest: PluginManifest;
  activate(context: PluginContext): Promise<void> | void;
  deactivate?(): Promise<void> | void;
}

export interface PluginState {
  plugin: IPlugin;
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  error?: string;
}
