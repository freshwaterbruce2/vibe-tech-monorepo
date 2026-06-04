import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Markup, Telegraf } from 'telegraf';
import type { Context } from 'telegraf';
import { isUserAllowed } from './config.js';
import type { BotConfig } from './config.js';
import { buildTask, getTaskSafety, listTaskKeys, runTask, telegramSafeText } from './tasks.js';

const pendingTasks = new Map<number, string>();

const STATUS_FILE_PATH = 'D:/logs/vibe-it-specialist-bot/.status.json';
const botStartedAt = Date.now();

function saveBotStatus() {
  try {
    mkdirSync(dirname(STATUS_FILE_PATH), { recursive: true });
    writeFileSync(STATUS_FILE_PATH, JSON.stringify({
      pid: process.pid,
      startedAt: botStartedAt,
      pendingCount: pendingTasks.size
    }), 'utf8');
  } catch (err) {
    console.error('Failed to write bot status file', err);
  }
}

export function createBot(config: BotConfig): Telegraf {
  const bot = new Telegraf(config.botToken);
  
  // Write initial status on bot startup
  saveBotStatus();

  bot.use(async (ctx, next) => {
    if (!isUserAllowed(config, ctx.from)) {
      await ctx.reply('Unauthorized. Add your numeric Telegram user ID or @username to ADMIN_TELEGRAM_IDS.');
      return;
    }
    await next();
  });

  bot.start(async (ctx) => { await ctx.reply(helpText(), mainMenu()); });
  bot.help(async (ctx) => { await ctx.reply(helpText(), mainMenu()); });
  bot.command('menu', async (ctx) => { await ctx.reply('IT specialist menu:', mainMenu()); });

  bot.command('it', async (ctx) => {
    const text = ctx.message.text.replace(/^\/it\s*/, '').trim();
    if (!text) {
      await ctx.reply(helpText(), mainMenu());
      return;
    }
    await prepareOrRun(ctx, text);
  });

  for (const task of ['status', 'ci', 'incidents', 'diagnose', 'health', 'affected-quality', 'git-status', 'nx-report', 'optimize', 'optimize-targets', 'optimize-deps', 'optimize-hygiene', 'optimize-paths', 'optimize-trends', 'optimize-cache', 'optimize-report'] as const) {
    bot.action(`run:${task}`, async (ctx) => {
      await ctx.answerCbQuery(`Running ${task}`);
      await prepareOrRun(ctx, `run ${task}`);
    });
  }

  for (const task of ['nx-reset', 'pnpm-install', 'pnpm-store-prune', 'fix-pnpm'] as const) {
    bot.action(`confirm:${task}`, async (ctx) => {
      const id = ctx.from.id;
      pendingTasks.set(id, `run ${task}`);
      saveBotStatus();
      await ctx.answerCbQuery('Confirmation required');
      await ctx.reply(`Confirm mutating task: ${task}`, confirmationMenu());
    });
  }
  
  bot.action('confirm:fix-paths', async (ctx) => {
    const id = ctx.from.id;
    pendingTasks.set(id, 'fix path-policy');
    saveBotStatus();
    await ctx.answerCbQuery('Confirmation required');
    await ctx.reply('Confirm mutating task: Fix Path Policy', confirmationMenu());
  });

  bot.action('confirm:fix-typescript', async (ctx) => {
    const id = ctx.from.id;
    pendingTasks.set(id, 'fix typescript-version');
    saveBotStatus();
    await ctx.answerCbQuery('Confirmation required');
    await ctx.reply('Confirm mutating task: Fix TypeScript Version', confirmationMenu());
  });

  bot.action('confirm:fix-targets', async (ctx) => {
    const id = ctx.from.id;
    pendingTasks.set(id, 'fix target-coverage');
    saveBotStatus();
    await ctx.answerCbQuery('Confirmation required');
    await ctx.reply('Confirm mutating task: Fix Target Coverage', confirmationMenu());
  });

  bot.action('confirm_run', async (ctx) => {
    const id = ctx.from.id;
    const input = pendingTasks.get(id);
    pendingTasks.delete(id);
    saveBotStatus();
    await ctx.answerCbQuery('Confirmed');
    if (!input) {
      await ctx.reply('No pending task to confirm.');
      return;
    }
    await runAndReply(ctx, input, true);
  });

  bot.action('cancel_run', async (ctx) => {
    pendingTasks.delete(ctx.from.id);
    saveBotStatus();
    await ctx.answerCbQuery('Cancelled');
    await ctx.reply('Cancelled.');
  });

  bot.catch((error, ctx) => {
    console.error('vibe-it-specialist-bot error', { updateId: ctx.update.update_id, error });
    void ctx.reply(`Error: ${error instanceof Error ? error.message : String(error)}`);
  });

  return bot;
}

function mainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Status', 'run:status'), Markup.button.callback('CI Status', 'run:ci'), Markup.button.callback('Incidents', 'run:incidents')],
    [Markup.button.callback('Diagnose', 'run:diagnose'), Markup.button.callback('Git Status', 'run:git-status'), Markup.button.callback('Nx Report', 'run:nx-report')],
    [Markup.button.callback('Affected Checks', 'run:affected-quality'), Markup.button.callback('Optimize Workspace', 'run:optimize')],
    [Markup.button.callback('Fix Path Policy', 'confirm:fix-paths'), Markup.button.callback('Fix TS Version', 'confirm:fix-typescript')],
    [Markup.button.callback('Fix Targets', 'confirm:fix-targets'), Markup.button.callback('Reset Nx Cache', 'confirm:nx-reset')],
    [Markup.button.callback('PNPM Install', 'confirm:pnpm-install'), Markup.button.callback('Prune Store', 'confirm:pnpm-store-prune')],
  ]);
}

function confirmationMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('Confirm run', 'confirm_run'), Markup.button.callback('Cancel', 'cancel_run')],
  ]);
}

function helpText(): string {
  return `Vibe IT Specialist Bot\n\n` +
    `Read-only diagnostics run immediately. Mutating fixes require confirmation.\n\n` +
    `Commands:\n` +
    `/it status\n` +
    `/it ci\n` +
    `/it incidents\n` +
    `/it diagnose\n` +
    `/it health\n` +
    `/it affected\n` +
    `/it optimize [targets|deps|hygiene|cache|paths|trends|report]\n` +
    `/it fix path-policy\n` +
    `/it fix typescript-version\n` +
    `/it fix target-coverage\n` +
    `/it run <allowlisted-task>\n` +
    `/it typecheck <project>\n` +
    `/it build <project>\n` +
    `/it test <project>\n` +
    `/it project <project> <typecheck|build|test>\n` +
    `/it git status\n` +
    `/it nx <report|reset>\n` +
    `/it pnpm <install|install-check|store-prune|nx-reset>\n\n` +
    `Allowlisted tasks:\n${listTaskKeys().join(', ')}\n\n` +
    `Logs and run history are saved to D:/logs/vibe-it-specialist-bot.`;
}

async function prepareOrRun(ctx: Context, input: string): Promise<void> {
  const task = buildTask(input);
  const safety = getTaskSafety(task);
  if (safety.requiresConfirmation) {
    if (!ctx.from?.id) {
      await ctx.reply('Cannot confirm task without a Telegram user ID.');
      return;
    }
    pendingTasks.set(ctx.from.id, input);
    saveBotStatus();
    await ctx.reply(`${safety.reason}\n\nTask: ${task.label}\nCommand: ${task.command}`, confirmationMenu());
    return;
  }
  await runAndReply(ctx, input, false);
}

async function runAndReply(ctx: Context, input: string, confirmed: boolean): Promise<void> {
  const task = buildTask(input);
  const safety = getTaskSafety(task);
  if (safety.requiresConfirmation && !confirmed) {
    await ctx.reply(`${safety.reason}\n\nTask: ${task.label}\nCommand: ${task.command}`, confirmationMenu());
    return;
  }

  await ctx.reply(`Running: ${task.label}\nI will send the result when it finishes. Log: ${task.logPath}`);
  await ctx.sendChatAction('typing');

  void runTask(task)
    .then(async (result) => { await ctx.reply(telegramSafeText(result)); })
    .catch(async (error: unknown) => { await ctx.reply(`Error running ${task.label}: ${error instanceof Error ? error.message : String(error)}`); });
}
