import type { ReactNode } from 'react';
import type { IPlugin, PluginContext, PluginManifest, PluginState } from '../types/plugin';
import { logger } from './Logger';

export interface RegisteredCommand {
  id: string;
  pluginId: string;
  callback: () => void;
}

export interface RegisteredView {
  id: string;
  pluginId: string;
  component: ReactNode;
}

export interface RegisteredSidebarItem {
  id: string;
  pluginId: string;
  icon: ReactNode;
  title: string;
}

type PluginEvent =
  | 'plugin-installed'
  | 'plugin-activated'
  | 'plugin-deactivated'
  | 'plugin-uninstalled'
  | 'plugin-error';
type PluginEventHandler = (...args: unknown[]) => void;

const STORAGE_KEY = 'vcs-plugins-installed';

class PluginManager {
  private static _instance: PluginManager;
  private plugins = new Map<string, PluginState>();
  private commands = new Map<string, RegisteredCommand>();
  private views = new Map<string, RegisteredView>();
  private sidebarItems = new Map<string, RegisteredSidebarItem>();
  private listeners = new Map<PluginEvent, Set<PluginEventHandler>>();

  private constructor() {
    this.restoreFromStorage();
  }

  static getInstance(): PluginManager {
    if (!PluginManager._instance) {
      PluginManager._instance = new PluginManager();
    }
    return PluginManager._instance;
  }

  installPlugin(plugin: IPlugin): void {
    const { id } = plugin.manifest;
    if (this.plugins.has(id)) {
      logger.warn(`[PluginManager] Plugin "${id}" already installed`);
      return;
    }

    if (!this.validateManifest(plugin.manifest)) {
      return;
    }

    this.plugins.set(id, {
      plugin,
      enabled: false,
      status: 'inactive',
    });

    this.persistToStorage();
    this.emit('plugin-installed', id);
    logger.info(
      `[PluginManager] Installed plugin "${plugin.manifest.name}" v${plugin.manifest.version}`,
    );
  }

  async activatePlugin(id: string): Promise<void> {
    const state = this.plugins.get(id);
    if (!state) {
      logger.error(`[PluginManager] Plugin "${id}" not found`);
      return;
    }

    if (state.status === 'active') {
      return;
    }

    // Check dependencies
    const deps = state.plugin.manifest.dependencies ?? [];
    for (const dep of deps) {
      const depState = this.plugins.get(dep);
      if (depState?.status !== 'active') {
        const msg = `Dependency "${dep}" not active`;
        state.status = 'error';
        state.error = msg;
        logger.error(`[PluginManager] Cannot activate "${id}": ${msg}`);
        this.emit('plugin-error', id, msg);
        return;
      }
    }

    const context = this.createContext(id);

    try {
      await state.plugin.activate(context);
      state.enabled = true;
      state.status = 'active';
      state.error = undefined;
      this.persistToStorage();
      this.emit('plugin-activated', id);
      logger.info(`[PluginManager] Activated plugin "${id}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      state.status = 'error';
      state.error = msg;
      logger.error(`[PluginManager] Failed to activate "${id}":`, msg);
      this.emit('plugin-error', id, msg);
    }
  }

  async deactivatePlugin(id: string): Promise<void> {
    const state = this.plugins.get(id);
    if (state?.status !== 'active') return;

    try {
      await state.plugin.deactivate?.();
    } catch (err) {
      logger.warn(`[PluginManager] Error during deactivation of "${id}":`, err);
    }

    // Remove registrations
    for (const [cmdId, cmd] of this.commands) {
      if (cmd.pluginId === id) this.commands.delete(cmdId);
    }
    for (const [viewId, view] of this.views) {
      if (view.pluginId === id) this.views.delete(viewId);
    }
    for (const [itemId, item] of this.sidebarItems) {
      if (item.pluginId === id) this.sidebarItems.delete(itemId);
    }

    state.enabled = false;
    state.status = 'inactive';
    state.error = undefined;
    this.persistToStorage();
    this.emit('plugin-deactivated', id);
    logger.info(`[PluginManager] Deactivated plugin "${id}"`);
  }

  async uninstallPlugin(id: string): Promise<void> {
    await this.deactivatePlugin(id);
    this.plugins.delete(id);
    this.persistToStorage();
    this.emit('plugin-uninstalled', id);
    logger.info(`[PluginManager] Uninstalled plugin "${id}"`);
  }

  getPlugin(id: string): PluginState | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): PluginState[] {
    return Array.from(this.plugins.values());
  }

  getRegisteredCommands(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }

  getRegisteredViews(): RegisteredView[] {
    return Array.from(this.views.values());
  }

  getRegisteredSidebarItems(): RegisteredSidebarItem[] {
    return Array.from(this.sidebarItems.values());
  }

  executeCommand(commandId: string): void {
    const cmd = this.commands.get(commandId);
    if (cmd) {
      cmd.callback();
    } else {
      logger.warn(`[PluginManager] Command "${commandId}" not found`);
    }
  }

  on(event: PluginEvent, handler: PluginEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: PluginEvent, handler: PluginEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: PluginEvent, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((handler) => handler(...args));
  }

  private createContext(pluginId: string): PluginContext {
    return {
      registerCommand: (id: string, callback: () => void) => {
        const fullId = `${pluginId}.${id}`;
        this.commands.set(fullId, { id: fullId, pluginId, callback });
        logger.debug(`[PluginManager] Command registered: ${fullId}`);
      },
      registerView: (id: string, component: ReactNode) => {
        const fullId = `${pluginId}.${id}`;
        this.views.set(fullId, { id: fullId, pluginId, component });
        logger.debug(`[PluginManager] View registered: ${fullId}`);
      },
      registerSidebarItem: (id: string, icon: ReactNode, title: string) => {
        const fullId = `${pluginId}.${id}`;
        this.sidebarItems.set(fullId, { id: fullId, pluginId, icon, title });
        logger.debug(`[PluginManager] Sidebar item registered: ${fullId}`);
      },
    };
  }

  private validateManifest(manifest: PluginManifest): boolean {
    if (!manifest.id || !manifest.name || !manifest.version) {
      logger.error('[PluginManager] Invalid manifest: missing id, name, or version');
      return false;
    }
    return true;
  }

  private persistToStorage(): void {
    try {
      const ids = Array.from(this.plugins.keys());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // localStorage not available
    }
  }

  private restoreFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        logger.debug(`[PluginManager] Found ${JSON.parse(data).length} saved plugins`);
      }
    } catch {
      // localStorage not available
    }
  }
}

export const pluginManager = PluginManager.getInstance();
export default pluginManager;
