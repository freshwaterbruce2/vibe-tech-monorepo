/**
 * browserCommands — pure command-def builder for the spec 11 palette
 * `/browser` shortcut (Phase 1 open follow-up). Derives state-aware palette
 * entries from browser-session state; the thin useBrowserCommands.tsx hook
 * maps each def's `kind` onto the real BrowserSessionService actions.
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import type { BrowserPermissionRequest, BrowserSession } from './types';

export type BrowserCommandKind = 'open-agent-chat' | 'approve' | 'deny' | 'revoke';

export interface BrowserCommandDef {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  kind: BrowserCommandKind;
}

/** One-line human-readable status for the current browser-session state */
export function describeBrowserSessionStatus(
  pending: BrowserPermissionRequest | null,
  session: BrowserSession | null
): string {
  if (pending) {
    return `Permission pending for task ${pending.taskId}: ${pending.intent}`;
  }
  if (session) {
    const count = session.actionLog.length;
    const noun = count === 1 ? 'action' : 'actions';
    return `Active session for task ${session.taskId} — ${count} ${noun} logged`;
  }
  return 'No browser session — agents request /browser during a task and you approve each one';
}

function def(
  id: string,
  title: string,
  description: string,
  keywords: string[],
  kind: BrowserCommandKind
): BrowserCommandDef {
  return { id, title, description, category: 'Agent', keywords, kind };
}

/**
 * State-aware `/browser` palette entries: the verify shortcut is always
 * present; approve/deny appear only while a permission request is pending
 * and revoke only while a session is active (spec AC #1/#9/#12 surfaces).
 */
export function buildBrowserCommandDefs(
  pending: BrowserPermissionRequest | null,
  session: BrowserSession | null
): BrowserCommandDef[] {
  const status = describeBrowserSessionStatus(pending, session);
  const defs: BrowserCommandDef[] = [
    def(
      'browser-verify',
      'Browser: Verify in Browser (/browser)',
      'Ask the agent in AI Chat to verify UI changes in a permissioned browser session',
      ['browser', 'verify', 'session', 'playwright', 'screenshot', 'agent'],
      'open-agent-chat'
    ),
  ];
  if (pending) {
    defs.push(
      def(
        'browser-approve-session',
        'Browser: Approve Pending Session Request',
        status,
        ['browser', 'approve', 'allow', 'permission', 'session'],
        'approve'
      ),
      def(
        'browser-deny-session',
        'Browser: Deny Pending Session Request',
        status,
        ['browser', 'deny', 'block', 'permission', 'session'],
        'deny'
      )
    );
  }
  if (session) {
    defs.push(
      def(
        'browser-revoke-session',
        'Browser: Revoke Active Session',
        status,
        ['browser', 'revoke', 'stop', 'end', 'session'],
        'revoke'
      )
    );
  }
  return defs;
}
