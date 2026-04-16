import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoice } from '../useVoice';

// ---------------------------------------------------------------------------
// Mock SpeechRecognition
// ---------------------------------------------------------------------------

type RecognitionHandler = ((e?: any) => void) | null;

function createMockRecognition() {
  const instance = {
    lang: '',
    interimResults: false,
    maxAlternatives: 1,
    continuous: false,
    onstart: null as RecognitionHandler,
    onresult: null as RecognitionHandler,
    onerror: null as RecognitionHandler,
    onend: null as RecognitionHandler,
    start: vi.fn(function (this: typeof instance) {
      // Simulate async start
      queueMicrotask(() => this.onstart?.());
    }),
    stop: vi.fn(function (this: typeof instance) {
      queueMicrotask(() => this.onend?.());
    }),
  };
  return instance;
}

let lastRecognitionInstance: ReturnType<typeof createMockRecognition> | null =
  null;

function MockSpeechRecognition() {
  const inst = createMockRecognition();
  lastRecognitionInstance = inst;
  return inst;
}

// ---------------------------------------------------------------------------
// Mock SpeechSynthesisUtterance (not available in jsdom)
// ---------------------------------------------------------------------------

class MockUtterance {
  text: string;
  lang = '';
  rate = 1;
  onend: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

// Install globally so `new SpeechSynthesisUtterance(...)` works in the hook
(globalThis as any).SpeechSynthesisUtterance = MockUtterance;

// ---------------------------------------------------------------------------
// Mock SpeechSynthesis
// ---------------------------------------------------------------------------

let lastUtterance: MockUtterance | null = null;

const mockSpeechSynthesis = {
  speaking: false,
  cancel: vi.fn(() => {
    mockSpeechSynthesis.speaking = false;
  }),
  speak: vi.fn((utt: MockUtterance) => {
    lastUtterance = utt;
    mockSpeechSynthesis.speaking = true;
  }),
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  lastRecognitionInstance = null;
  lastUtterance = null;
  mockSpeechSynthesis.speaking = false;
  vi.clearAllMocks();

  // Install SpeechRecognition on window
  Object.defineProperty(window, 'SpeechRecognition', {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  });

  // Install speechSynthesis on window
  Object.defineProperty(window, 'speechSynthesis', {
    value: mockSpeechSynthesis,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  // Clean up
  delete (window as any).SpeechRecognition;
  delete (window as any).webkitSpeechRecognition;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useVoice', () => {
  // ---- isSupported detection ----

  describe('isSupported', () => {
    it('returns true when SpeechRecognition is available', () => {
      const { result } = renderHook(() => useVoice());
      expect(result.current.isSupported).toBe(true);
    });

    it('returns true when only webkitSpeechRecognition is available', () => {
      delete (window as any).SpeechRecognition;
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        value: MockSpeechRecognition,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useVoice());
      expect(result.current.isSupported).toBe(true);

      delete (window as any).webkitSpeechRecognition;
    });

    it('returns false when no SpeechRecognition API is available', () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const { result } = renderHook(() => useVoice());
      expect(result.current.isSupported).toBe(false);
    });
  });

  // ---- startListening -> onresult -> onTranscript ----

  describe('startListening and transcription', () => {
    it('transitions to listening state after start', async () => {
      const { result } = renderHook(() => useVoice());

      expect(result.current.state).toBe('idle');

      await act(async () => {
        result.current.startListening();
        // Allow the queued microtask (onstart) to fire
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.state).toBe('listening');
      expect(lastRecognitionInstance?.start).toHaveBeenCalledTimes(1);
    });

    it('calls onTranscript with the recognized text', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoice({ onTranscript }));

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      // Simulate recognition result
      await act(async () => {
        lastRecognitionInstance?.onresult?.({
          results: { 0: { 0: { transcript: '  hello world  ' } } },
        });
      });

      expect(onTranscript).toHaveBeenCalledWith('hello world');
      expect(result.current.state).toBe('processing');
    });

    it('does not call onTranscript when transcript is empty', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoice({ onTranscript }));

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      await act(async () => {
        lastRecognitionInstance?.onresult?.({
          results: { 0: { 0: { transcript: '   ' } } },
        });
      });

      expect(onTranscript).not.toHaveBeenCalled();
    });

    it('sets lang on the recognition instance', async () => {
      const { result } = renderHook(() => useVoice({ lang: 'fr-FR' }));

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(lastRecognitionInstance?.lang).toBe('fr-FR');
    });

