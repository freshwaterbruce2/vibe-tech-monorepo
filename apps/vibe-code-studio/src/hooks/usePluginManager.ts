import { useCallback, useEffect, useState } from 'react';
import type { IPlugin, PluginState } from '../types/plugin';
import { pluginManager } from '../services/PluginManager';

export function usePluginManager() {
  const [plugins, setPlugins] = useState<PluginState[]>(pluginManager.getAllPlugins());
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setPlugins(pluginManager.getAllPlugins());
      setRevision((r) => r + 1);
    };

    pluginManager.on('plugin-installed', refresh);
    pluginManager.on('plugin-activated', refresh);
    pluginManager.on('plugin-deactivated', refresh);
    pluginManager.on('plugin-uninstalled', refresh);
    pluginManager.on('plugin-error', refresh);

    return () => {
      pluginManager.off('plugin-installed', refresh);
      pluginManager.off('plugin-activated', refresh);
      pluginManager.off('plugin-deactivated', refresh);
      pluginManager.off('plugin-uninstalled', refresh);
      pluginManager.off('plugin-error', refresh);
    };
  }, []);

  const installPlugin = useCallback((plugin: IPlugin) => {
    pluginManager.installPlugin(plugin);
  }, []);

  const activatePlugin = useCallback(async (id: string) => {
    await pluginManager.activatePlugin(id);
  }, []);

  const deactivatePlugin = useCallback(async (id: string) => {
    await pluginManager.deactivatePlugin(id);
  }, []);

  const uninstallPlugin = useCallback(async (id: string) => {
    await pluginManager.uninstallPlugin(id);
  }, []);

  return {
    plugins,
    installPlugin,
    activatePlugin,
    deactivatePlugin,
    uninstallPlugin,
    commands: pluginManager.getRegisteredCommands(),
    views: pluginManager.getRegisteredViews(),
    sidebarItems: pluginManager.getRegisteredSidebarItems(),
    executeCommand: pluginManager.executeCommand.bind(pluginManager),
    _revision: revision,
  };
}
