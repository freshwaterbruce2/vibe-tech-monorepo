import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '../useSpeechRecognition';
import { mockSpeechRecognition } from '../../__tests__/test-utils';

describe('useSpeechRecognition', () => {
  let SpeechRecognitionMock: any;

  beforeEach(() => {
    SpeechRecognitionMock = mockSpeechRecognition();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.isSupported).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('detects when speech recognition is not supported', () => {
      // Mock browser without speech recognition
      Object.defineProperty(window, 'SpeechRecognition', {
        writable: true,
        value: undefined,
      });
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        writable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useSpeechRecognition());

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('Starting Recognition', () => {
    it('starts listening when startListening is called', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);
      expect(SpeechRecognitionMock).toHaveBeenCalledTimes(1);
    });

    it('configures speech recognition with correct settings', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;
      expect(recognitionInstance.continuous).toBe(false);
      expect(recognitionInstance.interimResults).toBe(true);
      expect(recognitionInstance.lang).toBe('en-US');
    });

    it('does not start if already listening', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.startListening();
      });

      // Should still only have been called once
      expect(SpeechRecognitionMock).toHaveBeenCalledTimes(1);
    });

    it('does not start if not supported', () => {
      Object.defineProperty(window, 'SpeechRecognition', {
        writable: true,
        value: undefined,
      });
      Object.defineProperty(window, 'webkitSpeechRecognition', {
        writable: true,
        value: undefined,
      });

      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe('Stopping Recognition', () => {
    it('stops listening when stopListening is called', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      act(() => {
        result.current.stopListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(recognitionInstance.stop).toHaveBeenCalled();
    });

    it('handles stopping when not listening', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.stopListening();
      });

      // Should not throw error
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('Speech Recognition Events', () => {
    it('handles onresult event correctly', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      // Simulate speech recognition result
      const mockEvent = {
        results: [
          {
            0: { transcript: 'door 332' },
            isFinal: true,
            length: 1,
          },
        ],
        resultIndex: 0,
      };

      act(() => {
        recognitionInstance.onresult(mockEvent);
      });

      expect(result.current.transcript).toBe('door 332');
    });

    it('handles interim results', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      // Simulate interim result
      const mockEvent = {
        results: [
          {
            0: { transcript: 'door' },
            isFinal: false,
            length: 1,
          },
        ],
        resultIndex: 0,
      };

      act(() => {
        recognitionInstance.onresult(mockEvent);
      });

      expect(result.current.transcript).toBe('door');
    });

    it('handles onerror event', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      act(() => {
        recognitionInstance.onerror({ error: 'network' });
      });

      expect(result.current.error).toBe('network');
      expect(result.current.isListening).toBe(false);
    });

    it('handles onend event', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      act(() => {
        recognitionInstance.onend();
      });

      expect(result.current.isListening).toBe(false);
    });

    it('handles onstart event', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      act(() => {
        recognitionInstance.onstart();
      });

      expect(result.current.isListening).toBe(true);
    });
  });

  describe('Transcript Management', () => {
    it('resets transcript when resetTranscript is called', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      // Add some transcript
      const mockEvent = {
        results: [
          {
            0: { transcript: 'door 332' },
            isFinal: true,
            length: 1,
          },
        ],
        resultIndex: 0,
      };

      act(() => {
        recognitionInstance.onresult(mockEvent);
      });

      expect(result.current.transcript).toBe('door 332');

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
    });

    it('accumulates multiple final results', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      // First result
      const mockEvent1 = {
        results: [
          {
            0: { transcript: 'door 332' },
            isFinal: true,
            length: 1,
          },
        ],
        resultIndex: 0,
      };

      act(() => {
        recognitionInstance.onresult(mockEvent1);
      });

      // Second result (new session)
      const mockEvent2 = {
        results: [
          {
            0: { transcript: 'delete door 334' },
            isFinal: true,
            length: 1,
          },
        ],
        resultIndex: 0,
      };

      act(() => {
        recognitionInstance.onresult(mockEvent2);
      });

      expect(result.current.transcript).toBe('delete door 334');
    });
  });

  describe('Error Handling', () => {
    it('handles permission denied error', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      act(() => {
        recognitionInstance.onerror({ error: 'not-allowed' });
      });

      expect(result.current.error).toBe('not-allowed');
      expect(result.current.isListening).toBe(false);
    });

    it('handles no-speech error gracefully', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      act(() => {
        recognitionInstance.onerror({ error: 'no-speech' });
      });

      expect(result.current.error).toBe('no-speech');
      expect(result.current.isListening).toBe(false);
    });

    it('clears error when starting new session', () => {
      const { result } = renderHook(() => useSpeechRecognition());

      // Cause an error
      act(() => {
        result.current.startListening();
      });

      const recognitionInstance1 = SpeechRecognitionMock.mock.results[0].value;

      act(() => {
        recognitionInstance1.onerror({ error: 'network' });
      });

      expect(result.current.error).toBe('network');

      // Start new session
      act(() => {
        result.current.startListening();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('cleans up recognition instance on unmount', () => {
      const { result, unmount } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;

      unmount();

      expect(recognitionInstance.stop).toHaveBeenCalled();
    });

    it('stops listening when component unmounts during active session', () => {
      const { result, unmount } = renderHook(() => useSpeechRecognition());

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      unmount();

      // Recognition should be stopped
      const recognitionInstance = SpeechRecognitionMock.mock.results[0].value;
      expect(recognitionInstance.stop).toHaveBeenCalled();
    });
  });
});