/**
 * appPathUtils - Pure path helper functions used by App.tsx and workspace handlers.
 */

/** Normalizes a file-system path to forward slashes. */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Remaps an open-file path when a workspace entry is renamed/moved.
 * Returns the new path if it matches oldPath (or a child of it), otherwise
 * returns the original path unchanged.
 */
export function remapOpenPath(path: string, oldPath: string, newPath: string): string {
  if (path === oldPath) {
    return newPath;
  }

  const prefix = `${oldPath}/`;
  if (path.startsWith(prefix)) {
    return `${newPath}${path.slice(oldPath.length)}`;
  }

  return path;
}
