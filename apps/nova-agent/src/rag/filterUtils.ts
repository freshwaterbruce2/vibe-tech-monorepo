/**
 * Safe LanceDB path filter builder.
 *
 * LanceDB's `table.delete` accepts a SQL-style filter string. Building that
 * string by interpolating a user-supplied path is an injection risk (single
 * quotes, backslashes). This helper escapes those characters and validates the
 * path shape before returning a filter of the form `filePath = '...'`.
 */

const INVALID_PATH_PATTERN = /[\0\r\n]/;

/**
 * Escape a string literal for LanceDB's filter parser.
 * - Single quotes are doubled (SQL-style).
 * - Backslashes are doubled so escape sequences cannot break out.
 */
function escapeFilterLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

/**
 * Validate that a path is safe to use in a filter.
 * Rejects empty paths, absolute-looking paths, and paths containing control
 * characters or newline bytes.
 */
function isValidRelativePath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  if (INVALID_PATH_PATTERN.test(path)) return false;
  // Reject absolute paths and parent traversal at the root.
  if (path.startsWith('/') || path.startsWith('\\')) return false;
  if (/^[a-zA-Z]:[\\/]/.test(path)) return false;
  return true;
}

/**
 * Build a LanceDB `filePath = '...'` filter string for a relative file path.
 * Throws if the path fails validation.
 */
export function buildPathFilter(path: string): string {
  if (!isValidRelativePath(path)) {
    throw new Error(`Invalid file path for filter: ${path}`);
  }
  return `filePath = '${escapeFilterLiteral(path)}'`;
}
