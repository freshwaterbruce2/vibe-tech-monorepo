import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { onMessage, onStatusChange, getStatus, unsubMsg, unsubStatus } = vi.hoisted(() => ({
  onMessage: vi.fn(),
  onStatusChange: vi.fn(),
  getStatus: vi.fn().mockResolvedValue({ connected: true }),
  unsubMsg: vi.fn(),
  unsubStatus: vi.fn(),
}));

vi.mock('../../services/IpcBridge', () => ({
  IpcBridge: {
    onMessage: (cb: (m: unknown) => void) => {
      onMessage.mockImplementation(cb);
      return unsubMsg;
    },
    onStatusChange: (cb: (s: { connected: boolean }) => void) => {
      onStatusChange.mockImplementation(cb);
      return unsubStatus;
    },
    getStatus,
    sendTaskStarted: vi.fn(),
    sendTaskStopped: vi.fn(),
    sendTaskActivity: vi.fn(),
    sendFileOpen: vi.fn(),
    sendFileChanged: vi.fn(),
    sendCommandRequest: vi.fn(),
  },
}));

import { useIPC } from '../../hooks/useIPC';

describe('useIPC', () => {
  beforeEach(() => {
    onMessage.mockClear();
    onStatusChange.mockClear();
    getStatus.mockClear();
    unsubMsg.mockClear();
    unsubStatus.mockClear();
    delete (window as unknown as { ipcBridge?: unknown }).ipcBridge;
  });

  it('loads initial status and handles message/status callbacks', async () => {
    const onMessageOpt = vi.fn();
    const onStatusOpt = vi.fn();
    const { result, unmount } = renderHook(() =>
      useIPC({ onMessage: onMessageOpt, onStatusChange: onStatusOpt })
    );

    await waitFor(() => expect(result.current.status).toEqual({ connected: true }));
    expect(onStatusOpt).toHaveBeenCalledWith({ connected: true });

    act(() => {
      onMessage({ type: 'ping' });
    });
    expect(result.current.lastMessage).toEqual({ type: 'ping' });
    expect(onMessageOpt).toHaveBeenCalledWith({ type: 'ping' });

    act(() => {
      onStatusChange({ connected: false });
    });
    expect(result.current.status).toEqual({ connected: false });

    unmount();
    expect(unsubMsg).toHaveBeenCalled();
    expect(unsubStatus).toHaveBeenCalled();
  });

  it('sendMessage uses window.ipcBridge.send when present', () => {
    const send = vi.fn();
    (window as unknown as { ipcBridge: { send: typeof send } }).ipcBridge = { send };
    const { result } = renderHook(() => useIPC());
    act(() => {
      result.current.sendMessage({ a: 1 });
    });
    expect(send).toHaveBeenCalledWith({ a: 1 });
  });

  it('sendMessage is a no-op without ipcBridge', () => {
    const { result } = renderHook(() => useIPC());
    expect(() => result.current.sendMessage({})).not.toThrow();
  });

  it('exposes IpcBridge senders', () => {
    const { result } = renderHook(() => useIPC());
    expect(result.current.sendTaskStarted).toBeTypeOf('function');
    expect(result.current.sendFileOpen).toBeTypeOf('function');
  });
});
