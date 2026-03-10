/**
 * useMemory — React hook wrapping the memory bridge.
 * Auto-captures desktop session context and stores episodic memories.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isMemoryAvailable,
  storeMemory,
  summarizeSession,
  type SessionContext,
  type SessionSummary,
} from '../lib/memory-bridge';

export function useMemory() {
  const [available, setAvailable] = useState(false);
  const contextRef = useRef<SessionContext>({
    apps_opened: [],
    session_start: new Date().toISOString(),
    interactions: 0,
  });
  const mountedRef = useRef(true);

  // Check availability on mount
  useEffect(() => {
    mountedRef.current = true;

    const refreshAvailability = async () => {
      try {
        const ok = await isMemoryAvailable();
        if (mountedRef.current) {
          setAvailable(ok);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void refreshAvailability();
    const interval = setInterval(() => {
      void refreshAvailability();
    }, 30_000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  /** Record an app launch */
  const recordAppLaunch = useCallback(
    async (appId: string) => {
      contextRef.current.apps_opened.push(appId);
      contextRef.current.interactions++;
      if (available) {
        await storeMemory(`User opened app: ${appId}`, 'app_launch');
      }
    },
    [available],
  );

  /** Record a generic interaction */
  const recordInteraction = useCallback(
    async (description: string) => {
      contextRef.current.interactions++;
      if (available) {
        await storeMemory(description, 'interaction');
      }
    },
    [available],
  );

  /** Get a session summary */
  const getSessionSummary = useCallback(async (): Promise<SessionSummary> => {
    return summarizeSession(contextRef.current);
  }, []);

  return {
    available,
    recordAppLaunch,
    recordInteraction,
    getSessionSummary,
    sessionContext: contextRef.current,
  };
}