    it('defaults lang to en-US', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(lastRecognitionInstance?.lang).toBe('en-US');
    });
  });

  // ---- stopListening ----

  describe('stopListening', () => {
    it('calls stop and resets state to idle', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.state).toBe('listening');

      act(() => {
        result.current.stopListening();
      });

      expect(lastRecognitionInstance?.stop).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('idle');
    });
  });

  // ---- speak (SpeechSynthesis) ----

  describe('speak', () => {
    it('calls SpeechSynthesis.speak with a configured utterance', async () => {
      const { result } = renderHook(() => useVoice({ lang: 'en-US' }));

      let speakPromise: Promise<void>;
      act(() => {
        speakPromise = result.current.speak('Hello');
      });

      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
      expect(lastUtterance).toBeTruthy();
      expect(result.current.state).toBe('speaking');

      // Simulate utterance ending
      await act(async () => {
        lastUtterance?.onend?.(new Event('end') as any);
      });

      await speakPromise!;
      expect(result.current.state).toBe('idle');
    });

    it('cancels any in-progress speech before speaking', () => {
      mockSpeechSynthesis.speaking = true;
      const { result } = renderHook(() => useVoice());

      act(() => {
        void result.current.speak('New text');
      });

      // cancel is called before speak
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it('resolves if the utterance errors', async () => {
      const { result } = renderHook(() => useVoice());

      let speakPromise: Promise<void>;
      act(() => {
        speakPromise = result.current.speak('oops');
      });

      await act(async () => {
        lastUtterance?.onerror?.(new Event('error') as any);
      });

      // Should not reject -- resolves gracefully
      await expect(speakPromise!).resolves.toBeUndefined();
      expect(result.current.state).toBe('idle');
    });
  });

  // ---- barge-in: cancel TTS when starting listen ----

  describe('barge-in', () => {
    it('cancels in-progress TTS when startListening is called', async () => {
      const { result } = renderHook(() => useVoice());

      // Simulate TTS in progress
      mockSpeechSynthesis.speaking = true;

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(lastRecognitionInstance?.start).toHaveBeenCalled();
    });

    it('does not call cancel when TTS is not speaking', async () => {
      mockSpeechSynthesis.speaking = false;
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(mockSpeechSynthesis.cancel).not.toHaveBeenCalled();
    });
  });

  // ---- cancelSpeech ----

  describe('cancelSpeech', () => {
    it('cancels synthesis and resets state to idle', () => {
      const { result } = renderHook(() => useVoice());

      act(() => {
        void result.current.speak('long text');
      });

      expect(result.current.state).toBe('speaking');

      act(() => {
        result.current.cancelSpeech();
      });

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    });
  });

  // ---- error handling ----

  describe('error handling', () => {
    it('resets to idle on permanent recognition error', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.state).toBe('listening');

      // Use a non-transient error (transient errors like 'network' trigger retry)
      await act(async () => {
        lastRecognitionInstance?.onerror?.({ error: 'not-allowed' });
      });

      expect(result.current.state).toBe('idle');
      warnSpy.mockRestore();
    });

    it('retries on transient errors before giving up', async () => {
      vi.useFakeTimers();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        result.current.startListening();
        await vi.advanceTimersByTimeAsync(10);
      });

      expect(result.current.state).toBe('listening');

      // First transient error -- should schedule retry (not immediately idle)
      await act(async () => {
        lastRecognitionInstance?.onerror?.({ error: 'network' });
      });

      // State stays listening (retry pending, not idle)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('retry 1/2'),
      );

      // Advance past the retry delay (500ms) so the retry fires
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });

      // A new recognition instance was created by the retry
      expect(lastRecognitionInstance?.start).toHaveBeenCalled();

      vi.useRealTimers();
      warnSpy.mockRestore();
    });

    it('silently handles no-speech error', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      await act(async () => {
        lastRecognitionInstance?.onerror?.({ error: 'no-speech' });
      });

      // no-speech and aborted do NOT log a warning
      expect(warnSpy).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');

      warnSpy.mockRestore();
    });

    it('does not start recognition when API is unavailable', () => {
      delete (window as any).SpeechRecognition;
      delete (window as any).webkitSpeechRecognition;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useVoice());

      act(() => {
        result.current.startListening();
      });

      expect(lastRecognitionInstance).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not supported'),
      );

      warnSpy.mockRestore();
    });
  });

  // ---- onend transitions ----

  describe('onend transitions', () => {
    it('transitions from listening to idle when recognition ends naturally', async () => {
      const { result } = renderHook(() => useVoice());

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(result.current.state).toBe('listening');

      // Recognition ends without a result
      await act(async () => {
        lastRecognitionInstance?.onend?.();
      });

      expect(result.current.state).toBe('idle');
    });

    it('preserves processing state when recognition ends after a result', async () => {
      const onTranscript = vi.fn();
      const { result } = renderHook(() => useVoice({ onTranscript }));

      await act(async () => {
        result.current.startListening();
        await new Promise((r) => setTimeout(r, 10));
      });

      // Fire a result first (sets state to 'processing')
      await act(async () => {
        lastRecognitionInstance?.onresult?.({
          results: { 0: { 0: { transcript: 'hello' } } },
        });
      });

      expect(result.current.state).toBe('processing');

      // Then recognition ends -- should NOT reset to idle because we are processing
      await act(async () => {
        lastRecognitionInstance?.onend?.();
      });

      expect(result.current.state).toBe('processing');
    });
  });
});
