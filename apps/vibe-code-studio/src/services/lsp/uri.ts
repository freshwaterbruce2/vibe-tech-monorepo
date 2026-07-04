/**
 * File path ↔ `file://` URI conversion for LSP (Windows-first).
 *
 * LSP identifies documents by URI; Monaco/the app use Windows paths. These
 * helpers round-trip between them, preserving the drive-letter colon and
 * percent-encoding other reserved characters (spaces, etc.).
 */

/** `C:\Users\x a.ts` → `file:///C:/Users/x%20a.ts` */
export function filePathToUri(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const withSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  const encoded = withSlash
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
    .replace(/%3A/gi, ':');
  return `file://${encoded}`;
}

/** `file:///C:/Users/x%20a.ts` → `C:\Users\x a.ts` */
export function uriToFilePath(uri: string): string {
  const withoutScheme = uri.replace(/^file:\/\//, '');
  const decoded = decodeURIComponent(withoutScheme);
  const noLeadingSlash = /^\/[A-Za-z]:/.test(decoded) ? decoded.slice(1) : decoded;
  return noLeadingSlash.replace(/\//g, '\\');
}
