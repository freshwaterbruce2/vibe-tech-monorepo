import { appStore } from '../utils/electronStore';

export interface UsageData { dailyRequests: number; dailyScreenTime: number; lastReset: string; }
export interface UsageLimits {
  maxDailyRequests: number;
  maxDailyScreenTime: number;
  maxConsecutiveTime: number;
  breakDuration: number;
  quietHoursStart: number;
  quietHoursEnd: number;
}
type Reservation = { allowed: true; reservationId: string } | { allowed: false; reason: string };

const DEFAULT_LIMITS: UsageLimits = {
  maxDailyRequests: 30,
  maxDailyScreenTime: 120,
  maxConsecutiveTime: 30,
  breakDuration: 10,
  quietHoursStart: 21,
  quietHoursEnd: 7,
};
const MAX_STORED_REQUESTS = 200;
const MAX_PARENT_REQUESTS = 30;
const MAX_MINUTES = 480;
const today = () => new Date().toDateString();
const whole = (value: unknown, minimum: number, maximum: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
const defaultUsage = (): UsageData => ({
  dailyRequests: 0,
  dailyScreenTime: 0,
  lastReset: today(),
});
const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => key in value);
const isCanonicalDate = (value: unknown): value is string => typeof value === 'string' && value.length <= 15 && new Date(value).toDateString() === value;

function isUsageData(value: unknown): value is UsageData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return hasOnlyKeys(data, ['dailyRequests', 'dailyScreenTime', 'lastReset']) && isCanonicalDate(data.lastReset) && whole(data.dailyRequests, 0, MAX_STORED_REQUESTS) && whole(data.dailyScreenTime, 0, MAX_MINUTES);
}
function isLimits(value: unknown): value is UsageLimits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const limits = value as Record<string, unknown>;
  return hasOnlyKeys(limits, ['maxDailyRequests', 'maxDailyScreenTime', 'maxConsecutiveTime', 'breakDuration', 'quietHoursStart', 'quietHoursEnd']) && whole(limits.maxDailyRequests, 1, MAX_PARENT_REQUESTS) && whole(limits.maxDailyScreenTime, 15, MAX_MINUTES) && whole(limits.maxConsecutiveTime, 15, 120) && whole(limits.breakDuration, 5, 30) && whole(limits.quietHoursStart, 0, 23) && whole(limits.quietHoursEnd, 0, 23);
}
function isMigratableLegacyLimits(value: unknown): value is UsageLimits {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const limits = value as Record<string, unknown>;
  return hasOnlyKeys(limits, ['maxDailyRequests', 'maxDailyScreenTime', 'maxConsecutiveTime', 'breakDuration', 'quietHoursStart', 'quietHoursEnd']) && whole(limits.maxDailyRequests, MAX_PARENT_REQUESTS + 1, MAX_STORED_REQUESTS) && whole(limits.maxDailyScreenTime, 15, MAX_MINUTES) && whole(limits.maxConsecutiveTime, 15, 120) && whole(limits.breakDuration, 5, 30) && whole(limits.quietHoursStart, 0, 23) && whole(limits.quietHoursEnd, 0, 23);
}

class UsageMonitor {
  private usage: UsageData;
  private limits: UsageLimits;
  private sessionStart = 0;
  private lastActivity = 0;
  private warningShown = false;
  private accumulatedMs = 0;
  private consecutiveMs = 0;
  private activeReservations = new Set<string>();
  private reservationSequence = 0;
  private usageStorageAvailable = true;
  private limitsStorageAvailable = true;
  private devBypassUntil = 0;

