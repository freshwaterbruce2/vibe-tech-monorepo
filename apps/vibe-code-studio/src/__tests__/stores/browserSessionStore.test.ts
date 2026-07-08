/**
 * browserSessionStore tests — the UI mirror BrowserSessionService writes and
 * BrowserPermissionPromptHost reads.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { BrowserPermissionRequest, BrowserSession } from '../../services/browser/types';
import { useBrowserSessionStore } from '../../stores/browserSessionStore';

const request: BrowserPermissionRequest = {
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
  actionLog: ['Navigate to http://x/ — ok'],
};

beforeEach(() => {
  useBrowserSessionStore.setState({ pendingRequest: null, activeSession: null });
});

describe('browserSessionStore', () => {
  it('starts empty', () => {
    const state = useBrowserSessionStore.getState();
    expect(state.pendingRequest).toBeNull();
    expect(state.activeSession).toBeNull();
  });

  it('sets and clears the pending permission request', () => {
    const { actions } = useBrowserSessionStore.getState();
    actions.setPendingRequest(request);
    expect(useBrowserSessionStore.getState().pendingRequest).toEqual(request);
    actions.setPendingRequest(null);
    expect(useBrowserSessionStore.getState().pendingRequest).toBeNull();
  });

  it('sets and clears the active session', () => {
    const { actions } = useBrowserSessionStore.getState();
    actions.setActiveSession(session);
    expect(useBrowserSessionStore.getState().activeSession?.actionLog).toHaveLength(1);
    actions.setActiveSession(null);
    expect(useBrowserSessionStore.getState().activeSession).toBeNull();
  });
});
