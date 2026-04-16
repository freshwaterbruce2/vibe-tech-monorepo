import { contextBridge } from 'electron';

// Chunk 1: empty bridge. Chunk 4 wires real IPC.
contextBridge.exposeInMainWorld('commandCenter', {
  version: '0.1.0'
});
