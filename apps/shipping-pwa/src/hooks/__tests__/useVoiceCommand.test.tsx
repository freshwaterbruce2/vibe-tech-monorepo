import { renderHook, act } from '@testing-library/react';
import { useVoiceCommand } from '../useVoiceCommand';
import { useSpeechRecognition } from '../useSpeechRecognition';
import { useUserSettings } from '../useUserSettings';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('../useSpeechRecognition');
vi.mock('../useUserSettings');
vi.mock('sonner');

const mockUseSpeechRecognition = useSpeechRecognition as jest.MockedFunction<typeof useSpeechRecognition>;
const mockUseUserSettings = useUserSettings as jest.MockedFunction<typeof useUserSettings>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useVoiceCommand', () => {
  const mockOnCommandRecognized = vi.fn();
  const mockStartListening = vi.fn();
  const mockStopListening = vi.fn();
  const mockResetTranscript = vi.fn();

  const defaultSpeechRecognitionReturn = {
    transcript: '',
    interimTranscript: '',
    isListening: false,
    startListening: mockStartListening,
    stopListening: mockStopListening,
    confidence: 0,
    isProcessing: false,
    isFinal: false,
    resetTranscript: mockResetTranscript,
    browserSupportsSpeechRecognition: true,
  };

  const defaultUserSettings = {
    settings: {
      interactionMode: 'tap' as const,
      enableActionButton: false,
      lastUsedDC: '6024' as const,
      lastUsedFreightType: '23/43' as const,
      autoExportOnShiftEnd: false,
      voiceRecognitionEnabled: true,
      voiceEngine: 'browser' as const,
      noiseSuppression: true,
      confidenceThreshold: 0.75,
      commandTimeout: 3000,
      useGrammar: true,
      autoStop: true,
      speakBackCommands: true,
      voiceVolume: 0.8,
      voiceAcceptPartialResults: false,
      voiceActivationMode: 'button' as const,
      voiceFeedback: false,
    },
    updateSetting: vi.fn(),
    updateLastUsedDC: vi.fn(),
    updateLastUsedFreightType: vi.fn(),
    updateVoiceEngine: vi.fn(),
    updateVoiceActivationMode: vi.fn(),
    resetSettings: vi.fn(),
  };

  const defaultCommandPatterns = [
    {
      regex: /add door/i,
      commandName: 'add door',
      feedback: 'Door added',
    },
    {
      regex: /door (\d+)/i,
      commandName: 'set door number',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSpeechRecognition.mockReturnValue(defaultSpeechRecognitionReturn);
    mockUseUserSettings.mockReturnValue(defaultUserSettings);

    // Mock speech synthesis
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: jest.fn(() => []),
      },
    });
  });

  describe('Initialization', () => {
    it('initializes with correct default values', () => {
      const { result } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      expect(result.current.recentCommand).toBeNull();
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.errorMessage).toBeNull();
    });

    it('shows error when speech recognition is not supported', () => {
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognitionReturn,
        browserSupportsSpeechRecognition: false,
      });

      renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      expect(mockToast.error).toHaveBeenCalledWith(
        'Speech recognition is not supported',
        expect.objectContaining({
          description: 'Please try using a supported browser like Chrome',
        })
      );
    });
  });

  describe('Command Recognition', () => {
    it('recognizes simple commands', () => {
      const { result } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      // Simulate speech recognition result
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognitionReturn,
        transcript: 'add door',
        isFinal: true,
        confidence: 0.9,
      });

      // Re-render to trigger effect
      const { rerender } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      rerender();

      expect(mockOnCommandRecognized).toHaveBeenCalledWith('add door', []);
      expect(mockToast.success).toHaveBeenCalledWith(
        'add door via voice command! (90% confidence)',
        expect.any(Object)
      );
    });

    it('recognizes commands with parameters', () => {
      const { result } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      // Simulate speech recognition result with parameters
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognitionReturn,
        transcript: 'door 342',
        isFinal: true,
        confidence: 0.85,
      });

      const { rerender } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      rerender();

      expect(mockOnCommandRecognized).toHaveBeenCalledWith('set door number', ['342']);
    });

    it('ignores low confidence results', () => {
      renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      // Simulate low confidence result
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognitionReturn,
        transcript: 'add door',
        isFinal: true,
        confidence: 0.3, // Below typical threshold
      });

      const { rerender } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      rerender();

      expect(mockOnCommandRecognized).not.toHaveBeenCalled();
    });

    it('prevents duplicate command processing', () => {
      const { result } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      // Simulate same transcript multiple times
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognitionReturn,
        transcript: 'add door',
        isFinal: true,
        confidence: 0.9,
      });

      const { rerender } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      rerender();
      rerender(); // Second render with same transcript

      expect(mockOnCommandRecognized).toHaveBeenCalledTimes(1);
    });
  });

  describe('Speech Synthesis', () => {
    it('speaks back commands when enabled', () => {
      const mockSpeak = vi.fn();
      window.speechSynthesis.speak = mockSpeak;

      renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
          speakBackText: 'Command executed',
        })
      );

      // Simulate command recognition
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognitionReturn,
        transcript: 'add door',
        isFinal: true,
        confidence: 0.9,
      });

      const { rerender } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
          speakBackText: 'Command executed',
        })
      );

      rerender();

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Door added', // Uses pattern feedback over speakBackText
        })
      );
    });

    it('does not speak when disabled in settings', () => {
      const mockSpeak = vi.fn();
      window.speechSynthesis.speak = mockSpeak;

      mockUseUserSettings.mockReturnValue({
        ...defaultUserSettings,
        settings: {
          ...defaultUserSettings.settings,
          speakBackCommands: false,
        },
      });

      renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
          speakBackText: 'Command executed',
        })
      );

      // Simulate command recognition
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognitionReturn,
        transcript: 'add door',
        isFinal: true,
        confidence: 0.9,
      });

      const { rerender } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
          speakBackText: 'Command executed',
        })
      );

      rerender();

      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles command execution errors gracefully', () => {
      const errorOnCommandRecognized = jest.fn(() => {
        throw new Error('Command execution failed');
      });

      renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: errorOnCommandRecognized,
        })
      );

      // Simulate command recognition
      mockUseSpeechRecognition.mockReturnValue({
        ...defaultSpeechRecognitionReturn,
        transcript: 'add door',
        isFinal: true,
        confidence: 0.9,
      });

      const { rerender } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: errorOnCommandRecognized,
        })
      );

      rerender();

      expect(mockToast.error).toHaveBeenCalledWith(
        'Error executing voice command',
        expect.objectContaining({
          description: 'Please try again',
        })
      );
    });
  });

  describe('Confidence Color Helper', () => {
    it('returns correct color for different confidence levels', () => {
      const { result } = renderHook(() =>
        useVoiceCommand({
          commandPatterns: defaultCommandPatterns,
          onCommandRecognized: mockOnCommandRecognized,
        })
      );

      // getConfidenceColor takes no parameters, uses internal commandConfidence state
      expect(result.current.getConfidenceColor()).toBe('text-red-500'); // Default low confidence
    });
  });
});
