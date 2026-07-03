import { describe, expect, it } from 'vitest';
import { parseStatusPayload, statusLabel, STATUS_EVENT } from '../status';

describe('statusLabel', () => {
  it('labels every status', () => {
    expect(statusLabel({ status: 'idle' })).toContain('Idle');
    expect(statusLabel({ status: 'listening' })).toBe('Listening…');
    expect(statusLabel({ status: 'processing' })).toBe('Processing…');
    expect(statusLabel({ status: 'injected' })).toBe('Text injected');
    expect(statusLabel({ status: 'error' })).toBe('Error');
  });

  it('appends detail when present', () => {
    expect(statusLabel({ status: 'error', detail: 'boom' })).toBe('Error: boom');
  });
});

describe('parseStatusPayload', () => {
  it('accepts valid payloads', () => {
    expect(parseStatusPayload({ status: 'listening' })).toEqual({
      status: 'listening',
      detail: undefined,
    });
    expect(parseStatusPayload({ status: 'error', detail: 'x' })).toEqual({
      status: 'error',
      detail: 'x',
    });
  });

  it('rejects invalid payloads', () => {
    expect(parseStatusPayload(null)).toBeNull();
    expect(parseStatusPayload('idle')).toBeNull();
    expect(parseStatusPayload({ status: 'nope' })).toBeNull();
    expect(parseStatusPayload({})).toBeNull();
  });

  it('drops non-string detail', () => {
    expect(parseStatusPayload({ status: 'idle', detail: 42 })).toEqual({
      status: 'idle',
      detail: undefined,
    });
  });
});

describe('STATUS_EVENT', () => {
  it('is the vibe-flow status channel', () => {
    expect(STATUS_EVENT).toBe('vibe-flow://status');
  });
});
