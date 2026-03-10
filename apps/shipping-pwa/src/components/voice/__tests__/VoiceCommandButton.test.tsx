import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceCommandButton } from '../VoiceCommandButton';

// Mock navigator.userAgent for mobile detection tests
const mockUserAgent = (userAgent: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: userAgent,
  });
};

describe('VoiceCommandButton', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
    // Reset to default desktop user agent
    mockUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('🎤 Voice Command')).toBeInTheDocument();
    });

    it('renders custom labels', () => {
      render(
        <VoiceCommandButton
          isListening={false}
          onToggle={mockOnToggle}
          label="Custom Voice"
          stopLabel="Custom Stop"
        />
      );
      
      expect(screen.getByText('🎤 Custom Voice')).toBeInTheDocument();
    });

    it('shows listening state correctly', () => {
      render(<VoiceCommandButton isListening={true} onToggle={mockOnToggle} stopLabel="Stop Voice" />);
      
      expect(screen.getByText('Stop Voice')).toBeInTheDocument();
      expect(screen.getByRole('button')).toHaveClass('animate-pulse');
    });

    it('applies custom className', () => {
      render(
        <VoiceCommandButton
          isListening={false}
          onToggle={mockOnToggle}
          className="custom-class"
        />
      );
      
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const { rerender } = render(
        <VoiceCommandButton isListening={false} onToggle={mockOnToggle} />
      );
      
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Start voice recognition'
      );

      rerender(<VoiceCommandButton isListening={true} onToggle={mockOnToggle} />);
      
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Stop voice recognition'
      );
    });

    it('has proper button role and tabindex', () => {
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Mobile Detection', () => {
    it('applies mobile styles for iPhone', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[48px]', 'min-w-[120px]', 'touch-manipulation');
    });

    it('applies mobile styles for Android', () => {
      mockUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F)');
      
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[48px]', 'min-w-[120px]', 'touch-manipulation');
    });

    it('uses desktop styles for desktop browsers', () => {
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-[44px]');
      expect(button).not.toHaveClass('touch-manipulation');
    });
  });

  describe('User Interactions', () => {
    it('calls onToggle when clicked', () => {
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle on touch end for mobile devices', () => {
      mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      fireEvent.touchEnd(screen.getByRole('button'));
      
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('does not have touch handlers for desktop', () => {
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      const button = screen.getByRole('button');
      
      // Touch events should not trigger onToggle for desktop
      fireEvent.touchEnd(button);
      expect(mockOnToggle).not.toHaveBeenCalled();
    });

    it('prevents default behavior on click', () => {
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      const button = screen.getByRole('button');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
      
      fireEvent(button, clickEvent);
      
      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('shows correct icon for listening state', () => {
      const { rerender } = render(
        <VoiceCommandButton isListening={false} onToggle={mockOnToggle} />
      );
      
      // Should show Mic icon when not listening
      expect(screen.getByRole('button')).toContainHTML('Mic');

      rerender(<VoiceCommandButton isListening={true} onToggle={mockOnToggle} />);
      
      // Should show MicOff icon when listening
      expect(screen.getByRole('button')).toContainHTML('MicOff');
    });

    it('shows pulsing animation when listening', () => {
      render(<VoiceCommandButton isListening={true} onToggle={mockOnToggle} />);
      
      expect(screen.getByRole('button')).toHaveClass('animate-pulse');
    });

    it('shows correct color scheme for different states', () => {
      const { rerender } = render(
        <VoiceCommandButton isListening={false} onToggle={mockOnToggle} />
      );
      
      // Not listening - blue theme
      expect(screen.getByRole('button')).toHaveClass('border-blue-500');

      rerender(<VoiceCommandButton isListening={true} onToggle={mockOnToggle} />);
      
      // Listening - red theme
      expect(screen.getByRole('button')).toHaveClass('border-red-500');
    });
  });

  describe('Console Logging', () => {
    it('logs interaction details on click', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation();
      
      render(<VoiceCommandButton isListening={false} onToggle={mockOnToggle} />);
      
      fireEvent.click(screen.getByRole('button'));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'VoiceCommandButton clicked!',
        expect.objectContaining({
          isListening: false,
          isMobile: false,
          isIOS: false,
        })
      );
      
      consoleSpy.mockRestore();
    });
  });
});
