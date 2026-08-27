/**
 * RemoteConnectionManager Tests
 *
 * Covers connection CRUD, event emission, persistence, and the SSH
 * command wrappers (list/read/write) with a stubbed remote command.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { remoteConnectionManager } from '../../services/RemoteConnectionManager';

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const STORAGE_KEY = 'vcs-remote-connections';

const baseConnection = {
  name: 'dev-box',
  host: '192.168.1.10',
  port: 22,
  username: 'bruce',
  authMethod: 'password' as const,
};

const clearConnections = () => {
  for (const conn of remoteConnectionManager.getSavedConnections()) {
    remoteConnectionManager.removeConnection(conn.id);
  }
  localStorage.removeItem(STORAGE_KEY);
};

describe('RemoteConnectionManager', () => {
  beforeEach(() => {
    clearConnections();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearConnections();
  });

  describe('addConnection', () => {
    it('creates a disconnected connection with a UUID-based id', () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);

      expect(conn.id).toMatch(new RegExp(`^remote-${UUID_RE}$`));
      expect(conn.status).toBe('disconnected');
      expect(conn.host).toBe('192.168.1.10');
      expect(remoteConnectionManager.getSavedConnections()).toHaveLength(1);
    });

    it('generates unique ids per connection', () => {
      const a = remoteConnectionManager.addConnection(baseConnection);
      const b = remoteConnectionManager.addConnection({ ...baseConnection, name: 'other' });

      expect(a.id).not.toBe(b.id);
    });

    it('persists connections to localStorage without status/error fields', () => {
      remoteConnectionManager.addConnection(baseConnection);

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).toBeTruthy();
      const stored = JSON.parse(raw as string) as Array<Record<string, unknown>>;
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('dev-box');
      expect(stored[0]).not.toHaveProperty('status');
      expect(stored[0]).not.toHaveProperty('error');
    });

    it('emits connections-updated to registered listeners', () => {
      const listener = vi.fn();
      remoteConnectionManager.on('connections-updated', listener);

      remoteConnectionManager.addConnection(baseConnection);

      expect(listener).toHaveBeenCalledTimes(1);
      remoteConnectionManager.off('connections-updated', listener);
    });

    it('stops notifying handlers removed with off()', () => {
      const listener = vi.fn();
      remoteConnectionManager.on('connections-updated', listener);
      remoteConnectionManager.off('connections-updated', listener);

      remoteConnectionManager.addConnection(baseConnection);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('removeConnection', () => {
    it('removes the connection and updates persistence', () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);

      remoteConnectionManager.removeConnection(conn.id);

      expect(remoteConnectionManager.getSavedConnections()).toHaveLength(0);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).toEqual([]);
    });
  });

  describe('connect / disconnect (browser mode)', () => {
    it('marks the connection as error when Tauri is unavailable', async () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);
      const listener = vi.fn();
      remoteConnectionManager.on('connection-change', listener);

      await remoteConnectionManager.connect(conn.id);

      expect(conn.status).toBe('error');
      expect(conn.error).toContain('desktop app');
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: conn.id }));
      remoteConnectionManager.off('connection-change', listener);
    });

    it('does nothing for an unknown connection id', async () => {
      await expect(remoteConnectionManager.connect('remote-missing')).resolves.toBeUndefined();
    });

    it('disconnect resets status and emits connection-change', () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);
      conn.status = 'connected';
      const listener = vi.fn();
      remoteConnectionManager.on('connection-change', listener);

      remoteConnectionManager.disconnect(conn.id);

      expect(conn.status).toBe('disconnected');
      expect(listener).toHaveBeenCalled();
      remoteConnectionManager.off('connection-change', listener);
    });

    it('reports no active connection in browser mode', () => {
      expect(remoteConnectionManager.isRemote()).toBe(false);
      expect(remoteConnectionManager.getActiveConnection()).toBeNull();
    });
  });

  describe('executeRemoteCommand', () => {
    it('rejects for an unknown connection', async () => {
      await expect(
        remoteConnectionManager.executeRemoteCommand('remote-missing', 'ls')
      ).rejects.toThrow('not found');
    });

    it('rejects outside the desktop app', async () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);

      await expect(remoteConnectionManager.executeRemoteCommand(conn.id, 'ls')).rejects.toThrow(
        'desktop app'
      );
    });
  });

  describe('listRemoteFiles', () => {
    it('parses ls output into file entries', async () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);
      const lsOutput = [
        'total 16',
        'drwxr-xr-x 2 bruce bruce 4096 Jan 01 10:00 .',
        'drwxr-xr-x 5 bruce bruce 4096 Jan 01 10:00 ..',
        'drwxr-xr-x 2 bruce bruce 4096 Jan 01 10:00 src',
        '-rw-r--r-- 1 bruce bruce  123 Jan 01 10:00 readme.md',
        '-rw-r--r-- 1 bruce bruce   42 Jan 01 10:00 my notes.txt',
      ].join('\n');
      const exec = vi
        .spyOn(remoteConnectionManager, 'executeRemoteCommand')
        .mockResolvedValue(lsOutput);

      const entries = await remoteConnectionManager.listRemoteFiles(conn.id, '/home/bruce');

      expect(exec).toHaveBeenCalledWith(conn.id, expect.stringContaining('ls -la'));
      expect(entries.map(e => e.name)).toEqual(['src', 'readme.md', 'my notes.txt']);
      expect(entries[0]).toMatchObject({
        path: '/home/bruce/src',
        isDirectory: true,
        size: 4096,
        permissions: 'drwxr-xr-x',
      });
      expect(entries[1]).toMatchObject({
        path: '/home/bruce/readme.md',
        isDirectory: false,
        size: 123,
      });
    });

    it('handles paths that already end with a slash', async () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);
      const lsOutput = ['total 4', '-rw-r--r-- 1 bruce bruce 10 Jan 01 10:00 file.txt'].join('\n');
      vi.spyOn(remoteConnectionManager, 'executeRemoteCommand').mockResolvedValue(lsOutput);

      const entries = await remoteConnectionManager.listRemoteFiles(conn.id, '/var/');

      expect(entries[0].path).toBe('/var/file.txt');
    });
  });

  describe('readRemoteFile / writeRemoteFile', () => {
    it('reads a remote file via cat', async () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);
      const exec = vi
        .spyOn(remoteConnectionManager, 'executeRemoteCommand')
        .mockResolvedValue('file body');

      const content = await remoteConnectionManager.readRemoteFile(conn.id, '/etc/hosts');

      expect(content).toBe('file body');
      expect(exec).toHaveBeenCalledWith(conn.id, 'cat "/etc/hosts"');
    });

    it('writes a remote file with escaped single quotes', async () => {
      const conn = remoteConnectionManager.addConnection(baseConnection);
      const exec = vi.spyOn(remoteConnectionManager, 'executeRemoteCommand').mockResolvedValue('');

      await remoteConnectionManager.writeRemoteFile(conn.id, '/tmp/out.txt', "it's fine");

      expect(exec).toHaveBeenCalledWith(conn.id, `echo 'it'\\''s fine' > "/tmp/out.txt"`);
    });
  });
});
