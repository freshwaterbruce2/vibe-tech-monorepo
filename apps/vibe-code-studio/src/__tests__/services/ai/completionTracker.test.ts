import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const trackEvent = vi.fn();

vi.mock('../../../services/TelemetryService', () => ({
  telemetry: {
    trackEvent: (...args: unknown[]) => trackEvent(...args),
  },
}));

const loggerWarn = vi.fn();
const loggerDebug = vi.fn();

vi.mock('../../../services/Logger', () => ({
  logger: {
    debug: (...args: unknown[]) => loggerDebug(...args),
    info: vi.fn(),
    warn: (...args: unknown[]) => loggerWarn(...args),
    error: vi.fn(),
  },
}));

import {
  getMessageFeedback,
  recordMessageFeedback,
  trackCompletionAction,
} from '../../../services/ai/completionTracker';

const STORAGE_KEY = 'vibe-code-studio-message-feedback';

describe('completionTracker feedback persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    trackEvent.mockClear();
    loggerWarn.mockClear();
    loggerDebug.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists positive feedback and forwards it to telemetry', () => {
    recordMessageFeedback('msg-1', 'positive');

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      'msg-1': 'positive',
    });
    expect(trackEvent).toHaveBeenCalledWith('ai_message_feedback', { rating: 'positive' });
    expect(getMessageFeedback('msg-1')).toBe('positive');
  });

  it('overwrites a prior rating for the same message', () => {
    recordMessageFeedback('msg-1', 'positive');
    recordMessageFeedback('msg-1', 'negative');

    expect(getMessageFeedback('msg-1')).toBe('negative');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({
      'msg-1': 'negative',
    });
  });

  it('returns null when no feedback exists', () => {
    expect(getMessageFeedback('unknown')).toBeNull();
  });

  it('ignores empty message ids on both read and write', () => {
    recordMessageFeedback('', 'positive');

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(trackEvent).not.toHaveBeenCalled();
    expect(getMessageFeedback('')).toBeNull();
  });

  it('recovers from corrupt stored feedback when writing', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    recordMessageFeedback('msg-2', 'positive');

    expect(loggerWarn).toHaveBeenCalled();
    expect(getMessageFeedback('msg-2')).toBe('positive');
  });

  it('treats a non-object payload as an empty store', () => {
    localStorage.setItem(STORAGE_KEY, 'null');

    expect(getMessageFeedback('msg-3')).toBeNull();
  });

  it('still reports telemetry when localStorage writes throw', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    recordMessageFeedback('msg-4', 'negative');

    expect(loggerWarn).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith('ai_message_feedback', { rating: 'negative' });
    setItemSpy.mockRestore();
  });

  it('returns null and warns when localStorage reads throw', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('read failure');
    });

    expect(getMessageFeedback('msg-5')).toBeNull();
    expect(loggerWarn).toHaveBeenCalled();
    getItemSpy.mockRestore();
  });

  it('logs completion actions in development', () => {
    const original = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';

    trackCompletionAction(true);
    trackCompletionAction(false);

    expect(loggerDebug).toHaveBeenCalledWith('[CompletionTracker] Completion', 'accepted');
    expect(loggerDebug).toHaveBeenCalledWith('[CompletionTracker] Completion', 'rejected');

    process.env['NODE_ENV'] = original;
  });
});
