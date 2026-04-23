import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type StreamTopic, type StreamMessage, type CommandCenterAPI } from '@shared/types';

let ws: WebSocket | null = null;
let wsPort: number | null = null;
const subscribers = new Map<StreamTopic, Set<(payload: unknown) => void>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

async function ensureWs(): Promise<void> {
  if (ws?.readyState === WebSocket.OPEN) return;
  if (ws?.readyState === WebSocket.CONNECTING) {
    const connectingSocket = ws;
    if (!connectingSocket) return;
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 2000);
      connectingSocket.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
    });
    return;
  }
  if (wsPort === null) {
    const info = await ipcRenderer.invoke(IPC_CHANNELS.META_INFO) as { ok: boolean; data?: { wsPort: number } };
    wsPort = info?.ok && info.data ? info.data.wsPort : 3210;
  }
  ws = new WebSocket(`ws://127.0.0.1:${wsPort}`);
  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(ev.data as string) as StreamMessage;
      const handlers = subscribers.get(msg.topic);
      if (handlers) for (const h of handlers) {
        try { h(msg.payload); } catch { /* swallow */ }
      }
    } catch { /* ignore malformed */ }
  });
  ws.addEventListener('close', () => {
    ws = null;
    if (subscribers.size > 0 && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void ensureWs().catch(() => {});
      }, 1500);
    }
  });
  ws.addEventListener('error', () => { /* close will fire */ });

  const currentWs = ws;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ws connect timeout')), 3000);
    currentWs.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
    currentWs.addEventListener('error', () => { clearTimeout(t); reject(new Error('ws connect error')); }, { once: true });
  });
}

const api: CommandCenterAPI = {
  version: '0.1.0',

  nx: {
    get: async (force) => ipcRenderer.invoke(IPC_CHANNELS.NX_GET, force),
    refresh: async () => ipcRenderer.invoke(IPC_CHANNELS.NX_REFRESH)
  },
  health: {
    probeAll: async () => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_PROBE_ALL),
    probeOne: async (service) => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_PROBE_ONE, service)
  },
  db: {
    collectAll: async () => ipcRenderer.invoke(IPC_CHANNELS.DB_COLLECT_ALL)
  },
  backup: {
    create: async (req) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE, req),
    list: async (limit) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST, limit)
  },
  process: {
    spawn: async (spec) => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_SPAWN, spec),
    kill: async (id) => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_KILL, id),
    list: async () => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_LIST)
  },
  claude: {
    invoke: async (inv) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_INVOKE, inv)
  },
  rag: {
    search: async (q) => ipcRenderer.invoke(IPC_CHANNELS.RAG_SEARCH, q)
  },
  fs: {
    stat: async (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_STAT, path)
  },
  meta: {
    info: async () => ipcRenderer.invoke(IPC_CHANNELS.META_INFO)
  },

  stream: {
    subscribe(topic, handler) {
      let set = subscribers.get(topic);
      if (!set) { set = new Set(); subscribers.set(topic, set); }
      set.add(handler);
      void ensureWs().catch(() => { /* renderer receives nothing until reconnect */ });
      return () => {
        const s = subscribers.get(topic);
        if (!s) return;
        s.delete(handler);
        if (s.size === 0) subscribers.delete(topic);
      };
    }
  }
};

contextBridge.exposeInMainWorld('commandCenter', api);
