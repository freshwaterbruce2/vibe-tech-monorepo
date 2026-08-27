/**
 * IpcBridge Tests
 *
 * Exercises every exported send* helper plus subscription/status logic
 * against a mocked window.electron.ipcBridge transport.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IPCMessageType } from '@vibetech/shared-ipc';

import { IpcBridge } from '../../services/IpcBridge';

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

type AnyWindow = Record<string, unknown>;

interface BridgeMocks {
  send: ReturnType<typeof vi.fn>;
  onMessage: ReturnType<typeof vi.fn>;
  onStatusChange: ReturnType<typeof vi.fn>;
  getStatus: ReturnType<typeof vi.fn>;
}

const installBridge = (): BridgeMocks => {
  const mocks: BridgeMocks = {
    send: vi.fn().mockResolvedValue({ success: true }),
    onMessage: vi.fn().mockReturnValue(() => {}),
    onStatusChange: vi.fn().mockReturnValue(() => {}),
    getStatus: vi.fn().mockResolvedValue({ connected: true }),
  };
  (window as unknown as AnyWindow).electron = { ipcBridge: mocks };
  return mocks;
};

const lastSent = (mocks: BridgeMocks): Record<string, unknown> =>
  mocks.send.mock.calls[mocks.send.mock.calls.length - 1][0] as Record<string, unknown>;

describe('IpcBridge', () => {
  beforeEach(() => {
    // Global setup installs a file-lifetime electron mock; remove it so each
    // test explicitly decides whether the bridge is available.
    delete (window as unknown as AnyWindow).electron;
  });

  describe('sendTaskStarted', () => {
    it('sends a task_started message targeting nova by default', async () => {
      const mocks = installBridge();

      await IpcBridge.sendTaskStarted('task-1', 'refactor', 'Refactor utils', {
        file: 'a.ts',
      });

      expect(mocks.send).toHaveBeenCalledTimes(1);
      const msg = lastSent(mocks);
      expect(msg.type).toBe(IPCMessageType.TASK_STARTED);
      expect(msg.source).toBe('deepcode');
      expect(msg.target).toBe('nova');
      expect(msg.payload).toEqual({
        task_id: 'task-1',
        task_type: 'refactor',
        title: 'Refactor utils',
        context: { file: 'a.ts' },
      });
    });

    it('honors an explicit target', async () => {
      const mocks = installBridge();

      await IpcBridge.sendTaskStarted('task-2', 'build', 'Build app', undefined, 'hive');

      expect(lastSent(mocks).target).toBe('hive');
    });
  });

  describe('sendTaskStopped', () => {
    it('sends a task_stopped message with status, duration, and result', async () => {
      const mocks = installBridge();

      await IpcBridge.sendTaskStopped('task-1', 'completed', 12, {
        success: true,
        output: 'done',
      });

      const msg = lastSent(mocks);
      expect(msg.type).toBe(IPCMessageType.TASK_STOPPED);
      expect(msg.target).toBe('nova');
      expect(msg.payload).toEqual({
        task_id: 'task-1',
        status: 'completed',
        duration_minutes: 12,
        result: { success: true, output: 'done' },
      });
    });
  });

  describe('sendTaskActivity', () => {
    it('sends a task_activity message with the given payload', async () => {
      const mocks = installBridge();

      await IpcBridge.sendTaskActivity(
        { task_id: 'task-1', activity_type: 'code_edit', details: { lines: 3 } },
        'hive'
      );

      const msg = lastSent(mocks);
      expect(msg.type).toBe(IPCMessageType.TASK_ACTIVITY);
      expect(msg.target).toBe('hive');
      expect(msg.payload).toEqual({
        task_id: 'task-1',
        activity_type: 'code_edit',
        details: { lines: 3 },
      });
    });
  });

  describe('sendFileOpen', () => {
    it('sends a file open message with default target', async () => {
      const mocks = installBridge();

      await IpcBridge.sendFileOpen({ filePath: 'V:/monorepo/a.ts', line: 4, column: 2 });

      const msg = lastSent(mocks);
      expect(msg.type).toBe(IPCMessageType.FILE_OPEN);
      expect(msg.source).toBe('deepcode');
      expect(msg.target).toBe('nova');
      expect(msg.payload).toEqual({ filePath: 'V:/monorepo/a.ts', line: 4, column: 2 });
    });
  });

  describe('sendFileChanged', () => {
    it('crafts a file_changed message with a UUID messageId', async () => {
      const mocks = installBridge();

      await IpcBridge.sendFileChanged({
        filePath: 'V:/monorepo/b.ts',
        changeType: 'modified',
        content: 'new content',
      });

      const msg = lastSent(mocks);
      expect(msg.type).toBe(IPCMessageType.FILE_CHANGED);
      expect(msg.source).toBe('deepcode');
      expect(msg.target).toBe('nova');
      expect(msg.version).toBe('1.0.0');
      expect(typeof msg.timestamp).toBe('number');
      expect(msg.messageId).toMatch(new RegExp(`^deepcode-${UUID_RE}$`));
      expect(msg.payload).toEqual({
        filePath: 'V:/monorepo/b.ts',
        changeType: 'modified',
        content: 'new content',
      });
    });

    it('generates a fresh messageId per message and honors target', async () => {
      const mocks = installBridge();

      await IpcBridge.sendFileChanged({ filePath: 'a.ts', changeType: 'created' }, 'hive');
      await IpcBridge.sendFileChanged({ filePath: 'a.ts', changeType: 'created' }, 'hive');

      const [first] = mocks.send.mock.calls[0] as [Record<string, unknown>];
      const [second] = mocks.send.mock.calls[1] as [Record<string, unknown>];
      expect(first.messageId).not.toBe(second.messageId);
      expect(first.target).toBe('hive');
    });
  });

  describe('sendCommandRequest', () => {
    it('sends a command_request with text, metadata, and default target', async () => {
      const mocks = installBridge();

      await IpcBridge.sendCommandRequest('open settings', undefined, { origin: 'palette' });

      const msg = lastSent(mocks);
      expect(msg.type).toBe(IPCMessageType.COMMAND_REQUEST);
      expect(msg.messageId).toMatch(new RegExp(`^deepcode-${UUID_RE}$`));
      expect(msg.target).toBe('nova');
      expect(msg.payload).toEqual({
        text: 'open settings',
        target: 'nova',
        metadata: { origin: 'palette' },
      });
    });

    it('propagates an explicit target into payload and envelope', async () => {
      const mocks = installBridge();

      await IpcBridge.sendCommandRequest('run build', 'hive');

      const msg = lastSent(mocks);
      expect(msg.target).toBe('hive');
      expect((msg.payload as Record<string, unknown>).target).toBe('hive');
    });
  });

  describe('transport unavailability and failures', () => {
    it('resolves without sending when window.electron is missing', async () => {
      await expect(IpcBridge.sendTaskStarted('task-1', 'build', 'Build')).resolves.toBeUndefined();
      await expect(
        IpcBridge.sendFileChanged({ filePath: 'a.ts', changeType: 'deleted' })
      ).resolves.toBeUndefined();
    });

    it('resolves without sending when ipcBridge.send is missing', async () => {
      (window as unknown as AnyWindow).electron = { ipcBridge: {} };

      await expect(IpcBridge.sendCommandRequest('anything')).resolves.toBeUndefined();
    });

    it('swallows transport errors from send', async () => {
      const mocks = installBridge();
      mocks.send.mockRejectedValue(new Error('pipe broken'));

      await expect(IpcBridge.sendTaskStopped('task-1', 'error')).resolves.toBeUndefined();
      expect(mocks.send).toHaveBeenCalled();
    });
  });

  describe('onMessage', () => {
    it('registers the handler on the bridge and returns its unsubscribe', () => {
      const mocks = installBridge();
      const unsubscribe = vi.fn();
      mocks.onMessage.mockReturnValue(unsubscribe);
      const handler = vi.fn();

      const result = IpcBridge.onMessage(handler);

      expect(mocks.onMessage).toHaveBeenCalledWith(handler);
      expect(result).toBe(unsubscribe);
    });

    it('returns a noop unsubscribe when the bridge is unavailable', () => {
      const result = IpcBridge.onMessage(vi.fn());

      expect(typeof result).toBe('function');
      expect(() => result()).not.toThrow();
    });
  });

  describe('onStatusChange', () => {
    it('registers the status handler on the bridge', () => {
      const mocks = installBridge();
      const unsubscribe = vi.fn();
      mocks.onStatusChange.mockReturnValue(unsubscribe);
      const handler = vi.fn();

      const result = IpcBridge.onStatusChange(handler);

      expect(mocks.onStatusChange).toHaveBeenCalledWith(handler);
      expect(result).toBe(unsubscribe);
    });

    it('returns a noop unsubscribe when the bridge is unavailable', () => {
      const result = IpcBridge.onStatusChange(vi.fn());

      expect(typeof result).toBe('function');
      expect(() => result()).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('returns the bridge status when available', async () => {
      const mocks = installBridge();
      mocks.getStatus.mockResolvedValue({ connected: true });

      await expect(IpcBridge.getStatus()).resolves.toEqual({ connected: true });
    });

    it('returns disconnected when the bridge is unavailable', async () => {
      await expect(IpcBridge.getStatus()).resolves.toEqual({ connected: false });
    });

    it('returns disconnected with the error when getStatus throws', async () => {
      const mocks = installBridge();
      mocks.getStatus.mockRejectedValue(new Error('dead socket'));

      const status = await IpcBridge.getStatus();

      expect(status.connected).toBe(false);
      expect(status.error).toContain('dead socket');
    });
  });
});
