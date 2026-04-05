/**
 * Auto-update service using tauri-plugin-updater.
 *
 * Checks GitHub Releases for new versions and installs them in-place.
 * Silently no-ops in non-Tauri environments (web, dev server).
 */
import { logger } from '../services/Logger';

interface UpdateInfo {
  version: string;
  date: string | null;
  body: string | null;
}

export class AutoUpdateService {
  private static instance: AutoUpdateService;
  private enabled: boolean;
  private currentVersion: string;
  private checkInterval = 3_600_000; // 1 hour
  private updateCheckTimer?: ReturnType<typeof setInterval> | undefined;
  private isTauri: boolean;

  private constructor() {
    this.isTauri =
      typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    this.enabled = this.isTauri; // auto-enable in Tauri builds
    this.currentVersion = import.meta.env['VITE_APP_VERSION'] ?? '1.1.0';

    if (this.enabled) {
      this.startUpdateCheck();
    }
  }

  static getInstance(): AutoUpdateService {
    if (!AutoUpdateService.instance) {
      AutoUpdateService.instance = new AutoUpdateService();
    }
    return AutoUpdateService.instance;
  }

  /**
   * Check for updates via tauri-plugin-updater.
   * Returns update info if a newer version is available, null otherwise.
   */
  async checkForUpdates(): Promise<UpdateInfo | null> {
    if (!this.enabled || !this.isTauri) return null;

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (update) {
        logger.info(
          `[AutoUpdate] Update available: v${update.version} (current: ${this.currentVersion})`
        );
        return {
          version: update.version,
          date: update.date ?? null,
          body: update.body ?? null,
        };
      }

      logger.debug('[AutoUpdate] Up to date');
      return null;
    } catch (error) {
      logger.error('[AutoUpdate] Check failed:', String(error));
      return null;
    }
  }

  /**
   * Download and install the available update, then prompt for restart.
   */
  async downloadAndInstall(): Promise<void> {
    if (!this.isTauri) return;

    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();

      if (!update) {
        logger.info('[AutoUpdate] No update available');
        return;
      }

      logger.info(`[AutoUpdate] Downloading v${update.version}...`);
      await update.downloadAndInstall();

      // Prompt user to restart
      const { ask } = await import('@tauri-apps/plugin-dialog');
      const shouldRestart = await ask(
        `Version ${update.version} has been installed. Restart now to apply the update?`,
        { title: 'Update Installed', kind: 'info' }
      );

      if (shouldRestart) {
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      }
    } catch (error) {
      logger.error('[AutoUpdate] Download/install failed:', String(error));
      throw error;
    }
  }

  /** Start periodic update checks (initial check after 30 s). */
  private startUpdateCheck(): void {
    setTimeout(() => this.checkForUpdates(), 30_000);
    this.updateCheckTimer = setInterval(
      () => this.checkForUpdates(),
      this.checkInterval
    );
  }

  /** Stop periodic update checks. */
  stopUpdateCheck(): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
      this.updateCheckTimer = undefined;
    }
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  enable(): void {
    this.enabled = true;
    this.startUpdateCheck();
  }

  disable(): void {
    this.enabled = false;
    this.stopUpdateCheck();
  }
}

// Export singleton instance
export const autoUpdater = AutoUpdateService.getInstance();
