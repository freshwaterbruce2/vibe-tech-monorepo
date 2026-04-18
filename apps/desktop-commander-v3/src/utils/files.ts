/** Generate a filename-safe timestamp string, e.g. "2026-04-18T14-30-00-000Z.png" */
export function timestampFilename(ext: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return ext.startsWith('.') ? `${ts}${ext}` : `${ts}.${ext}`;
}
