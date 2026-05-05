import type { RemoteConnection, RemoteFileEntry } from '../types/remote';
import { logger } from './Logger';

type RemoteEvent = 'connection-change' | 'connections-updated';
type RemoteEventHandler = (...args: unknown[]) => void;

const STORAGE_KEY = 'vcs-remote-connections';

class RemoteConnectionManager {
  private static _instance: RemoteConnectionManager;
  private connections = new Map<string, RemoteConnection>();
  private activeConnectionId: string | null = null;
  private listeners = new Map<RemoteEvent, Set<RemoteEventHandler>>();
  private isTauriAvailable = false;

  private constructor() {
    this.restoreFromStorage();
    this.detectTauri();
  }

  static getInstance(): RemoteConnectionManager {
    if (!RemoteConnectionManager._instance) {
      RemoteConnectionManager._instance = new RemoteConnectionManager();
    }
    return RemoteConnectionManager._instance;
  }

  private detectTauri(): void {
    this.isTauriAvailable = typeof window !== 'undefined' && '__TAURI__' in window;
  }

  getSavedConnections(): RemoteConnection[] {
    return Array.from(this.connections.values());
  }

  getActiveConnection(): RemoteConnection | null {
    if (!this.activeConnectionId) return null;
    return this.connections.get(this.activeConnectionId) ?? null;
  }

  addConnection(conn: Omit<RemoteConnection, 'id' | 'status'>): RemoteConnection {
    const id = `remote-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const connection: RemoteConnection = {
      ...conn,
      id,
      status: 'disconnected',
    };
    this.connections.set(id, connection);
    this.persistToStorage();
    this.emit('connections-updated');
    logger.info(`[Remote] Added connection "${conn.name}" (${conn.username}@${conn.host})`);
    return connection;
  }

  removeConnection(id: string): void {
    if (this.activeConnectionId === id) {
      this.disconnect(id);
    }
    this.connections.delete(id);
    this.persistToStorage();
    this.emit('connections-updated');
    logger.info(`[Remote] Removed connection ${id}`);
  }

  async connect(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) {
      logger.error(`[Remote] Connection "${id}" not found`);
      return;
    }

    if (!this.isTauriAvailable) {
      conn.status = 'error';
      conn.error = 'Remote development requires the desktop app';
      this.emit('connection-change', conn);
      return;
    }

    conn.status = 'connecting';
    conn.error = undefined;
    this.emit('connection-change', conn);

    try {
      // Test connection with a simple command
      await this.executeRemoteCommand(id, 'echo "connected"');
      conn.status = 'connected';
      conn.lastConnected = Date.now();
      this.activeConnectionId = id;
      this.persistToStorage();
      this.emit('connection-change', conn);
      logger.info(`[Remote] Connected to ${conn.username}@${conn.host}`);
    } catch (err) {
      conn.status = 'error';
      conn.error = err instanceof Error ? err.message : String(err);
      this.emit('connection-change', conn);
      logger.error(`[Remote] Failed to connect to ${conn.host}:`, conn.error);
    }
  }

  disconnect(id: string): void {
    const conn = this.connections.get(id);
    if (!conn) return;

    conn.status = 'disconnected';
    if (this.activeConnectionId === id) {
      this.activeConnectionId = null;
    }
    this.emit('connection-change', conn);
    logger.info(`[Remote] Disconnected from ${conn.host}`);
  }

  async executeRemoteCommand(id: string, command: string): Promise<string> {
    const conn = this.connections.get(id);
    if (!conn) throw new Error(`Connection "${id}" not found`);

    if (!this.isTauriAvailable) {
      throw new Error('Remote commands require the desktop app');
    }

    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      const sshArgs = [
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'ConnectTimeout=10',
        '-p',
        String(conn.port),
      ];

      if (conn.authMethod === 'key' && conn.privateKeyPath) {
        sshArgs.push('-i', conn.privateKeyPath);
      }

      sshArgs.push(`${conn.username}@${conn.host}`, command);

      const output = await Command.create('ssh', sshArgs).execute();

      if (output.code !== 0) {
        throw new Error(output.stderr || `Command failed with exit code ${output.code}`);
      }

      return output.stdout;
    } catch (err) {
      throw new Error(`SSH command failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async listRemoteFiles(id: string, path: string): Promise<RemoteFileEntry[]> {
    const raw = await this.executeRemoteCommand(
      id,
      `ls -la --time-style=+%s "${path}" 2>/dev/null || ls -la "${path}"`,
    );
    const lines = raw.trim().split('\n').slice(1); // skip "total" line

    const entries: RemoteFileEntry[] = [];
    for (const line of lines) {
      if (!line.trim() || line.startsWith('total')) continue;
      const parts = line.split(/\s+/);
      const permissions = parts[0] ?? '';
      const isDirectory = permissions.startsWith('d');
      const rawSize = parseInt(parts[4] ?? '0', 10);
      const name = parts.slice(8).join(' ') || parts.slice(7).join(' ');
      if (name === '.' || name === '..') continue;

      entries.push({
        name,
        path: path.endsWith('/') ? `${path}${name}` : `${path}/${name}`,
        isDirectory,
        size: isNaN(rawSize) ? undefined : rawSize,
        permissions,
      });
    }
    return entries;
  }

  async readRemoteFile(id: string, path: string): Promise<string> {
    return this.executeRemoteCommand(id, `cat "${path}"`);
  }

  async writeRemoteFile(id: string, path: string, content: string): Promise<void> {
    const escaped = content.replace(/'/g, "'\\''");
    await this.executeRemoteCommand(id, `echo '${escaped}' > "${path}"`);
  }

  isRemote(): boolean {
    return this.activeConnectionId !== null;
  }

  on(event: RemoteEvent, handler: RemoteEventHandler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: RemoteEvent, handler: RemoteEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: RemoteEvent, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((h) => h(...args));
  }

  private persistToStorage(): void {
    try {
      const data = Array.from(this.connections.values()).map(
        ({ status: _status, error: _error, ...rest }) => rest,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* no-op */
    }
  }

  private restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const items = JSON.parse(raw) as RemoteConnection[];
      for (const item of items) {
        this.connections.set(item.id, { ...item, status: 'disconnected' });
      }
    } catch {
      /* no-op */
    }
  }
}

export const remoteConnectionManager = RemoteConnectionManager.getInstance();
export default remoteConnectionManager;
