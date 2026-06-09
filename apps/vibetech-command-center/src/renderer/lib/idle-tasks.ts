/**
 * Schedules a callback to be run during a browser's idle periods.
 * Falls back to setTimeout if requestIdleCallback is not supported.
 */
export function queueIdleTask(callback: () => void, timeout = 2000): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return (window as any).requestIdleCallback(callback, { timeout });
  }
  return (window as any).setTimeout(callback, 1) as any;
}

export function cancelIdleTask(id: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    (window as any).cancelIdleCallback(id);
    return;
  }
  (window as any).clearTimeout(id);
}
