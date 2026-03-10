/**
 * ClawdBot Desktop - Preload Script
 * Minimal - just exposes version info
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('clawdbotDesktop', {
  version: '1.0.0',
  platform: process.platform,
  onShowConfig(callback: () => void) {
    const handler = () => callback();
    ipcRenderer.on('show-config', handler);
    return () => ipcRenderer.removeListener('show-config', handler);
  },
});
