import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Mirrors Rust db::get_db_path for standalone development/backend startup.
 * Installed builds pass Rust's exact resolved path into the sidecar.
 */
export function resolveDatabasePath({ env = process.env, platform = process.platform,
  exists = fs.existsSync, home = os.homedir() } = {}) {
  if (env.VCS_DATABASE_PATH?.trim()) return env.VCS_DATABASE_PATH;
  const paths = platform === 'win32' ? path.win32 : path.posix;
  if (platform === 'win32' && exists('D:\\databases')) return 'D:\\databases\\vibe_studio.db';
  const dataRoot = platform === 'win32' ? env.APPDATA : platform === 'darwin'
    ? paths.join(home, 'Library', 'Application Support')
    : env.XDG_DATA_HOME || paths.join(home, '.local', 'share');
  if (!dataRoot || !paths.isAbsolute(dataRoot)) throw new Error('Application data directory is unavailable. Set VCS_DATABASE_PATH.');
  return paths.join(dataRoot, 'vibe-code-studio', 'vibe_studio.db');
}
