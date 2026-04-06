import type { FeatureFlag, KillSwitchEvent, KillSwitchPriority } from '@vibetech/feature-flags-core';
import { SQLiteStorage } from '../storage/sqlite.js';
import { FlagService } from './flag-service.js';
import { createLogger } from '@vibetech/logger';

const logger = createLogger('KillSwitchService');

export class KillSwitchService {
  private storage: SQLiteStorage;
  private flagService: FlagService;
  private onKillSwitch?: (event: KillSwitchEvent) => void;

  constructor(storage: SQLiteStorage, flagService: FlagService) {
    this.storage = storage;
    this.flagService = flagService;
  }

  setKillSwitchListener(listener: (event: KillSwitchEvent) => void): void {
    this.onKillSwitch = listener;
  }

  getActiveKillSwitches(): FeatureFlag[] {
    return this.storage.getActiveKillSwitches();
  }

  getAllKillSwitches(): FeatureFlag[] {
    return this.storage.getKillSwitches();
  }

  activate(
    flagKey: string,
    triggeredBy = 'system',
    reason?: string
  ): { success: boolean; flag?: FeatureFlag; error?: string } {
    const flag = this.flagService.getFlagByKey(flagKey);

    if (!flag) {
      return { success: false, error: 'Flag not found' };
    }

    if (flag.type !== 'kill_switch') {
      return { success: false, error: 'Flag is not a kill switch' };
    }

    if (flag.enabled) {
      return { success: true, flag, error: 'Kill switch already active' };
    }

    const updated = this.flagService.toggleFlag(flag.id, true, triggeredBy);

    if (updated) {
      const event: KillSwitchEvent = {
        flagKey,
        action: 'activated',
        priority: (flag.killSwitch?.priority ?? 'normal') as KillSwitchPriority,
        timestamp: new Date().toISOString(),
        triggeredBy,
        reason,
      };

      this.onKillSwitch?.(event);

      // Webhook notification if configured
      if (flag.killSwitch?.notifyOnTrigger && flag.killSwitch?.webhookUrl) {
        this.sendWebhook(flag.killSwitch.webhookUrl, event).catch((err: unknown) => {
          logger.error('Failed to send kill switch webhook:', {}, err instanceof Error ? err : new Error(String(err)));
        });
      }

      return { success: true, flag: updated };
    }

    return { success: false, error: 'Failed to activate kill switch' };
  }

  deactivate(
    flagKey: string,
    triggeredBy = 'system',
    reason?: string
  ): { success: boolean; flag?: FeatureFlag; error?: string } {
    const flag = this.flagService.getFlagByKey(flagKey);

    if (!flag) {
      return { success: false, error: 'Flag not found' };
    }

    if (flag.type !== 'kill_switch') {
      return { success: false, error: 'Flag is not a kill switch' };
    }

    if (!flag.enabled) {
      return { success: true, flag, error: 'Kill switch already inactive' };
    }

    const updated = this.flagService.toggleFlag(flag.id, false, triggeredBy);

    if (updated) {
      const event: KillSwitchEvent = {
        flagKey,
        action: 'deactivated',
        priority: (flag.killSwitch?.priority ?? 'normal') as KillSwitchPriority,
        timestamp: new Date().toISOString(),
        triggeredBy,
        reason,
      };

      this.onKillSwitch?.(event);

      return { success: true, flag: updated };
    }

    return { success: false, error: 'Failed to deactivate kill switch' };
  }

  private async sendWebhook(url: string, event: KillSwitchEvent): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Kill Switch ${event.action.toUpperCase()}: ${event.flagKey}`,
          event,
        }),
      });
    } catch (error) {
      logger.error('Webhook failed:', {}, error instanceof Error ? error : new Error(String(error)));
    }
  }
}