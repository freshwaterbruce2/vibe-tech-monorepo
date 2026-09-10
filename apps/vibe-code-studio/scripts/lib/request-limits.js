/** Bounded per-client abuse guard, in addition to durable paid usage reservations. */
const windows = new Map();
export function rateAllowed(key, max = 30, now = Date.now()) {
  for (const [id, entry] of windows) if (entry.until <= now) windows.delete(id);
  const entry = windows.get(key) || { count: 0, until: now + 60_000 };
  if (!windows.has(key) && windows.size >= 10_000) return false;
  entry.count += 1;
  windows.set(key, entry);
  return entry.count <= max;
}
