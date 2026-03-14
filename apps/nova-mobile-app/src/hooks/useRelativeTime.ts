import { useEffect, useMemo, useState } from 'react';

export function getRelativeTime(timestamp: string): string {
  const diffInMs = Date.now() - new Date(timestamp).getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMins < 1) return 'Just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Returns a Map of timestamp → relative time string.
 * Recalculates every 60s so only changed entries cause re-renders
 * when used with React.memo components that receive relativeTime as prop.
 */
export function useRelativeTimeMap(timestamps: string[]): Map<string, string> {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    const map = new Map<string, string>();
    for (const ts of timestamps) {
      map.set(ts, getRelativeTime(ts));
    }
    return map;
  }, [timestamps, tick]);
}
