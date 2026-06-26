import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '../promptBuilder';
import type { ActiveWindowInfo } from '@/services/computerUseService';

describe('buildSystemPrompt', () => {
  const goal = 'Open the Settings app and toggle dark mode';

  it('includes the goal text', () => {
    const prompt = buildSystemPrompt(goal, null);
    expect(prompt).toContain(goal);
  });

  it('includes active window process_name and title when provided', () => {
    const activeWindow: ActiveWindowInfo = {
      title: 'Settings',
      process_name: 'SystemSettings.exe',
      pid: 1234,
    };
    const prompt = buildSystemPrompt(goal, activeWindow);
    expect(prompt).toContain('SystemSettings.exe');
    expect(prompt).toContain('"Settings"');
  });

  it('falls back to "unknown" when activeWindow is null', () => {
    const prompt = buildSystemPrompt(goal, null);
    expect(prompt).toContain('Active Window: unknown');
  });

  it('mentions required action examples (mouse, keyboard, done)', () => {
    const prompt = buildSystemPrompt(goal, null);
    expect(prompt).toContain('"type": "mouse"');
    expect(prompt).toContain('"type": "keyboard"');
    expect(prompt).toContain('"type": "done"');
  });
});
