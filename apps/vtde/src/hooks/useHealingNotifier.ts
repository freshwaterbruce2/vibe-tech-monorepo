import { useEffect, useRef } from 'react';
import { getHealingLogs } from '../lib/tauri-bridge';
import type { HealingCycle } from '../types/vtde';

const POLL_INTERVAL = 60_000; // 1 minute

export function useHealingNotifier(onNewCycle: (cycle: HealingCycle) => void) {
  const lastTimestamp = useRef<string | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const logs = await getHealingLogs();
        if (logs.length === 0) return;

        const latest = logs[0];
        if (lastTimestamp.current === null) {
          lastTimestamp.current = latest.timestamp;
          return;
        }

        if (latest.timestamp !== lastTimestamp.current) {
          lastTimestamp.current = latest.timestamp;
          onNewCycle(latest);
        }
      } catch {
        // Tauri backend unavailable — silent
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [onNewCycle]);
}
