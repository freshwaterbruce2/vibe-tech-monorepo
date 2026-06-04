import { describe, expect, it, vi } from 'vitest';
import { getWeekNumber, startScheduler } from '../src/scheduler.js';
import type { Telegraf } from 'telegraf';
import type { BotConfig } from '../src/config.js';

describe('scheduler features', () => {
  it('correctly calculates the week number of a date', () => {
    // 2026-06-04 is a Thursday. Week 23 of 2026.
    const date = new Date('2026-06-04T12:00:00Z');
    const week = getWeekNumber(date);
    expect(week).toBe(23);
  });

  it('sets up a scheduler loop without crashing', () => {
    const mockBot = {
      telegram: {
        sendMessage: vi.fn(),
      },
    } as unknown as Telegraf;

    const mockConfig = {
      botToken: '123:test',
      adminIds: new Set([12345]),
      adminUsernames: new Set(),
    } as unknown as BotConfig;

    vi.useFakeTimers();
    startScheduler(mockBot, mockConfig);
    
    // Advance timers slightly to verify no crash on tick
    vi.advanceTimersByTime(65000);
    vi.useRealTimers();
  });
});
