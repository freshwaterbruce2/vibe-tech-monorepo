/**
 * browserCommands tests — pure def-builder for the spec-11 palette /browser
 * shortcut: status text per session state and which entries appear when idle,
 * permission-pending, and session-active.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBrowserCommandDefs,
  describeBrowserSessionStatus,
} from '../../../services/browser/browserCommands';
import type { BrowserPermissionRequest, BrowserSession } from '../../../services/browser/types';

const pending: BrowserPermissionRequest = {
  id: 'perm-1',
  taskId: 'task-1',
  intent: 'Open http://localhost:5173/ and verify the dashboard',
  requestedAt: new Date(1000).toISOString(),
};

const session: BrowserSession = {
  id: 'session-1',
  taskId: 'task-2',
  intent: 'verify dashboard',
  approvedAt: new Date(2000).toISOString(),
  status: 'active',
  actionLog: ['nav ok'],
};

describe('describeBrowserSessionStatus', () => {
  it('describes a pending permission request first', () => {
    expect(describeBrowserSessionStatus(pending, session)).toBe(
      'Permission pending for task task-1: Open http://localhost:5173/ and verify the dashboard'
    );
  });

  it('describes an active session with singular action count', () => {
    expect(describeBrowserSessionStatus(null, session)).toBe(
      'Active session for task task-2 — 1 action logged'
    );
  });

  it('pluralizes the action count', () => {
    expect(describeBrowserSessionStatus(null, { ...session, actionLog: [] })).toBe(
      'Active session for task task-2 — 0 actions logged'
    );
  });

  it('describes the idle state', () => {
    expect(describeBrowserSessionStatus(null, null)).toBe(
      'No browser session — agents request /browser during a task and you approve each one'
    );
  });
});

describe('buildBrowserCommandDefs', () => {
  it('always exposes the /browser verify entry (idle state)', () => {
    const defs = buildBrowserCommandDefs(null, null);
    expect(defs.map(d => d.id)).toEqual(['browser-verify']);
    expect(defs[0]).toMatchObject({
      title: 'Browser: Verify in Browser (/browser)',
      category: 'Agent',
      kind: 'open-agent-chat',
    });
    expect(defs[0]!.keywords).toContain('browser');
  });

  it('adds approve/deny while a permission request is pending', () => {
    const defs = buildBrowserCommandDefs(pending, null);
    expect(defs.map(d => d.id)).toEqual([
      'browser-verify',
      'browser-approve-session',
      'browser-deny-session',
    ]);
    const approve = defs.find(d => d.id === 'browser-approve-session');
    expect(approve).toMatchObject({ kind: 'approve', category: 'Agent' });
    expect(approve!.description).toContain('Permission pending for task task-1');
    expect(defs.find(d => d.id === 'browser-deny-session')).toMatchObject({ kind: 'deny' });
  });

  it('adds revoke while a session is active', () => {
    const defs = buildBrowserCommandDefs(null, session);
    expect(defs.map(d => d.id)).toEqual(['browser-verify', 'browser-revoke-session']);
    const revoke = defs.find(d => d.id === 'browser-revoke-session');
    expect(revoke).toMatchObject({ kind: 'revoke' });
    expect(revoke!.description).toBe('Active session for task task-2 — 1 action logged');
  });

  it('can expose approve/deny and revoke together', () => {
    const defs = buildBrowserCommandDefs(pending, session);
    expect(defs.map(d => d.kind)).toEqual(['open-agent-chat', 'approve', 'deny', 'revoke']);
  });
});
