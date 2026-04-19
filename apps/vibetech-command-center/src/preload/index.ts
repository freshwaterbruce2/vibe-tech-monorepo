import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type StreamTopic, type StreamMessage, type CommandCenterAPI } from '@shared/types';

let ws: WebSocket | null = null;
let wsPort: number | null = null;
const subscribers = new Map<StreamTopic, Set<(payload: unknown) => void>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

async function ensureWs(): Promise<void> {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  if (ws && ws.readyState === WebSocket.CONNECTING) {
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, 2000);
      ws!.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
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
      reconnectTimer = setTimeout(() => { reconnectTimer = null; ensureWs().catch(() => {}); }, 1500);
    }
  });
  ws.addEventListener('error', () => { /* close will fire */ });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('ws connect timeout')), 3000);
    ws!.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
    ws!.addEventListener('error', () => { clearTimeout(t); reject(new Error('ws connect error')); }, { once: true });
  });
}

const api: CommandCenterAPI = {
  version: '0.1.0',

  nx: {
    get: (force) => ipcRenderer.invoke(IPC_CHANNELS.NX_GET, force),
    refresh: () => ipcRenderer.invoke(IPC_CHANNELS.NX_REFRESH)
  },
  health: {
    probeAll: () => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_PROBE_ALL),
    probeOne: (service) => ipcRenderer.invoke(IPC_CHANNELS.HEALTH_PROBE_ONE, service)
  },
  db: {
    collectAll: () => ipcRenderer.invoke(IPC_CHANNELS.DB_COLLECT_ALL)
  },
  backup: {
    create: (req) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_CREATE, req),
    list: (limit) => ipcRenderer.invoke(IPC_CHANNELS.BACKUP_LIST, limit)
  },
  process: {
    spawn: (spec) => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_SPAWN, spec),
    kill: (id) => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_KILL, id),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PROCESS_LIST)
  },
  claude: {
    invoke: (inv) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_INVOKE, inv)
  },
  rag: {
    search: (q) => ipcRenderer.invoke(IPC_CHANNELS.RAG_SEARCH, q)
  },
  fs: {
    stat: (path) => ipcRenderer.invoke(IPC_CHANNELS.FS_STAT, path)
  },
  meta: {
    info: () => ipcRenderer.invoke(IPC_CHANNELS.META_INFO)
  },

  stream: {
    subscribe(topic, handler) {
      let set = subscribers.get(topic);
      if (!set) { set = new Set(); subscribers.set(topic, set); }
      set.add(handler);
      ensureWs().catch(() => { /* renderer receives nothing until reconnect */ });
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