  constructor() {
    this.usage = this.loadUsageData();
    this.limits = this.loadLimits();
    this.startMonitoring();
  }
  private loadUsageData(): UsageData { try { const value = appStore.getStrict<unknown>('usageData'); if (value === null) return defaultUsage(); if (isUsageData(value)) return value; this.usageStorageAvailable = false; return defaultUsage(); } catch { this.usageStorageAvailable = false; return defaultUsage(); } }
  private loadLimits(): UsageLimits { try { const value = appStore.getStrict<unknown>('usageLimits'); if (value === null) return { ...DEFAULT_LIMITS }; if (isLimits(value)) return value; if (isMigratableLegacyLimits(value)) { const migrated = { ...value, maxDailyRequests: MAX_PARENT_REQUESTS }; appStore.setStrict('usageLimits', migrated); return migrated; } this.limitsStorageAvailable = false; return { ...DEFAULT_LIMITS }; } catch { this.limitsStorageAvailable = false; return { ...DEFAULT_LIMITS }; } }
  private persistUsage(candidate: UsageData): boolean { try { appStore.setStrict('usageData', candidate); this.usage = candidate; this.usageStorageAvailable = true; return true; } catch { this.usageStorageAvailable = false; return false; } }
  private resetMeasurementBaseline(): void {
    this.accumulatedMs = 0;
    this.sessionStart = Date.now();
  }
  private ensureToday(): boolean {
    if (!this.usageStorageAvailable) return false;
    if (this.usage.lastReset === today()) return true;
    const rolledOver = this.persistUsage(defaultUsage());
    if (rolledOver) this.resetMeasurementBaseline();
    return rolledOver;
  }

