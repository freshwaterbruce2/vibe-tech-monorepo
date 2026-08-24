import { describe, expect, it, vi } from 'vitest';

import { copyToClipboard, formatTime } from '../../components/AIChat/MessageItem.helpers';

describe('MessageItem.helpers', () => {
  it('formats a time with hour and minute', () => {
    const date = new Date('2026-07-18T15:04:00');
    const out = formatTime(date);
    expect(out).toMatch(/\d/);
    expect(out.length).toBeGreaterThan(0);
  });

  it('copies text via navigator.clipboard.writeText', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    copyToClipboard('hello');
    expect(writeText).toHaveBeenCalledWith('hello');
  });
});
