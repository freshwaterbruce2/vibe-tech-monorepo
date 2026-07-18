/** Path remapping helpers for the file explorer sidebar. */

/** Remap a path (or selection) after a rename of oldPath -> newPath. */
export function remapPath(path: string, oldPath: string, newPath: string): string {
  if (path === oldPath) {
    return newPath;
  }

  const prefix = `${oldPath}/`;
  if (path.startsWith(prefix)) {
    return `${newPath}${path.slice(oldPath.length)}`;
  }

  return path;
}
