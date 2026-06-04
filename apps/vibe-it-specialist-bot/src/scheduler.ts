import type { Telegraf } from 'telegraf';
import type { BotConfig } from './config.js';
import { buildTask, runTask, telegramSafeText } from './tasks.js';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEDULER_INCIDENT_FILE = 'D:/logs/vibe-it-specialist-bot/scheduler-incidents.jsonl';

function logSchedulerIncident(event: string, error: unknown): void {
  try {
    mkdirSync(dirname(SCHEDULER_INCIDENT_FILE), { recursive: true });
    const record = {
      timestamp: new Date().toISOString(),
      event,
      error: error instanceof Error ? error.message : String(error)
    };
    appendFileSync(SCHEDULER_INCIDENT_FILE, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    console.error('Failed to write scheduler incident:', err);
  }
}

export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

async function sendMessageSafe(bot: Telegraf, adminId: number, text: string): Promise<void> {
  const safe = telegramSafeText(text);
  try {
    await bot.telegram.sendMessage(adminId, safe, { parse_mode: 'Markdown' });
  } catch {
    try {
      // Fallback without Markdown formatting on parsing error
      await bot.telegram.sendMessage(adminId, safe);
    } catch (err) {
      console.error(`Failed to send message to ${adminId}:`, err);
      logSchedulerIncident(`sendMessage:${adminId}`, err);
    }
  }
}

async function broadcast(bot: Telegraf, config: BotConfig, text: string): Promise<void> {
  for (const adminId of config.adminIds) {
    await sendMessageSafe(bot, adminId, text);
  }
}

async function runDailyMorning(bot: Telegraf, config: BotConfig): Promise<void> {
  try {
    await broadcast(bot, config, '=== Good morning! Running scheduled daily IT status & optimization checks ===');
    
    // 1. Bot status
    const statusTask = buildTask('status');
    const statusRes = await runTask(statusTask);
    await broadcast(bot, config, statusRes);

    // 2. Optimize trends
    const trendsTask = buildTask('run optimize-trends');
    const trendsRes = await runTask(trendsTask);
    await broadcast(bot, config, trendsRes);
  } catch (err) {
    console.error('Failed to run daily morning scheduled tasks:', err);
    logSchedulerIncident('daily-morning', err);
  }
}

async function runWeeklySummary(bot: Telegraf, config: BotConfig): Promise<void> {
  try {
    await broadcast(bot, config, '=== Monday Morning Weekly Checkpoint: Running full workspace optimization audits ===');
    
    // 1. Optimize
    const optTask = buildTask('run optimize');
    const optRes = await runTask(optTask);
    await broadcast(bot, config, optRes);

    // 2. Optimize paths
    const pathsTask = buildTask('run optimize-paths');
    const pathsRes = await runTask(pathsTask);
    await broadcast(bot, config, pathsRes);

    // 3. Optimize deps
    const depsTask = buildTask('run optimize-deps');
    const depsRes = await runTask(depsTask);
    await broadcast(bot, config, depsRes);

    // 4. Optimize targets
    const targetsTask = buildTask('run optimize-targets');
    const targetsRes = await runTask(targetsTask);
    await broadcast(bot, config, targetsRes);
  } catch (err) {
    console.error('Failed to run weekly scheduled tasks:', err);
    logSchedulerIncident('weekly-summary', err);
  }
}

export function startScheduler(bot: Telegraf, config: BotConfig): void {
  let lastDailyKey = '';
  let lastWeeklyKey = '';

  // Check every 30 seconds
  setInterval(() => {
    void (async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const dailyKey = `${year}-${month}-${date}`;
        const weeklyKey = `${year}-W${getWeekNumber(now)}`;

        // Check if it's 9:00 AM (local time)
        if (now.getHours() === 9 && now.getMinutes() === 0) {
          // Run daily task if not run today
          if (lastDailyKey !== dailyKey) {
            lastDailyKey = dailyKey;
            await runDailyMorning(bot, config);
          }

          // Run weekly task if it's Monday (day 1) and not run this week
          if (now.getDay() === 1 && lastWeeklyKey !== weeklyKey) {
            lastWeeklyKey = weeklyKey;
            await runWeeklySummary(bot, config);
          }
        }
      } catch (err) {
        console.error('Error in scheduler loop:', err);
        logSchedulerIncident('scheduler-loop', err);
      }
    })();
  }, 30000);
}
