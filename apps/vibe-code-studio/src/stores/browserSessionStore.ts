/**
 * Browser session store — UI mirror of BrowserSessionService state: the
 * pending permission request awaiting user consent and the single active
 * session (with its human-readable action log). Written by the service;
 * read by BrowserPermissionPromptHost.
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { BrowserPermissionRequest, BrowserSession } from '../services/browser/types';

export interface BrowserSessionState {
  /** Permission prompt currently awaiting the user (null = none) */
  pendingRequest: BrowserPermissionRequest | null;
  /** The single Phase-1 session, if approved and not yet ended */
  activeSession: BrowserSession | null;
  actions: {
    setPendingRequest: (request: BrowserPermissionRequest | null) => void;
    setActiveSession: (session: BrowserSession | null) => void;
  };
}

type SetState = (fn: (state: BrowserSessionState) => void) => void;

const createActions = (set: SetState): BrowserSessionState['actions'] => ({
  setPendingRequest: request =>
    set(state => {
      state.pendingRequest = request;
    }),
  setActiveSession: session =>
    set(state => {
      state.activeSession = session;
    }),
});

export const useBrowserSessionStore = create<BrowserSessionState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        pendingRequest: null,
        activeSession: null,
        actions: createActions(set),
      }))
    ),
    { name: 'browser-session-store' }
  )
);
