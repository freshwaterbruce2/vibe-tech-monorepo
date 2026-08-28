/**
 * useBrowserCommands tests — palette entries for the spec-11 /browser
 * shortcut: the verify entry surfaces AI chat, and the state-aware
 * approve/deny/revoke entries route to the BrowserSessionService.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBrowserCommands } from '../../hooks/useBrowserCommands';
import type { BrowserSessionService } from '../../services/browser/BrowserSessionService';
import { setBrowserSessionServiceForTests } from '../../services/browser/BrowserSessionService';
import type { BrowserPermissionRequest, BrowserSession } from '../../services/browser/types';
import { useBrowserSessionStore } from '../../stores/browserSessionStore';

const serviceStub = {
  approvePendingRequest: vi.fn().mockResolvedValue(undefined),
  denyPendingRequest: vi.fn(),
  revokeActiveSession: vi.fn(),
};

const pending: BrowserPermissionRequest = {
  id: 'perm-1',
  taskId: 'task-1',
  intent: 'verify the dashboard',
  requestedAt: new Date(1000).toISOString(),
};

const session: BrowserSession = {
  id: 'session-1',
  taskId: 'task-1',
  intent: 'verify the dashboard',
  approvedAt: new Date(2000).toISOString(),
  status: 'active',
  actionLog: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  setBrowserSessionServiceForTests(serviceStub as unknown as BrowserSessionService);
  useBrowserSessionStore.setState({ pendingRequest: null, activeSession: null });
});

afterEach(() => {
  setBrowserSessionServiceForTests(null);
});

describe('useBrowserCommands', () => {
  it('exposes only the /browser verify entry when idle', () => {
    const { result } = renderHook(() => useBrowserCommands());
    expect(result.current.map(c => c.id)).toEqual(['browser-verify']);
    expect(result.current[0]!.icon).toBeTruthy();
  });

  it('/browser verify surfaces the AI chat when wired', () => {
    const onToggleAIChat = vi.fn();
    const { result } = renderHook(() => useBrowserCommands({ onToggleAIChat }));
    result.current.find(c => c.id === 'browser-verify')?.action();
    expect(onToggleAIChat).toHaveBeenCalledTimes(1);
  });

  it('/browser verify is a safe no-op without the AI chat callback', () => {
    const { result } = renderHook(() => useBrowserCommands());
    expect(() => result.current.find(c => c.id === 'browser-verify')?.action()).not.toThrow();
  });

  it('approve/deny entries route to the service while a request is pending', () => {
    useBrowserSessionStore.setState({ pendingRequest: pending });
    const { result } = renderHook(() => useBrowserCommands());
    result.current.find(c => c.id === 'browser-approve-session')?.action();
    expect(serviceStub.approvePendingRequest).toHaveBeenCalledTimes(1);
    result.current.find(c => c.id === 'browser-deny-session')?.action();
    expect(serviceStub.denyPendingRequest).toHaveBeenCalledTimes(1);
  });

  it('revoke entry routes to the service while a session is active', () => {
    useBrowserSessionStore.setState({ activeSession: session });
    const { result } = renderHook(() => useBrowserCommands());
    expect(result.current.map(c => c.id)).toEqual(['browser-verify', 'browser-revoke-session']);
    result.current.find(c => c.id === 'browser-revoke-session')?.action();
    expect(serviceStub.revokeActiveSession).toHaveBeenCalledTimes(1);
  });
});
