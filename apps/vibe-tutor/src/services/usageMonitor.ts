// Usage monitoring and parental controls service

import { appStore } from '../utils/electronStore';

// Temporary testing override: disable quiet-hours enforcement for manual QA runs.
const QUIET_HOURS_TEMPORARILY_DISABLED = true;

interface UsageData {
  dailyRequests: number;
  dailyScreenTime: number; // minutes
  lastReset: string;
  focusSessions: number;
  homeworkCompleted: number;
  aiInteractions: number;
  violations: string[];
}

interface UsageLimits {
  maxDailyRequests: number;
  maxDailyScreenTime: number; // minutes
  maxConsecutiveTime: number; // minutes
  breakDuration: number; // minutes
  quietHoursStart: number; // hour (0-23)
  quietHoursEnd: number; // hour (0-23)
}

class UsageMonitor {
  private usage: UsageData;
  private limits: UsageLimits;
  private sessionStart = 0;
  private lastActivity = 0;
  private warningShown = false;

  constructor() {
    this.usage = this.loadUsageData();
    this.limits = this.loadLimits();
    this.startMonitoring();
  }

  private loadUsageData(): UsageData {
    const data = appStore.get<UsageData>('usageData');
    const today = new Date().toDateString();

    if (data) {
      // Reset daily counters if it's a new day
      if (data.lastReset !== today) {
        return {
          dailyRequests: 0,
          dailyScreenTime: 0,
          lastReset: today,
          focusSessions: 0,
          homeworkCompleted: 0,
          aiInteractions: 0,
          violations: [],
        };
      }
      return data;
    }

    return {
      dailyRequests: 0,
      dailyScreenTime: 0,
      lastReset: today,
      focusSessions: 0,
      homeworkCompleted: 0,
      aiInteractions: 0,
      violations: [],
    };
  }

  private loadLimits(): UsageLimits {
    const stored = appStore.get<UsageLimits>('usageLimits');
    if (stored) {
      return stored;
    }

    // Default limits (can be adjusted by parents)
    return {
      maxDailyRequests: 50,
      maxDailyScreenTime: 120, // 2 hours
      maxConsecutiveTime: 30, // 30 minutes
      breakDuration: 10, // 10 minutes
      quietHoursStart: 21, // 9 PM
      quietHoursEnd: 7, // 7 AM
    };
  }

  private saveUsageData(): void {
    appStore.set('usageData', JSON.stringify(this.usage));
  }

  private saveLimits(): void {
    appStore.set('usageLimits', JSON.stringify(this.limits));
  }

  private startMonitoring(): void {
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();

    // Update screen time every minute
    setInterval(() => {
      this.updateScreenTime();
    }, 60000);

    // Check for inactivity every 5 minutes
    setInterval(() => {
      this.checkInactivity();
    }, 300000);

    // Listen for user activity
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((event) => {
      window.addEventListener(event, () => {
        this.lastActivity = Date.now();
      });
    });

    // Listen for visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.updateScreenTime();
      } else {
        this.sessionStart = Date.now();
      }
    });
  }

  private updateScreenTime(): void {
    if (!document.hidden) {
      const sessionTime = Math.floor((Date.now() - this.sessionStart) / 60000);
      this.usage.dailyScreenTime += sessionTime;
      this.sessionStart = Date.now();
      this.saveUsageData();

      // Check consecutive usage
      if (sessionTime >= this.limits.maxConsecutiveTime && !this.warningShown) {
        this.showBreakReminder();
        this.warningShown = true;
      }
    }
  }

  private checkInactivity(): void {
    const inactiveTime = Math.floor((Date.now() - this.lastActivity) / 60000);
    if (inactiveTime > 5) {
      // Reset session if inactive for more than 5 minutes
      this.sessionStart = Date.now();
      this.warningShown = false;
    }
  }

  private showBreakReminder(): void {
    const notification = document.createElement('div');
    notification.className = 'break-reminder';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 10000;
        text-align: center;
        max-width: 400px;
      ">
        <h2 style="margin: 0 0 1rem 0; font-size: 1.5rem;">Time for a Break!</h2>
        <p style="margin: 0 0 1rem 0;">You've been studying for ${this.limits.maxConsecutiveTime} minutes. Time to rest your eyes and stretch!</p>
        <p style="margin: 0 0 1.5rem 0; font-size: 2rem;">Take a ${this.limits.breakDuration} minute break</p>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: white;
          color: #667eea;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
        ">OK, I'll take a break!</button>
      </div>
    `;
    document.body.appendChild(notification);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      notification.remove();
    }, 30000);
  }

  public checkQuietHours(): boolean {
    if (QUIET_HOURS_TEMPORARILY_DISABLED) {
      return false;
    }

    const now = new Date();
    const hour = now.getHours();

    if (this.limits.quietHoursStart > this.limits.quietHoursEnd) {
      // Quiet hours span midnight
      return hour >= this.limits.quietHoursStart || hour < this.limits.quietHoursEnd;
    } else {
      return hour >= this.limits.quietHoursStart && hour < this.limits.quietHoursEnd;
    }
  }

  public canMakeRequest(): { allowed: boolean; reason?: string } {
    // Check quiet hours
    if (this.checkQuietHours()) {
      return {
        allowed: false,
        reason: `It's quiet hours! The app is disabled from ${this.limits.quietHoursStart}:00 to ${this.limits.quietHoursEnd}:00.`,
      };
    }

    // Check daily request limit
    if (this.usage.dailyRequests >= this.limits.maxDailyRequests) {
      return {
        allowed: false,
        reason: `Daily AI request limit reached (${this.limits.maxDailyRequests}). Try again tomorrow!`,
      };
    }

    // Check screen time limit
    if (this.usage.dailyScreenTime >= this.limits.maxDailyScreenTime) {
      return {
        allowed: false,
        reason: `Daily screen time limit reached (${this.limits.maxDailyScreenTime} minutes). Time to do something else!`,
      };
    }

    return { allowed: true };
  }

  public recordRequest(): void {
    this.usage.dailyRequests++;
    this.usage.aiInteractions++;
    this.saveUsageData();
  }

  public recordHomework(): void {
    this.usage.homeworkCompleted++;
    this.saveUsageData();
  }

  public recordFocusSession(): void {
    this.usage.focusSessions++;
    this.saveUsageData();
  }

  public recordViolation(type: string): void {
    const violation = `${new Date().toISOString()}: ${type}`;
    this.usage.violations.push(violation);
    this.saveUsageData();
  }

  public getUsageStats(): UsageData {
    return { ...this.usage };
  }

  public updateLimits(newLimits: Partial<UsageLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    this.saveLimits();
  }

  public getLimits(): UsageLimits {
    return { ...this.limits };
  }

  public generateReport(): string {
    const stats = this.getUsageStats();
    return `
Daily Usage Report:
- AI Requests: ${stats.dailyRequests}/${this.limits.maxDailyRequests}
- Screen Time: ${stats.dailyScreenTime}/${this.limits.maxDailyScreenTime} minutes
- Focus Sessions: ${stats.focusSessions}
- Homework Completed: ${stats.homeworkCompleted}
- Total AI Interactions: ${stats.aiInteractions}
${stats.violations.length > 0 ? `\nViolations:\n${stats.violations.join('\n')}` : ''}
    `.trim();
  }
}

// Create singleton instance
export const usageMonitor = new UsageMonitor();

// Export types
export type { UsageData, UsageLimits };
