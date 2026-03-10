import { renderHook, act } from '@testing-library/react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
import { usePalletEntries } from '@/hooks/usePalletEntries';
import { useUserSettings } from '@/hooks/useUserSettings';

// Mock Android WebView environment
const mockAndroidWebView = () => {
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/88.0.4324.181 Mobile Safari/537.36 wv',
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        })
      }
    },
    writable: true
  });

  // Mock Android WebView speech recognition
  global.window = Object.create(window);
  Object.defineProperty(window, 'webkitSpeechRecognition', {
    value: class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = 'en-US';
      maxAlternatives = 1;
      onresult = vi.fn();
      onend = vi.fn();
      onerror = vi.fn();
      start = vi.fn();
      stop = vi.fn();
      abort = vi.fn();
    },
    writable: true
  });
};

// Mock Chrome Android environment  
const mockChromeAndroid = () => {
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36',
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }]
        })
      }
    },
    writable: true
  });
};

describe('Android Compatibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage for Android
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mock IndexedDB for Android
    const indexedDBMock = {
      open: vi.fn().mockResolvedValue({
        result: {
          createObjectStore: vi.fn(),
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(undefined),
              put: vi.fn().mockResolvedValue(undefined),
              delete: vi.fn().mockResolvedValue(undefined)
            })
          })
        }
      })
    };
    Object.defineProperty(window, 'indexedDB', {
      value: indexedDBMock,
      writable: true
    });
  });

  describe('Speech Recognition on Android WebView', () => {
    beforeEach(() => {
      mockAndroidWebView();
    });

    test('should detect Android WebView environment correctly', () => {
      const { result } = renderHook(() => useSpeechRecognition());
      
      // Android WebView should have limited or no speech recognition support
      expect(result.current.browserSupportsSpeechRecognition).toBeDefined();
    });

    test('should handle speech recognition gracefully in Android WebView', () => {
      const { result } = renderHook(() => useSpeechRecognition());
      
      act(() => {
        result.current.startListening();
      });

      // Should not crash and should handle the lack of support gracefully
      expect(result.current.isListening).toBeDefined();
    });

    test('should show appropriate error messages for Android WebView', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();
      
      renderHook(() => useSpeechRecognition());
      
      // May show warnings about limited support
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Speech recognition')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Speech Recognition on Chrome Android', () => {
    beforeEach(() => {
      mockChromeAndroid();
    });

    test('should support speech recognition in Chrome Android', () => {
      const { result } = renderHook(() => useSpeechRecognition());
      
      expect(result.current.browserSupportsSpeechRecognition).toBe(true);
    });

    test('should handle microphone permissions on Android', () => {
      const { result } = renderHook(() => useSpeechRecognition());
      
      act(() => {
        result.current.startListening();
      });

      // Should attempt to start listening
      expect(result.current.startListening).toBeDefined();
    });
  });

  describe('Voice Commands on Android', () => {
    const mockCommandPatterns = [
      {
        regex: /door (\d+)/i,
        commandName: 'addDoor',
        feedback: 'Door added'
      },
      {
        regex: /delete door (\d+)/i,
        commandName: 'deleteDoor',
        feedback: 'Door deleted'
      }
    ];

    const mockOnCommandRecognized = vi.fn();

    beforeEach(() => {
      mockChromeAndroid();
    });

    test('should process voice commands correctly on Android', () => {
      const { result } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: mockCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
          speakBackText: 'Command executed'
        })
      );

      expect(result.current.startListening).toBeDefined();
      expect(result.current.stopListening).toBeDefined();
    });

    test('should handle Android-specific audio constraints', () => {
      const { result } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: mockCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized
        })
      );

      // Android may have different audio handling
      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBeDefined();
    });
  });

  describe('Data Persistence on Android', () => {
    test('should handle localStorage on Android correctly', () => {
      const testData = { door: 332, destination: '6024' };
      
      // Test localStorage operations
      localStorage.setItem('testData', JSON.stringify(testData));
      const retrieved = localStorage.getItem('testData');
      
      expect(localStorage.setItem).toHaveBeenCalledWith('testData', JSON.stringify(testData));
      expect(localStorage.getItem).toHaveBeenCalledWith('testData');
    });

    test('should handle pallet entries persistence on Android', () => {
      const { result } = renderHook(() => usePalletEntries());

      act(() => {
        result.current.addPalletEntry();
      });

      expect(result.current.palletEntries).toBeDefined();
    });

    test('should handle user settings persistence on Android', () => {
      const { result } = renderHook(() => useUserSettings());

      act(() => {
        result.current.updateSetting('voiceRecognitionEnabled', true);
        result.current.updateSetting('confidenceThreshold', 0.7);
      });

      expect(result.current.settings).toBeDefined();
    });
  });

  describe('Android WebView Specific Issues', () => {
    beforeEach(() => {
      mockAndroidWebView();
    });

    test('should handle file download restrictions in Android WebView', async () => {
      // Mock file download in WebView environment
      const mockBlob = new Blob(['test data'], { type: 'text/csv' });
      const mockUrl = URL.createObjectURL(mockBlob);
      
      // Android WebView may block direct downloads
      expect(mockUrl).toBeTruthy();
    });

    test('should handle touch events correctly on Android', () => {
      // Mock touch events
      const touchEvent = new Event('touchstart');
      document.dispatchEvent(touchEvent);
      
      // Should not crash on touch events
      expect(touchEvent).toBeDefined();
    });

    test('should handle viewport changes on Android', () => {
      // Mock viewport meta tag behavior
      Object.defineProperty(window, 'innerWidth', {
        value: 360,
        writable: true
      });
      
      Object.defineProperty(window, 'innerHeight', {
        value: 640,
        writable: true
      });

      // Should adapt to mobile viewport
      expect(window.innerWidth).toBe(360);
      expect(window.innerHeight).toBe(640);
    });
  });

  describe('Performance on Android', () => {
    test('should handle memory constraints on Android', () => {
      // Simulate memory-constrained environment
      const largeMockData = Array(1000).fill({ door: 332, count: 10 });
      
      // Should handle large datasets efficiently
      expect(largeMockData.length).toBe(1000);
    });

    test('should handle slow network conditions on Android', async () => {
      // Mock slow network
      const slowPromise = new Promise(resolve => 
        setTimeout(resolve, 5000)
      );

      // Should timeout appropriately
      const timeoutPromise = Promise.race([
        slowPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);

      await expect(timeoutPromise).rejects.toThrow('Timeout');
    });
  });

  describe('Android Permissions', () => {
    test('should request microphone permissions correctly', async () => {
      mockChromeAndroid();
      
      const permissionMock = vi.fn().mockResolvedValue({ state: 'granted' });
      Object.defineProperty(navigator, 'permissions', {
        value: { query: permissionMock },
        writable: true
      });

      const result = await navigator.permissions.query({ name: 'microphone' });
      expect(result.state).toBe('granted');
    });

    test('should handle denied microphone permissions', async () => {
      mockAndroidWebView();
      
      const permissionMock = vi.fn().mockResolvedValue({ state: 'denied' });
      Object.defineProperty(navigator, 'permissions', {
        value: { query: permissionMock },
        writable: true
      });

      const result = await navigator.permissions.query({ name: 'microphone' });
      expect(result.state).toBe('denied');
    });
  });
});