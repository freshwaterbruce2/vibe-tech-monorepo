import { describe, expect, it } from 'vitest';
import { formatHHMMSS } from '../useTimer';

describe('formatHHMMSS', () => {
  it('formats zero seconds', () => {
    expect(formatHHMMSS(0)).toBe('00:00:00');
  });

  it('formats seconds only', () => {
    expect(formatHHMMSS(45)).toBe('00:00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatHHMMSS(125)).toBe('00:02:05');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatHHMMSS(3661)).toBe('01:01:01');
  });

  it('pads single-digit values', () => {
    expect(formatHHMMSS(1)).toBe('00:00:01');
    expect(formatHHMMSS(60)).toBe('00:01:00');
    expect(formatHHMMSS(3600)).toBe('01:00:00');
  });

  it('handles large values', () => {
    // 99 hours + 59 min + 59 sec = 359999
    expect(formatHHMMSS(359999)).toBe('99:59:59');
  });
});
