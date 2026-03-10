import { logger } from './Logger';
import type { IPlugin, PluginContext, PluginState } from '../types/plugin';
import { PluginManifest } from '../types/plugin';
import type { ReactNode } from 'react';

type ExtensionPoint<T> = Map<string, T>;

export class PluginService {
  private static instance: PluginService;
  private plugins: Map<string, PluginState> = new Map();
  
  // Extension Points Registry
  private commands: ExtensionPoint<() => void> = new Map();
  private views: ExtensionPoint<ReactNode> = new Map();
  private sidebarItems: ExtensionPoint<{ icon: ReactNode, title: string }> = new Map();

  private constructor() {}

  static getInstance(): PluginService {
    if (!PluginService.instance) {
      PluginService.instance = new PluginService();
    }
    return PluginService.instance;
  }

  /**
   * Registers a plugin into the system. 
   * Does not activate it immediately unless autoStart is true (default false).
   */
  registerPlugin(plugin: IPlugin, autoStart = false): void {
    if (this.plugins.has(plugin.manifest.id)) {
      logger.warn(`[PluginService] Plugin ${plugin.manifest.id} already registered.`);
      return;
    }

    this.plugins.set(plugin.manifest.id, {
      plugin,
      enabled: autoStart,
      status: 'inactive'
    });

    logger.debug(`[PluginService] Registered plugin: ${plugin.manifest.name} (${plugin.manifest.version})`);

    if (autoStart) {
      this.activatePlugin(plugin.manifest.id);
    }
  }

  /**
   * Activates a registered plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const state = this.plugins.get(pluginId);
    if (!state) {
      logger.error(`[PluginService] Cannot activate unknown plugin: ${pluginId}`);
      return;
    }

    if (state.status === 'active') return;

    try {
      const context: PluginContext = {
        registerCommand: (id, cb) => {
          this.commands.set(id, cb);
          logger.debug(`[PluginService] Command registered: ${id}`);
        },
        registerView: (id, component) => {
          this.views.set(id, component);
        },
        registerSidebarItem: (id, icon, title) => {
          this.sidebarItems.set(id, { icon, title });
        }
      };

      await state.plugin.activate(context);
      
      state.status = 'active';
      state.enabled = true;
      logger.info(`[PluginService] Plugin activated: ${state.plugin.manifest.name}`);
    } catch (error: any) {
      state.status = 'error';
      state.error = error.message;
      logger.error(`[PluginService] Failed to activate plugin ${pluginId}:`, error);
    }
  }

  /**
   * Deactivates a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const state = this.plugins.get(pluginId);
    if (state?.status !== 'active') return;

    try {
      if (state.plugin.deactivate) {
        await state.plugin.deactivate();
      }
      state.status = 'inactive';
      state.enabled = false;
      logger.info(`[PluginService] Plugin deactivated: ${state.plugin.manifest.name}`);
    } catch (error: any) {
      logger.error(`[PluginService] Error deactivating plugin ${pluginId}:`, error);
    }
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): PluginState[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Execute a registered command
   */
  executeCommand(commandId: string): void {
    const command = this.commands.get(commandId);
    if (command) {
      command();
    } else {
      logger.warn(`[PluginService] Command not found: ${commandId}`);
    }
  }

  /**
   * Get all sidebar items (for UI rendering)
   */
  getSidebarItems(): { id: string, icon: ReactNode, title: string }[] {
    return Array.from(this.sidebarItems.entries()).map(([id, item]) => ({
      id,
      ...item
    }));
  }
}

export const pluginService = PluginService.getInstance();
