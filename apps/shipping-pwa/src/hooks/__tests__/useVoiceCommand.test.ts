import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceCommand } from '../useVoiceCommand';

describe('useVoiceCommand', () => {
  const mockHandlers = {
    onDoorAdded: vi.fn(),
    onDoorRemoved: vi.fn(),
    onExportTriggered: vi.fn(),
    onPalletUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      expect(result.current.isListening).toBe(false);
      expect(result.current.lastCommand).toBe('');
      expect(result.current.confidence).toBe(0);
      expect(result.current.isProcessing).toBe(false);
    });

    it('accepts confidence threshold option', () => {
      const { result } = renderHook(() =>
        useVoiceCommand(mockHandlers, { confidenceThreshold: 0.8 })
      );

      // Should initialize correctly with custom threshold
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('Voice Command Processing', () => {
    it('processes single door command correctly', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('door 332', 0.9);
      });

      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(332);
      expect(result.current.lastCommand).toBe('door 332');
      expect(result.current.confidence).toBe(0.9);
    });

    it('processes door range command correctly', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('doors 332 to 336', 0.85);
      });

      expect(mockHandlers.onDoorAdded).toHaveBeenCalledTimes(5);
      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(332);
      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(333);
      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(334);
      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(335);
      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(336);
    });

    it('processes delete door command correctly', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('delete door 332', 0.8);
      });

      expect(mockHandlers.onDoorRemoved).toHaveBeenCalledWith(332);
    });

    it('processes export command correctly', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('export data', 0.9);
      });

      expect(mockHandlers.onExportTriggered).toHaveBeenCalled();
    });

    it('processes pallet update commands correctly', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('door 332 pallets 15', 0.8);
      });

      expect(mockHandlers.onPalletUpdate).toHaveBeenCalledWith(332, 15);
    });

    it('ignores commands below confidence threshold', () => {
      const { result } = renderHook(() =>
        useVoiceCommand(mockHandlers, { confidenceThreshold: 0.8 })
      );

      act(() => {
        result.current.processCommand('door 332', 0.7);
      });

      expect(mockHandlers.onDoorAdded).not.toHaveBeenCalled();
      expect(result.current.lastCommand).toBe('');
    });
  });

  describe('Command Patterns', () => {
    it('recognizes various door number formats', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      const variations = [
        'door 332',
        'door three three two',
        'add door 332',
        'create door 332',
      ];

      variations.forEach((command, _index) => {
        act(() => {
          result.current.processCommand(command, 0.9);
        });
      });

      // Should recognize at least the numeric format
      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(332);
    });

    it('handles different delete command variations', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      const deleteVariations = [
        'delete door 332',
        'remove door 332',
        'cancel door 332',
      ];

      deleteVariations.forEach((command) => {
        act(() => {
          result.current.processCommand(command, 0.9);
        });
      });

      expect(mockHandlers.onDoorRemoved).toHaveBeenCalledWith(332);
    });

    it('handles different export command variations', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      const exportVariations = [
        'export data',
        'export csv',
        'download data',
      ];

      exportVariations.forEach((command) => {
        act(() => {
          result.current.processCommand(command, 0.9);
        });
      });

      expect(mockHandlers.onExportTriggered).toHaveBeenCalledTimes(3);
    });
  });

  describe('Door Number Validation', () => {
    it('validates door numbers within allowed range', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      // Valid door numbers (332-454)
      act(() => {
        result.current.processCommand('door 332', 0.9);
      });
      act(() => {
        result.current.processCommand('door 454', 0.9);
      });

      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(332);
      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(454);
    });

    it('rejects door numbers outside allowed range', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      // Invalid door numbers
      act(() => {
        result.current.processCommand('door 300', 0.9);
      });
      act(() => {
        result.current.processCommand('door 500', 0.9);
      });

      expect(mockHandlers.onDoorAdded).not.toHaveBeenCalledWith(300);
      expect(mockHandlers.onDoorAdded).not.toHaveBeenCalledWith(500);
    });

    it('handles invalid door range commands', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('doors 330 to 340', 0.9);
      });

      // Should only add doors within valid range (332-340)
      expect(mockHandlers.onDoorAdded).not.toHaveBeenCalledWith(330);
      expect(mockHandlers.onDoorAdded).not.toHaveBeenCalledWith(331);
      expect(mockHandlers.onDoorAdded).toHaveBeenCalledWith(332);
    });
  });

  describe('Error Handling', () => {
    it('handles malformed commands gracefully', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      const malformedCommands = [
        'door',
        'door abc',
        'delete',
        'export',
        'random text',
        '',
      ];

      malformedCommands.forEach((command) => {
        act(() => {
          result.current.processCommand(command, 0.9);
        });
      });

      // Should not call any handlers for malformed commands
      expect(mockHandlers.onDoorAdded).not.toHaveBeenCalled();
      expect(mockHandlers.onDoorRemoved).not.toHaveBeenCalled();
      expect(mockHandlers.onExportTriggered).not.toHaveBeenCalled();
    });

    it('handles handler errors gracefully', () => {
      const errorHandlers = {
        ...mockHandlers,
        onDoorAdded: vi.fn().mockImplementation(() => {
          throw new Error('Handler error');
        }),
      };

      const { result } = renderHook(() => useVoiceCommand(errorHandlers));

      expect(() => {
        act(() => {
          result.current.processCommand('door 332', 0.9);
        });
      }).not.toThrow();
    });

    it('validates pallet counts', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      // Valid pallet count
      act(() => {
        result.current.processCommand('door 332 pallets 15', 0.9);
      });

      expect(mockHandlers.onPalletUpdate).toHaveBeenCalledWith(332, 15);

      // Invalid pallet count (negative)
      act(() => {
        result.current.processCommand('door 332 pallets -5', 0.9);
      });

      expect(mockHandlers.onPalletUpdate).not.toHaveBeenCalledWith(332, -5);
    });
  });

  describe('State Management', () => {
    it('updates processing state during command execution', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('door 332', 0.9);
      });

      // Processing should be false after command completion
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.lastCommand).toBe('door 332');
    });

    it('maintains command history', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('door 332', 0.9);
      });

      act(() => {
        result.current.processCommand('door 334', 0.8);
      });

      // Should track the last command
      expect(result.current.lastCommand).toBe('door 334');
      expect(result.current.confidence).toBe(0.8);
    });

    it('resets state appropriately', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.processCommand('door 332', 0.9);
      });

      act(() => {
        result.current.resetState();
      });

      expect(result.current.lastCommand).toBe('');
      expect(result.current.confidence).toBe(0);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('Integration with Speech Recognition', () => {
    it('provides speech recognition controls', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      expect(typeof result.current.startListening).toBe('function');
      expect(typeof result.current.stopListening).toBe('function');
    });

    it('handles speech recognition state changes', () => {
      const { result } = renderHook(() => useVoiceCommand(mockHandlers));

      act(() => {
        result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);

      act(() => {
        result.current.stopListening();
      });

      expect(result.current.isListening).toBe(false);
    });
  });
});