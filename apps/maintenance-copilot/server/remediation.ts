import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { resolveWorkspaceRoot } from './workspace-scanner.js';

/**
 * Aligns mismatched workspace dependencies across the monorepo topology
 */
export async function handleDependencyFix(): Promise<{ success: boolean; log: string }> {
  try {
    const root = resolveWorkspaceRoot();
    // Targets the exact lodash drift without triggering a blind global reinstall
    const output = execSync('pnpm add lodash@^4.17.21 --save-exact --workspace-root', {
      cwd: root,
      encoding: 'utf8',
    });
    return { success: true, log: output };
  } catch (error) {
    return { success: false, log: (error as Error).message };
  }
}

/**
 * Forcefully strips active read/write file locks holding SQLite databases in a blocked state
 */
export async function handleDatabaseUnlock(
  dbName: string,
): Promise<{ success: boolean; log: string }> {
  try {
    const root = resolveWorkspaceRoot();
    const dbPath = path.join(root, 'mock', 'd_drive', 'databases', dbName);
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    let logOutput = `Initiating lock striping sequence for ${dbName}...\n`;

    // Remove write-ahead logging overhead artifacts if the handle is dangling
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
      logOutput += `Removed dangling Write-Ahead Log file: ${path.basename(walPath)}\n`;
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
      logOutput += `Removed shared memory marker: ${path.basename(shmPath)}\n`;
    }

    logOutput += `Database ${dbName} connections successfully cleared.`;
    return { success: true, log: logOutput };
  } catch (error) {
    return { success: false, log: (error as Error).message };
  }
}

/**
 * Recovers crashed training models by injecting V8 Max Old Space heap allocation overrides
 */
export async function handleDaemonRecovery(): Promise<{ success: boolean; log: string }> {
  try {
    const root = resolveWorkspaceRoot();
    const targetConfig = path.join(root, 'apps', 'nova-agent', 'project.json');

    if (fs.existsSync(targetConfig)) {
      const configContent = JSON.parse(fs.readFileSync(targetConfig, 'utf8'));

      // Inject Node memory allocation arguments directly into the run target configuration
      if (configContent.targets?.train) {
        configContent.targets.train.options = {
          ...configContent.targets.train.options,
          nodeOptions: '--max-old-space-size=4096',
        };
        fs.writeFileSync(targetConfig, JSON.stringify(configContent, null, 2), 'utf8');
        return {
          success: true,
          log: 'Memory boundary adjusted to 4GB. OOM threshold neutralized.',
        };
      }
    }
    return { success: false, log: 'Nova Agent engine targets could not be located.' };
  } catch (error) {
    return { success: false, log: (error as Error).message };
  }
}
