import { resolve } from 'path';

/**
 * Mandatory drive for all data storage in the Vibe Tech ecosystem.
 */
export const MANDATORY_DATA_DRIVE = 'D:';

/**
 * Validates that a given path is on the mandatory D: drive.
 * Throws an error if the path is on any other drive (like C:).
 *
 * @param path The path to validate
 * @returns The absolute resolved path if valid
 * @throws Error if the path is not on the D: drive
 */
export function validateDataPath(path: string): string {
  const absolutePath = resolve(path);

  // On Windows, absolute paths start with a drive letter like "C:\" or "D:\"
  // We check if it starts with the mandatory drive
  if (!absolutePath.toUpperCase().startsWith(MANDATORY_DATA_DRIVE.toUpperCase())) {
    throw new Error(
      `CRITICAL: Data storage violation. Path "${path}" (resolved to "${absolutePath}") must be on the ${MANDATORY_DATA_DRIVE} drive.`,
    );
  }

  return absolutePath;
}

/**
 * Checks if a path is on the mandatory D: drive without throwing.
 *
 * @param path The path to check
 * @returns true if the path is on the D: drive, false otherwise
 */
export function isDataPathValid(path: string): boolean {
  try {
    validateDataPath(path);
    return true;
  } catch {
    return false;
  }
}