  private startMonitoring(): void {
    this.sessionStart = Date.now(); this.lastActivity = Date.now();
    setInterval(() => this.updateScreenTime(), 60_000);
    setInterval(() => this.checkInactivity(), 300_000);
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((event) => window.addEventListener(event, () => { this.lastActivity = Date.now(); }));
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.updateScreenTime(true); else this.sessionStart = Date.now(); });
  }
  private updateScreenTime(includeHiddenTransition = false): void {
    if ((document.hidden && !includeHiddenTransition) || !this.ensureToday()) return;
    const now = Date.now(); const elapsedMs = now - this.sessionStart; this.sessionStart = now;
    if (elapsedMs <= 0) return;
    const accumulatedMs = this.accumulatedMs + elapsedMs;
    const wholeMinutes = Math.floor(accumulatedMs / 60_000);
    if (wholeMinutes > 0) {
      const candidate = {
        ...this.usage,
        dailyScreenTime: Math.min(
          MAX_MINUTES,
          this.usage.dailyScreenTime + wholeMinutes,
        ),
      };
      this.accumulatedMs = accumulatedMs;
      if (this.persistUsage(candidate)) {
        this.accumulatedMs -= wholeMinutes * 60_000;
      }
    }
    else this.accumulatedMs = accumulatedMs;
    this.consecutiveMs += elapsedMs;
    if (
      this.consecutiveMs >= this.limits.maxConsecutiveTime * 60_000 &&
      !this.warningShown
    ) {
      this.showBreakReminder();
      this.warningShown = true;
    }
  }
  private checkInactivity(): void {
    if (Math.floor((Date.now() - this.lastActivity) / 60_000) > 5) {
      this.sessionStart = Date.now();
      this.warningShown = false;
      this.consecutiveMs = 0;
    }
  }
  private showBreakReminder(): void {
    const notification = document.createElement('div'); notification.className = 'break-reminder';
    notification.innerHTML = `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 10000; text-align: center; max-width: 400px;"><h2 style="margin: 0 0 1rem 0; font-size: 1.5rem;">Time for a Break!</h2><p style="margin: 0 0 1rem 0;">Vibe Tutor has been visible for ${this.limits.maxConsecutiveTime} minutes. Time to rest your eyes and stretch!</p><p style="margin: 0 0 1.5rem 0; font-size: 2rem;">Take a ${this.limits.breakDuration} minute break</p><button type="button" style="background: white; color: #667eea; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; font-size: 1rem; font-weight: bold; cursor: pointer;">OK, I'll take a break!</button></div>`;
    notification.querySelector('button')?.addEventListener('click', () => notification.remove()); document.body.appendChild(notification); setTimeout(() => notification.remove(), 30_000);
  }
  public checkQuietHours(): boolean {
    if (this.isDevBypassActive()) return false;
    const hour = new Date().getHours();
    return this.limits.quietHoursStart > this.limits.quietHoursEnd
      ? hour >= this.limits.quietHoursStart || hour < this.limits.quietHoursEnd
      : hour >= this.limits.quietHoursStart && hour < this.limits.quietHoursEnd;
  }
  public reserveRequest(): Reservation {
    if (this.isDevBypassActive()) {
      const reservationId = `ai-reply-${++this.reservationSequence}`;
      this.activeReservations.add(reservationId);
      return { allowed: true, reservationId };
    }
    if (!this.usageStorageAvailable || !this.limitsStorageAvailable) return { allowed: false, reason: 'Usage controls are unavailable. Please try again later.' };
    if (!this.ensureToday()) return { allowed: false, reason: 'Usage controls could not be saved. Please try again later.' };
    if (this.checkQuietHours()) return { allowed: false, reason: `Quiet hours pause new AI replies from ${this.limits.quietHoursStart}:00 to ${this.limits.quietHoursEnd}:00.` };
    if (this.usage.dailyScreenTime >= this.limits.maxDailyScreenTime) return { allowed: false, reason: `Daily visible app time limit reached (${this.limits.maxDailyScreenTime} minutes).` };
    if (this.usage.dailyRequests + this.activeReservations.size >= this.limits.maxDailyRequests) return { allowed: false, reason: `Daily AI reply limit reached (${this.limits.maxDailyRequests}). Try again tomorrow!` };
    const reservationId = `ai-reply-${++this.reservationSequence}`; this.activeReservations.add(reservationId); return { allowed: true, reservationId };
  }
  public async commitRequest(reservationId: string): Promise<boolean> {
    if (!this.activeReservations.has(reservationId) || !this.ensureToday()) return false;
    const candidate = {
      ...this.usage,
      dailyRequests: this.usage.dailyRequests + 1,
    };
    if (!this.persistUsage(candidate)) return false;
    this.activeReservations.delete(reservationId);
    return true;
  }
  public releaseRequest(reservationId: string): void {
    this.activeReservations.delete(reservationId);
  }
  public getUsageStats(): UsageData { this.ensureToday(); return { ...this.usage }; }
  public getLimits(): UsageLimits { return { ...this.limits }; }
  public async updateLimits(newLimits: Partial<UsageLimits>): Promise<void> { const candidate = { ...this.limits, ...newLimits }; if (!isLimits(candidate)) throw new Error('Invalid usage limits'); try { appStore.setStrict('usageLimits', candidate); this.limits = candidate; this.limitsStorageAvailable = true; } catch (error) { this.limitsStorageAvailable = false; throw error; } }
  public async resetToday(): Promise<void> { const candidate = defaultUsage(); try { appStore.setStrict('usageData', candidate); this.usage = candidate; this.usageStorageAvailable = true; this.resetMeasurementBaseline(); } catch (error) { this.usageStorageAvailable = false; throw error; } }
  public enableDevBypass(durationMs = 3600000): void {
    this.devBypassUntil = Date.now() + durationMs;
    try {
      appStore.setStrict('devBypassUntil', this.devBypassUntil);
    } catch {
      // In-memory bypass remains active even if store write fails
    }
  }

  public disableDevBypass(): void {
    if (this.devBypassUntil === 0) return;
    this.devBypassUntil = 0;
    try {
      appStore.setStrict('devBypassUntil', 0);
    } catch {
      // Ignore
    }
  }

  public isDevBypassActive(): boolean {
    if (this.devBypassUntil > 0 && Date.now() < this.devBypassUntil) {
      return true;
    }
    if (this.devBypassUntil === 0) {
      try {
        const stored = appStore.getStrict<number>('devBypassUntil');
        if (typeof stored === 'number' && Number.isFinite(stored) && stored > Date.now()) {
          this.devBypassUntil = stored;
          return true;
        }
      } catch {
        // Ignore
      }
    }
    return false;
  }

  public getDevBypassRemainingMinutes(): number {
    if (!this.isDevBypassActive()) return 0;
    return Math.max(1, Math.ceil((this.devBypassUntil - Date.now()) / 60000));
  }

  public generateReport(): string {
    const bypassNote = this.isDevBypassActive()
      ? `\nDeveloper bypass active: ${this.getDevBypassRemainingMinutes()}m remaining`
      : '';
    return `Daily AI replies: ${this.usage.dailyRequests}/${this.limits.maxDailyRequests}\nVisible app time: ${this.usage.dailyScreenTime}/${this.limits.maxDailyScreenTime} minutes${bypassNote}`;
  }
}
export const usageMonitor = new UsageMonitor();
